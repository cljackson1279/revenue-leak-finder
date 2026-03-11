import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Pilot Started — Revenue Recovery Engine',
  description: 'Your 30-Day Revenue Recovery Pilot has been confirmed.',
}

export default function PilotSuccessPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">

      {/* Nav */}
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="text-base font-semibold tracking-tight text-zinc-900">
            Revenue Recovery Engine
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="flex flex-1 items-center justify-center px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-lg text-center">
          <div className="mb-6 flex justify-center">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <h1 className="mb-3 text-3xl font-semibold tracking-tight text-zinc-900">
            Your pilot is confirmed
          </h1>
          <p className="mb-2 text-lg text-zinc-600">
            Payment received. Welcome to the 30-Day Revenue Recovery Pilot.
          </p>
          <p className="mb-8 text-sm leading-relaxed text-zinc-500">
            You will receive a receipt from Stripe at the email you provided. We will
            follow up within one business day to get your 835 ERA or EOB files and begin
            the analysis. If you have questions in the meantime, email us at{' '}
            <a
              href="mailto:hello@revenuerecoveryengine.com"
              className="text-blue-700 underline hover:text-blue-900"
            >
              hello@revenuerecoveryengine.com
            </a>
            .
          </p>

          {/* What happens next */}
          <div className="mb-8 rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-left">
            <p className="mb-4 text-sm font-semibold text-zinc-900">What happens next</p>
            <ol className="space-y-3">
              {[
                'We will email you within one business day to collect your 835 ERA or EOB files.',
                'The engine will analyze your files and identify underpayments and appealable denials.',
                'You will receive a findings report with net recoverable amounts and appeal packets.',
                'You track appeal status in the dashboard. The 25% success fee applies only to amounts actually recovered.',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-zinc-600">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-700 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/login">
              <Button className="w-full bg-blue-700 text-white hover:bg-blue-800 sm:w-auto">
                Sign in to the dashboard
              </Button>
            </Link>
            <Link href="/pilot">
              <Button variant="outline" className="w-full sm:w-auto">
                Back to pilot page
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white px-4 py-6 sm:px-6">
        <p className="text-center text-xs text-zinc-400">
          © {new Date().getFullYear()} Revenue Recovery Engine. All rights reserved.
        </p>
      </footer>

    </div>
  )
}
