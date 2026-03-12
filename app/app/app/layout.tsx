'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getSupabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import type { User } from '@supabase/supabase-js'

// Routes that are exempt from the agreement gate
const AGREEMENT_EXEMPT_PATHS = ['/app/sign-agreement']

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = getSupabase()
  const router = useRouter()
  const pathname = usePathname()

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Cache the signed state for the lifetime of this layout mount.
  // Once we know the user has signed (or is on the exempt page), we never
  // re-run the gate — this prevents the redirect loop after submit.
  const signedRef = useRef<boolean | null>(null)
  const initDoneRef = useRef(false)

  useEffect(() => {
    // Only run the full init once — subsequent pathname changes must NOT
    // re-trigger the gate, because the signed state is already known.
    if (initDoneRef.current) return
    initDoneRef.current = true

    const init = async () => {
      // 1. Auth check
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        router.push('/login')
        return
      }
      setUser(session.user)

      // 2. Agreement gate — skip if on the sign page itself
      const isExempt = AGREEMENT_EXEMPT_PATHS.some(p => pathname.startsWith(p))
      if (isExempt) {
        // Already on the sign page — mark as unknown, show the page
        setLoading(false)
        return
      }

      // 3. Check if already signed — send Bearer token so the API route can auth
      try {
        const res = await fetch('/api/agreements/check', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })
        const data = await res.json()
        signedRef.current = !!data.signed

        if (!data.signed) {
          router.push('/app/sign-agreement')
          // Keep loading=true so the dashboard never flashes before redirect lands
          return
        }
      } catch {
        // If the check fails (network error), let the user through rather than
        // blocking them indefinitely
        console.warn('[layout] Agreement check failed — allowing access')
        signedRef.current = true
      }

      setLoading(false)
    }

    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // ← empty deps: run once on mount only

  // After init, if the user navigates back from sign-agreement to dashboard
  // (e.g. after a successful submit), just show the page — don't re-gate.
  useEffect(() => {
    if (!initDoneRef.current) return
    if (loading) return
    // If we're on an exempt path after init, nothing to do
    const isExempt = AGREEMENT_EXEMPT_PATHS.some(p => pathname.startsWith(p))
    if (isExempt) return
    // If signed state is cached as true, just render — no redirect needed
  }, [pathname, loading])

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

  // Clean layout for the sign-agreement page
  const isSignPage = AGREEMENT_EXEMPT_PATHS.some(p => pathname.startsWith(p))
  if (isSignPage) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <nav className="border-b bg-white px-4 py-4 sm:px-6">
          <div className="mx-auto flex max-w-3xl items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Image src="/icon-192x192.png" alt="MedicalRouter" width={36} height={36} className="rounded-lg" />
              <span className="text-xl font-semibold tracking-tight text-zinc-900">MedicalRouter</span>
            </div>
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
            <Link href="/app/dashboard" className="flex items-center gap-2.5">
              <Image src="/icon-192x192.png" alt="MedicalRouter" width={36} height={36} className="rounded-lg" />
              <span className="text-xl font-semibold tracking-tight">MedicalRouter</span>
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
