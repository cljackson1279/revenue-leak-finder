'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <h1 className="text-xl font-semibold tracking-tight">Revenue Recovery Engine</h1>
          <div className="flex gap-4">
            <Link href="/pilot">
              <Button variant="ghost">Start a Pilot</Button>
            </Link>
            <Link href="/login">
              <Button variant="outline">Sign in</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-4 py-24 sm:px-6">
        <div className="mb-16 text-center">
          <h1 className="mb-4 text-5xl font-semibold tracking-tight">
            Stop leaving money on the table
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-xl text-muted-foreground">
            Tell me what money I&apos;m missing and exactly what to do next, with the paperwork ready.
            Analyze 835 ERAs and EOB PDFs to find underpayments, denials, and billing errors in minutes.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/login">
              <Button size="lg" className="h-12 px-8">
                Get started
              </Button>
            </Link>
          </div>
        </div>

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
      </main>

      <footer className="border-t bg-white py-8">
        <div className="mx-auto max-w-5xl px-4 text-center text-sm text-muted-foreground sm:px-6">
          Revenue Recovery Engine &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  )
}
