'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getSupabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'


export default function Home() {
  const supabase = getSupabase()
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.push('/app/dashboard')
      }
    }
    checkAuth()
  }, [router])

  return (
    <div className="min-h-screen bg-zinc-50">

      {/* ── Header nav ── */}
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/icon-192x192.png"
              alt="MedicalRouter logo"
              width={36}
              height={36}
              className="rounded-lg"
              priority
            />
            <span className="text-xl font-semibold tracking-tight">MedicalRouter</span>
          </Link>
          <div className="flex items-center gap-3">
            {/* Prominent pilot link — solid blue, visible at a glance */}
            <Link href="/pilot">
              <Button className="bg-blue-700 text-white hover:bg-blue-800">
                Start a Pilot — $500
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline">Sign in</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <main className="mx-auto max-w-5xl px-4 py-24 sm:px-6">
        <div className="mb-16 text-center">
          <h1 className="mb-4 text-5xl font-semibold tracking-tight">
            Stop leaving money on the table
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-xl text-muted-foreground">
            Tell me what money I&apos;m missing and exactly what to do next, with the paperwork ready.
            Analyze 835 ERAs and EOB PDFs to find underpayments, denials, and billing errors in minutes.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            {/* Primary CTA — pilot offer */}
            <Link href="/pilot">
              <Button size="lg" className="h-12 bg-blue-700 px-8 text-white hover:bg-blue-800">
                Start a 30-Day Pilot — $500
              </Button>
            </Link>
            {/* Secondary CTA — sign in */}
            <Link href="/login">
              <Button size="lg" variant="outline" className="h-12 px-8">
                Sign in
              </Button>
            </Link>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Already a customer?{' '}
            <Link href="/login" className="underline hover:text-zinc-900">
              Sign in to your dashboard →
            </Link>
          </p>
        </div>

        {/* ── How it works cards ── */}
        <div className="grid gap-6 sm:grid-cols-4">
          <Card className="p-6">
            <div className="mb-2 text-lg font-medium">1. Upload</div>
            <p className="text-sm text-muted-foreground">
              Upload 835 ERA files or EOB PDFs. We handle the rest.
            </p>
          </Card>

          <Card className="p-6">
            <div className="mb-2 text-lg font-medium">2. Analyze</div>
            <p className="text-sm text-muted-foreground">
              Deterministic engine finds underpayments, denials, and contract issues.
            </p>
          </Card>

          <Card className="p-6">
            <div className="mb-2 text-lg font-medium">3. Review</div>
            <p className="text-sm text-muted-foreground">
              Ranked findings with exact dollar amounts, math traces, and evidence.
            </p>
          </Card>

          <Card className="p-6">
            <div className="mb-2 text-lg font-medium">4. Recover</div>
            <p className="text-sm text-muted-foreground">
              Download appeal packets ready to send to payers.
            </p>
          </Card>
        </div>

        {/* ── Pilot callout banner ── */}
        <div className="mt-12 rounded-xl border border-blue-200 bg-blue-50 px-6 py-8 text-center sm:px-10">
          <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-blue-700">
            30-Day Pilot Offer
          </p>
          <h2 className="mb-3 text-2xl font-semibold text-zinc-900">
            $500 flat fee. 25% success fee on recovered dollars only.
          </h2>
          <p className="mx-auto mb-6 max-w-xl text-sm leading-relaxed text-zinc-600">
            Independent specialty practices: upload your ERA or EOB files, get a ranked list of
            underpayments and appealable denials, and receive ready-to-send appeal packets — all
            within 30 days. No long-term contract.
          </p>
          <Link href="/pilot">
            <Button size="lg" className="bg-blue-700 text-white hover:bg-blue-800">
              See the full pilot offer →
            </Button>
          </Link>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t bg-white py-8">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
            <p>© {new Date().getFullYear()} MedicalRouter. All rights reserved.</p>
            <div className="flex flex-wrap items-center justify-center gap-5 text-xs">
              <Link href="/pilot" className="font-medium text-blue-700 hover:text-blue-900 underline">
                30-Day Pilot — $500
              </Link>
              <Link href="/faq" className="hover:text-zinc-900">FAQ</Link>
              <Link href="/terms" className="hover:text-zinc-900">Terms of Use</Link>
              <Link href="/privacy" className="hover:text-zinc-900">Privacy Policy</Link>
              <Link href="/service-agreement" className="hover:text-zinc-900">Service Agreement</Link>
              <Link href="/login" className="hover:text-zinc-900">Sign in</Link>
              <a href="mailto:chris@medicalrouter.com" className="hover:text-zinc-900">Contact</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
