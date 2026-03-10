import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

/**
 * Supabase magic-link callback.
 *
 * After exchanging the code for a session we check whether the user already
 * belongs to an account.  If not (first login), we:
 *   1. Create a new `accounts` row named after the user's email domain.
 *   2. Insert an `account_users` row linking the user as 'admin'.
 *
 * This keeps onboarding zero-friction: sign in → land on dashboard.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', requestUrl.origin))
  }

  try {
    const supabase = createServiceClient()

    const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

    if (sessionError || !sessionData?.user) {
      console.error('[auth/callback] exchangeCodeForSession error:', sessionError?.message)
      return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin))
    }

    const user = sessionData.user

    // ── Onboarding: ensure account membership ──────────────────────────────
    const { data: existing } = await supabase
      .from('account_users')
      .select('account_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (!existing) {
      // First login — create a new account for this user
      const emailDomain = user.email?.split('@')[1] || 'practice'
      const practiceName = emailDomain
        .replace(/\.(com|net|org|io|health|care|clinic|med)$/, '')
        .replace(/[^a-zA-Z0-9]/g, ' ')
        .replace(/\b\w/g, (c: string) => c.toUpperCase())
        .trim() || 'My Practice'

      const { data: newAccount, error: accountError } = await supabase
        .from('accounts')
        .insert({ name: practiceName })
        .select('id')
        .single()

      if (accountError || !newAccount) {
        console.error('[auth/callback] create account error:', accountError?.message)
        return NextResponse.redirect(new URL('/app/dashboard', requestUrl.origin))
      }

      const { error: memberError } = await supabase
        .from('account_users')
        .insert({
          account_id: newAccount.id,
          user_id: user.id,
          role: 'admin',
        })

      if (memberError) {
        console.error('[auth/callback] create account_users error:', memberError.message)
      }
    }

    return NextResponse.redirect(new URL('/app/dashboard', requestUrl.origin))
  } catch (err) {
    console.error('[auth/callback] unexpected error:', err instanceof Error ? err.message : 'unknown')
    return NextResponse.redirect(new URL('/login?error=server_error', requestUrl.origin))
  }
}
