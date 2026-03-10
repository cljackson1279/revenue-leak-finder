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
        // ── Server-side sign-up (auto-confirms, no email required) ────────
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })

        const result = await res.json()

        if (!res.ok) {
          // If the account already exists, switch to sign-in mode
          if (res.status === 409) {
            setMode('signin')
            setMessage({
              type: 'error',
              text: 'An account with this email already exists. Please sign in below.',
            })
            setLoading(false)
            return
          }
          throw new Error(result.error || 'Failed to create account')
        }

        // Account created and confirmed — now sign in to get a session
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) throw signInError
        if (signInData.session) {
          router.replace('/app/dashboard')
          return
        }

      } else {
        // ── Standard sign-in ───────────────────────────────────────────────
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })

        if (error) {
          if (
            error.message.toLowerCase().includes('invalid login credentials') ||
            error.message.toLowerCase().includes('invalid credentials')
          ) {
            throw new Error(
              "Incorrect email or password. If you don't have an account yet, click \"Create account\" below."
            )
          }
          throw error
        }

        if (data.session) {
          router.replace('/app/dashboard')
          return
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
