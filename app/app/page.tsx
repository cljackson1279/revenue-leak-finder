import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <h1 className="text-xl font-semibold tracking-tight">Revenue Leak Finder</h1>
          <div className="flex gap-4">
            <Link href="/login">
              <Button variant="outline">Sign in</Button>
            </Link>
            <Link href="/app/dashboard">
              <Button>Go to app</Button>
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
            Automatically identify revenue leaks in your medical practice by analyzing EOBs and
            835 ERAs. Find underpayments, denials, and billing errors in minutes.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/login">
              <Button size="lg" className="h-12 px-8">
                Get started
              </Button>
            </Link>
            <Link href="/app/dashboard">
              <Button size="lg" variant="outline" className="h-12 px-8">
                View demo
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          <Card className="p-6">
            <div className="mb-2 text-lg font-medium">1. Upload files</div>
            <p className="text-base text-muted-foreground">
              Drag and drop your EOB PDFs or 835 ERA files. We handle the rest.
            </p>
          </Card>

          <Card className="p-6">
            <div className="mb-2 text-lg font-medium">2. Automated analysis</div>
            <p className="text-base text-muted-foreground">
              Our engine detects underpayments, denials, and contract discrepancies.
            </p>
          </Card>

          <Card className="p-6">
            <div className="mb-2 text-lg font-medium">3. Prioritized actions</div>
            <p className="text-base text-muted-foreground">
              Get a ranked list of opportunities to recover lost revenue quickly.
            </p>
          </Card>
        </div>
      </main>

      <footer className="border-t bg-white py-8">
        <div className="mx-auto max-w-5xl px-4 text-center text-sm text-muted-foreground sm:px-6">
          Revenue Leak Finder &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  )
}
