'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import type { User } from '@supabase/supabase-js'

// Routes that are exempt from the agreement gate (the sign page itself)
const AGREEMENT_EXEMPT_PATHS = ['/app/sign-agreement']

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = getSupabase()
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      setUser(user)

      // ── Agreement gate ──────────────────────────────────────────────────────
      // Skip the check if we are already on the sign-agreement page
      const isExempt = AGREEMENT_EXEMPT_PATHS.some(p => pathname.startsWith(p))
      if (!isExempt) {
        try {
          const res = await fetch('/api/agreements/check')
          const data = await res.json()
          if (!data.signed) {
            router.push('/app/sign-agreement')
            return
          }
        } catch {
          // If the check fails (network error, etc.) let the user through
          // rather than blocking them indefinitely
          console.warn('[layout] Agreement check failed — allowing access')
        }
      }
      // ───────────────────────────────────────────────────────────────────────

      setLoading(false)
    }

    checkUser()
  }, [router, pathname])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!user) return null

  // Hide the main nav on the sign-agreement page (clean, focused experience)
  const isSignPage = AGREEMENT_EXEMPT_PATHS.some(p => pathname.startsWith(p))
  if (isSignPage) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <nav className="border-b bg-white px-4 py-4 sm:px-6">
          <div className="mx-auto flex max-w-3xl items-center justify-between">
            <span className="text-xl font-semibold tracking-tight text-zinc-900">MedicalRouter</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>Sign out</Button>
          </div>
        </nav>
        <main>{children}</main>
      </div>
    )
  }

  const navItems = [
    { href: '/app/dashboard', label: 'Dashboard' },
    { href: '/app/upload', label: 'Uploads' },
    { href: '/app/results', label: 'Results' },
    { href: '/app/admin', label: 'Admin' },
  ]

  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-8">
            <Link href="/app/dashboard" className="text-xl font-semibold tracking-tight">
              MedicalRouter
            </Link>
            <div className="hidden gap-6 sm:flex">
              {navItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm ${
                    pathname === item.href
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-muted-foreground sm:block">{user.email}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Sign out
            </Button>
          </div>
        </div>
      </nav>

      <main>{children}</main>
    </div>
  )
}
