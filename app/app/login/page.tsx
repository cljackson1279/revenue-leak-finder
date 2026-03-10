'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

type Mode = 'signin' | 'signup'

export default function LoginPage() {
  const supabase = getSupabase()
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // If already logged in, go straight to dashboard
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        router.replace('/app/dashboard')
      } else {
        setChecking(false)
      }
    }
    checkAuth()
  }, [router, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (mode === 'signup') {
        // ── Create new account ──────────────────────────────────────────────
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // Skip email confirmation so the user can log in immediately
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })

        if (error) throw error

        if (data.session) {
          // Email confirmation is disabled — user is immediately signed in
          await ensureAccount(data.session.user.id, email)
          router.replace('/app/dashboard')
        } else {
          // Email confirmation is enabled — tell the user to check their inbox
          setMessage({
            type: 'success',
            text: 'Account created! Check your email to confirm your address, then sign in.',
          })
          setMode('signin')
        }
      } else {
        // ── Sign in with existing credentials ──────────────────────────────
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          if (error.message.toLowerCase().includes('invalid login credentials') ||
              error.message.toLowerCase().includes('invalid credentials')) {
            throw new Error('Incorrect email or password. If you don\'t have an account yet, click "Create account" below.')
          }
          throw error
        }

        if (data.session) {
          await ensureAccount(data.session.user.id, email)
          router.replace('/app/dashboard')
        }
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  /**
   * Ensure the user has an account row and account_users membership.
   * Safe to call on every login — does nothing if already set up.
   */
  const ensureAccount = async (userId: string, userEmail: string) => {
    try {
      const { data: existing } = await supabase
        .from('account_users')
        .select('account_id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle()

      if (!existing) {
        // First login — create account
        const emailDomain = userEmail?.split('@')[1] || 'practice'
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
    } catch {
      // Non-fatal — user can still access the app, account will be created on next request
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <Card className="w-full max-w-md p-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Revenue Recovery Engine</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === 'signin' ? 'Sign in to your account' : 'Create your account'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@practice.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder={mode === 'signup' ? 'Choose a strong password' : 'Enter your password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              minLength={mode === 'signup' ? 8 : undefined}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
            {mode === 'signup' && (
              <p className="text-xs text-muted-foreground">Must be at least 8 characters.</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? mode === 'signin' ? 'Signing in…' : 'Creating account…'
              : mode === 'signin' ? 'Sign in' : 'Create account'}
          </Button>
        </form>

        {/* Toggle mode */}
        <div className="mt-4 text-center text-sm text-muted-foreground">
          {mode === 'signin' ? (
            <>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('signup'); setMessage(null) }}
                className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
              >
                Create account
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('signin'); setMessage(null) }}
                className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
              >
                Sign in
              </button>
            </>
          )}
        </div>

        {/* Status message */}
        {message && (
          <Alert className="mt-4" variant={message.type === 'error' ? 'destructive' : 'default'}>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}
      </Card>
    </div>
  )
}
