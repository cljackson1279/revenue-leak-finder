'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ─── FAQ data ─────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: 'What does the $500 cover?',
    a: 'The $500 onboarding fee covers pilot setup, analysis of your 835 ERA and EOB files, identification of underpayments and appealable denials, generation of ready-to-send appeal packets, and access to the recovery tracking workflow for 30 days. There are no hidden fees and no per-file charges during the pilot.',
  },
  {
    q: 'When is the 25% success fee charged?',
    a: 'The 25% success fee applies only to payer dollars that are actually recovered — meaning the payer issues a corrected payment or upholds an appeal — as a direct result of opportunities identified through this pilot. It is not charged on the $500 onboarding fee, on patient responsibility amounts, or on any revenue that was not identified through the pilot. The success fee is invoiced manually after recovery is confirmed.',
  },
  {
    q: 'What does "net recovered from payer" mean?',
    a: '"Net recovered from payer" means the additional amount a payer pays after you file an appeal or request a corrected payment, minus any amounts that were already owed by the patient. It does not include patient co-pays, deductibles, or coinsurance. The formula the engine uses is: Allowed Amount − Payer Paid − Patient Responsibility.',
  },
  {
    q: 'Do you handle denials too, or only underpayments?',
    a: 'Both. The engine identifies two types of opportunities: underpayments (where the payer paid less than the contracted allowed amount) and appealable denials (where a claim was denied with a reason code that is typically reversible, such as timely filing, bundling errors, or missing information). Each finding includes the CARC/RARC codes, the math, and a ready-to-send appeal letter.',
  },
  {
    q: 'Is there a long-term contract?',
    a: 'No. The pilot is a 30-day engagement with no long-term commitment. If you want to continue after the pilot, we can discuss ongoing terms. You are never locked in.',
  },
  {
    q: 'Who is this best suited for?',
    a: 'Independent specialty medical practices — typically 1 to 10 providers — that bill commercial payers and Medicare and suspect they are leaving money on the table through underpayments or denials they are not currently appealing. Practices that process at least 50 claims per month will see the most meaningful findings.',
  },
]

// ─── FAQ accordion item ───────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-zinc-200 last:border-0">
      <button
        className="flex w-full items-start justify-between gap-4 py-5 text-left"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="text-base font-medium text-zinc-900">{q}</span>
        {open ? (
          <ChevronUp className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" />
        ) : (
          <ChevronDown className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" />
        )}
      </button>
      {open && (
        <p className="pb-5 text-sm leading-relaxed text-zinc-600">{a}</p>
      )}
    </div>
  )
}

// ─── Checkout button ──────────────────────────────────────────────────────────

function StartPilotButton({ className }: { className?: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Unable to start checkout. Please try again.')
      }
      const { url } = await res.json()
      window.location.href = url
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setLoading(false)
    }
  }

  return (
    <div className={className}>
      <Button
        size="lg"
        className="w-full bg-blue-700 text-white hover:bg-blue-800 sm:w-auto"
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? 'Redirecting to checkout…' : 'Start a Pilot — $500'}
      </Button>
      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PilotPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* ── Nav ── */}
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/icon-192x192.png"
              alt="MedicalRouter logo"
              width={36}
              height={36}
              className="rounded-lg"
              priority
            />
            <span className="text-base font-semibold tracking-tight text-zinc-900">MedicalRouter</span>
          </Link>
          <div className="flex items-center gap-3">
            {/* Current page indicator */}
            <span className="hidden rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 sm:inline">
              30-Day Pilot Offer
            </span>
            <Link href="/login">
              <Button variant="outline" size="sm">Sign in</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="border-b bg-zinc-50 px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-blue-700">
            30-Day Pilot Offer
          </p>
          <h1 className="mb-5 text-4xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-5xl">
            Recover Missed Payer Revenue Without Taking On a Big Fixed Cost
          </h1>
          <p className="mb-8 text-lg leading-relaxed text-zinc-600">
            A 30-day pilot for independent medical practices to identify underpayments,
            short-pays, and appealable payer revenue leakage — with ready-to-send appeal
            packets and a full recovery workflow included.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <StartPilotButton />
            <a href="mailto:[CONTACT_EMAIL]">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Contact Us
              </Button>
            </a>
            <a href="https://cal.com" target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="lg" className="w-full sm:w-auto text-zinc-600">
                Book a Demo
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* ── Offer details ── */}
      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-2xl font-semibold tracking-tight text-zinc-900">
            What is included in the pilot
          </h2>

          <div className="mb-10 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
            {/* Pricing callout */}
            <div className="mb-6 flex flex-col gap-1 border-b border-zinc-100 pb-6 sm:flex-row sm:items-end sm:gap-6">
              <div>
                <p className="text-4xl font-bold text-zinc-900">$500</p>
                <p className="text-sm text-zinc-500">one-time onboarding and pilot setup</p>
              </div>
              <div className="sm:ml-auto">
                <p className="text-lg font-semibold text-zinc-900">+ 25% success fee</p>
                <p className="text-sm text-zinc-500">on net recovered payer dollars only</p>
              </div>
            </div>

            {/* Bullets */}
            <ul className="space-y-3">
              {[
                'Analysis of your 835 ERA and EOB files for underpayments and appealable denials',
                'Net recoverable amount calculated per claim: Allowed − Paid − Patient Responsibility',
                'Appeal packet generation with denial-specific letter templates',
                'Denial classification by category (medical necessity, timely filing, bundling, and more)',
                'Appeal deadline tracking with urgency warnings',
                'Recovery workflow to track appeal status through to resolution',
                'No long-term contract — pilot ends after 30 days with no obligation to continue',
                'Best fit for independent specialty practices billing commercial payers and Medicare',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                  <span className="text-sm leading-relaxed text-zinc-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Success fee explanation */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
            <p className="mb-1 text-sm font-semibold text-amber-900">About the 25% success fee</p>
            <p className="text-sm leading-relaxed text-amber-800">
              The success fee applies only to payer dollars that are actually recovered as a direct
              result of opportunities identified through this pilot. It is not charged on the $500
              onboarding fee, on patient responsibility amounts, or on any revenue identified outside
              the pilot. The fee is invoiced manually after recovery is confirmed — there is no
              automated billing for this portion.
            </p>
          </div>

          {/* Service agreement link */}
          <div className="mt-5 rounded-lg border border-zinc-200 bg-zinc-50 px-5 py-4">
            <p className="text-sm text-zinc-600">
              By completing checkout, you agree to the commercial terms in the{' '}
              <Link href="/service-agreement" className="font-medium text-blue-700 underline hover:text-blue-900">
                MedicalRouter Pilot Services Agreement
              </Link>
              , including the non-refundable $500 setup fee, the 25% success fee on recovered amounts,
              the 7-day payment obligation, and the 12-month recovery window.
            </p>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="border-t bg-zinc-50 px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-2xl font-semibold tracking-tight text-zinc-900">
            How the pilot works
          </h2>
          <ol className="space-y-6">
            {[
              {
                step: '1',
                title: 'Pay the $500 onboarding fee',
                body: 'Secure checkout via Stripe. You will receive a receipt and a confirmation email.',
              },
              {
                step: '2',
                title: 'Upload your 835 ERA or EOB files',
                body: 'We accept 835 EDI transaction sets and PDF Explanation of Benefits documents from all major payers including UHC, Cigna, Aetna, BCBS, and Medicare.',
              },
              {
                step: '3',
                title: 'Review your findings',
                body: 'The engine identifies underpayments and appealable denials, calculates the net recoverable amount per claim, and generates appeal letters with supporting documentation.',
              },
              {
                step: '4',
                title: 'File appeals and track recovery',
                body: 'Use the built-in workflow to track each appeal from "not filed" through to "won" or "lost." The 25% success fee applies only to amounts the payer actually pays after an appeal.',
              },
            ].map(({ step, title, body }) => (
              <li key={step} className="flex gap-5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-700 text-sm font-bold text-white">
                  {step}
                </div>
                <div>
                  <p className="mb-1 font-semibold text-zinc-900">{title}</p>
                  <p className="text-sm leading-relaxed text-zinc-600">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="border-t px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-2xl font-semibold tracking-tight text-zinc-900">
            Frequently asked questions
          </h2>
          <div className="rounded-xl border border-zinc-200 bg-white px-6 sm:px-8">
            {FAQS.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="border-t bg-blue-700 px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-3 text-3xl font-semibold text-white">
            Ready to see what you are owed?
          </h2>
          <p className="mb-8 text-blue-200">
            Start the pilot for $500. No long-term contract. Cancel any time.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <StartPilotButton />
            <a href="mailto:[CONTACT_EMAIL]">
              <Button
                variant="outline"
                size="lg"
                className="w-full border-white bg-transparent text-white hover:bg-blue-800 sm:w-auto"
              >
                Contact Us
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t bg-white px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-center justify-between gap-4 text-xs text-zinc-400 sm:flex-row">
            <p>© {new Date().getFullYear()} MedicalRouter. All rights reserved.</p>
            <div className="flex flex-wrap items-center justify-center gap-5">
              <Link href="/" className="hover:text-zinc-600">Home</Link>
              <Link href="/pilot" className="font-semibold text-blue-700 underline hover:text-blue-900">30-Day Pilot — $500</Link>
              <Link href="/faq" className="hover:text-zinc-600">FAQ</Link>
              <Link href="/terms" className="hover:text-zinc-600">Terms of Use</Link>
              <Link href="/privacy" className="hover:text-zinc-600">Privacy Policy</Link>
              <Link href="/service-agreement" className="hover:text-zinc-600">Service Agreement</Link>
              <Link href="/login" className="hover:text-zinc-600">Sign in</Link>
              <a href="mailto:[CONTACT_EMAIL]" className="hover:text-zinc-600">Contact</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
