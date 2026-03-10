import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

/**
 * Supabase auth callback.
 *
 * Handles two cases:
 *   1. Magic-link / email confirmation — exchanges the `code` param for a session.
 *   2. Password sign-up email confirmation — same flow.
 *
 * After exchanging the code we ensure the user has an account row and
 * account_users membership (zero-friction onboarding).
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // Supabase sometimes redirects here with an error param
  if (error) {
    console.error('[auth/callback] error from Supabase:', error, errorDescription)
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error)}`, requestUrl.origin)
    )
  }

  if (!code) {
    // No code — this can happen if the user navigates here directly
    return NextResponse.redirect(new URL('/login', requestUrl.origin))
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
      } else {
        const { error: memberError } = await supabase
          .from('account_users')
          .insert({ account_id: newAccount.id, user_id: user.id, role: 'admin' })

        if (memberError) {
          console.error('[auth/callback] create account_users error:', memberError.message)
        }
      }
    }

    return NextResponse.redirect(new URL('/app/dashboard', requestUrl.origin))
  } catch (err) {
    console.error('[auth/callback] unexpected error:', err instanceof Error ? err.message : 'unknown')
    return NextResponse.redirect(new URL('/login?error=server_error', requestUrl.origin))
  }
}
