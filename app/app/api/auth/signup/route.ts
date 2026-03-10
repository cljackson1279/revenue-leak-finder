import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

/**
 * POST /api/auth/signup
 *
 * Server-side sign-up that uses the service role key to:
 *   1. Create the user (or update an existing unconfirmed user)
 *   2. Auto-confirm the email immediately — no confirmation email needed
 *   3. Ensure an account + account_users row exists
 *
 * Returns { success: true } on success so the client can then call
 * supabase.auth.signInWithPassword() to get a real session.
 *
 * The service role key never leaves the server.
 */
export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // ── Step 1: Create or update the user ─────────────────────────────────
    // admin.createUser with email_confirm: true skips the confirmation email
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,   // auto-confirm — no email required
    })

    if (createError) {
      // If the user already exists, update their password instead
      if (createError.message.toLowerCase().includes('already registered') ||
          createError.message.toLowerCase().includes('already been registered') ||
          createError.message.toLowerCase().includes('duplicate')) {

        // Find the existing user
        const { data: listData } = await supabase.auth.admin.listUsers()
        const existingUser = listData?.users?.find(u => u.email === email)

        if (!existingUser) {
          return NextResponse.json(
            { error: 'An account with this email already exists. Please sign in instead.' },
            { status: 409 }
          )
        }

        // Update the password on the existing user
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          existingUser.id,
          { password, email_confirm: true }
        )

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 })
        }

        // Ensure account membership
        await ensureAccount(supabase, existingUser.id, email)

        return NextResponse.json({ success: true, existed: true })
      }

      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    // ── Step 2: Ensure account membership ─────────────────────────────────
    if (userData?.user) {
      await ensureAccount(supabase, userData.user.id, email)
    }

    return NextResponse.json({ success: true, existed: false })
  } catch (err) {
    console.error('[api/auth/signup] error:', err instanceof Error ? err.message : 'unknown')
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 })
  }
}

async function ensureAccount(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  email: string
) {
  try {
    const { data: existing } = await supabase
      .from('account_users')
      .select('account_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle()

    if (!existing) {
      const emailDomain = email?.split('@')[1] || 'practice'
      const practiceName = emailDomain
        .replace(/\.(com|net|org|io|health|care|clinic|med)$/, '')
        .replace(/[^a-zA-Z0-9]/g, ' ')
        .replace(/\b\w/g, (c: string) => c.toUpperCase())
        .trim() || 'My Practice'

      const { data: newAccount } = await supabase
        .from('accounts')
        .insert({ name: practiceName })
        .select('id')
        .single()

      if (newAccount) {
        await supabase
          .from('account_users')
          .insert({ account_id: newAccount.id, user_id: userId, role: 'admin' })
      }
    }
  } catch (err) {
    console.error('[ensureAccount] error:', err instanceof Error ? err.message : 'unknown')
  }
}
