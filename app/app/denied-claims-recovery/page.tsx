import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { FaqItem } from './FaqItem'

export const metadata = {
  title: 'Denied Claims Recovery for Medical Practices',
  description:
    'Find appealable denied insurance claims in your ERA and EOB files. MedicalRouter classifies denials by reason code — CO-50, CO-29, CO-97 — and generates ready-to-send appeal packets for billing teams.',
  alternates: {
    canonical: 'https://medicalrouter.com/denied-claims-recovery',
  },
}

// ─── Denial categories (sourced from real engine appeal_rules.json) ───────────

const DENIAL_CATEGORIES = [
  {
    code: 'CO-50',
    label: 'Medical necessity',
    description: 'Payer deemed service not medically necessary. Typically appealable with clinical documentation and supporting notes.',
  },
  {
    code: 'CO-29',
    label: 'Timely filing',
    description: 'Filing deadline passed per payer rules. Appealable when proof of prior timely submission exists — e.g., a clearinghouse confirmation.',
  },
  {
    code: 'CO-97',
    label: 'Bundling',
    description: 'Payer bundled payment into another service. Often appealable with modifier 59 or XE to establish distinct procedure.',
  },
  {
    code: 'CO-4',
    label: 'Modifier issue',
    description: 'Procedure code inconsistent with modifier used, or modifier missing. Correct the modifier and resubmit.',
  },
  {
    code: 'CO-16',
    label: 'Missing information',
    description: 'Claim has a billing error or is missing required information. Submit the missing item; typically straightforward to resolve.',
  },
  {
    code: 'CO-39',
    label: 'Prior authorization',
    description: 'Service denied at authorization. Appealable with clinical documentation supporting medical necessity.',
  },
]

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: 'Which denial codes does the engine flag as appealable?',
    a: 'The engine evaluates denials against a set of reason codes that have established reversal pathways — including CO-50 (medical necessity), CO-29 (timely filing), CO-97 (bundling), CO-4 (modifier), CO-16 (missing information), and others. Codes that are typically non-appealable — such as duplicate claims (CO-18) or coverage-terminated denials (CO-27) — are flagged separately and excluded from appeal packet generation.',
  },
  {
    q: 'How does the engine decide which denied claims are worth appealing?',
    a: 'The engine applies rule-based logic to each denial reason code. If the code has a known reversal pathway — a specific argument, documentation type, or administrative fix — the claim is classified as appealable and included in your findings. It does not use machine learning or probabilistic scoring. The output is deterministic: the same ERA file produces the same findings every time.',
  },
  {
    q: 'What is included in the appeal packet?',
    a: 'Each appeal packet includes the claim detail (dates of service, procedure codes, billed and allowed amounts), the denial reason code with an explanation, the net recoverable amount, and a draft appeal letter specific to that denial type. You review the letter, make any edits, and send it directly to the payer.',
  },
  {
    q: 'Does the engine submit appeals automatically?',
    a: 'No. The engine generates the packet — the findings, the math, and the draft letter. Your billing team reviews and submits. This keeps you in control of what goes out and avoids sending appeals your team has not reviewed.',
  },
  {
    q: 'What if the timely filing window has already closed?',
    a: 'The engine flags timely filing denials (CO-29) and, where possible, notes whether the filing window is still open based on the date information in the ERA. If the deadline has passed, the finding is included but marked for manual review rather than auto-generated as appeal-ready.',
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DeniedClaimsRecoveryPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-10 border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/icon-192x192.png" alt="MedicalRouter logo" width={32} height={32} className="rounded-lg" priority />
            <span className="text-lg font-semibold tracking-tight text-zinc-900">MedicalRouter</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/pilot">
              <Button className="bg-blue-700 text-white hover:bg-blue-800">Start a Pilot — $500</Button>
            </Link>
            <Link href="/login">
              <Button variant="outline">Sign in</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="border-b bg-zinc-50 px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-blue-700">
            Denied claims recovery
          </p>
          <h1 className="mb-5 text-4xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-5xl">
            Find your appealable denials.<br className="hidden sm:block" /> Get the packets ready to send.
          </h1>
          <p className="mb-6 max-w-2xl text-lg leading-relaxed text-zinc-600">
            When a payer denies a claim, they include a reason code. Many of those codes have
            established reversal pathways — but identifying which specific denied claims are worth
            appealing, and in what order, is work that falls through the cracks in most billing teams.
          </p>
          <p className="mb-8 text-base leading-relaxed text-zinc-600">
            MedicalRouter reads your ERA and EOB files, classifies each denial by CARC code,
            identifies which are appealable, and generates a ready-to-send appeal packet for each one —
            ranked by recoverable dollar amount.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/pilot">
              <Button size="lg" className="w-full bg-blue-700 px-8 text-white hover:bg-blue-800 sm:w-auto">
                Start a 30-Day Pilot — $500
              </Button>
            </Link>
            <a href="#denial-categories">
              <Button size="lg" variant="outline" className="w-full px-8 sm:w-auto">
                See which denials we catch
              </Button>
            </a>
          </div>
          <p className="mt-4 text-sm text-zinc-500">
            No long-term contract · 25% success fee on recovered dollars only ·{' '}
            <Link href="/" className="underline hover:text-zinc-700">Learn more about the product →</Link>
          </p>
        </div>
      </section>

      {/* ── Sample denial finding ── */}
      <section className="border-b px-4 py-14 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-2 text-2xl font-semibold tracking-tight text-zinc-900">
            What a denial finding looks like
          </h2>
          <p className="mb-8 text-sm text-zinc-500">
            Illustrative example. Output structure matches what the engine produces from real ERA files.
          </p>

          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            {/* Finding header */}
            <div className="flex items-start justify-between border-b border-zinc-100 px-5 py-4 sm:px-6">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">Denial</span>
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">Appeal ready</span>
                </div>
                <p className="font-mono text-xs text-zinc-400">Claim 2024-03851 · Cigna · DOS 2024-09-14</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-zinc-900">$2,100</p>
                <p className="text-xs text-zinc-400">net recoverable</p>
              </div>
            </div>

            {/* Finding detail */}
            <div className="divide-y divide-zinc-100">
              <div className="grid grid-cols-2 gap-4 px-5 py-3 sm:grid-cols-4 sm:px-6">
                <div>
                  <p className="text-xs text-zinc-400">Billed</p>
                  <p className="text-sm font-medium text-zinc-700">$2,100</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Paid</p>
                  <p className="text-sm font-medium text-zinc-700">$0</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Denial reason</p>
                  <p className="text-sm font-mono font-medium text-zinc-700">CO-50</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Category</p>
                  <p className="text-sm font-medium text-zinc-700">Medical necessity</p>
                </div>
              </div>
              <div className="px-5 py-3 sm:px-6">
                <p className="text-xs text-zinc-400">Denial explanation</p>
                <p className="mt-0.5 text-sm text-zinc-600">
                  Payer determined service was not medically necessary. Appeal with clinical documentation
                  and supporting physician notes. Draft letter included in packet.
                </p>
              </div>
              <div className="flex items-center justify-between bg-zinc-50 px-5 py-3 sm:px-6">
                <p className="text-xs text-zinc-500">Appeal packet ready to download</p>
                <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Letter · Claim detail · Math trace
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Denial categories ── */}
      <section id="denial-categories" className="border-b bg-zinc-50 px-4 py-14 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-2 text-2xl font-semibold tracking-tight text-zinc-900">
            Denial categories the engine identifies
          </h2>
          <p className="mb-8 text-sm text-zinc-500">
            Each category has a distinct reversal pathway. The engine generates a specific appeal
            letter template for each type — not a generic letter.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {DENIAL_CATEGORIES.map(({ code, label, description }) => (
              <div key={code} className="rounded-xl border border-zinc-200 bg-white p-5">
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-xs font-semibold text-zinc-700">
                    {code}
                  </span>
                  <span className="font-semibold text-zinc-900">{label}</span>
                </div>
                <p className="text-sm leading-relaxed text-zinc-600">{description}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500">
            <AlertCircle className="mb-0.5 mr-1.5 inline h-3.5 w-3.5 text-zinc-400" />
            Some denial codes are non-appealable — CO-18 (duplicate), CO-27 (post-termination), CO-119 (benefit maximum). The engine flags these separately so your team does not spend time on claims that cannot be recovered.
          </div>
        </div>
      </section>

      {/* ── How it works for denials ── */}
      <section className="border-b px-4 py-14 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-2xl font-semibold tracking-tight text-zinc-900">
            From ERA file to appeal packet
          </h2>
          <ol className="space-y-6">
            {[
              {
                step: '1',
                title: 'Upload your 835 ERA or EOB files',
                body: 'Files from UHC, Cigna, Aetna, BCBS, Medicare, and other major payers are supported. Upload once per batch — typically monthly or after each remittance cycle.',
              },
              {
                step: '2',
                title: 'Each denial is classified by CARC code',
                body: 'The engine reads each claim-level denial reason code, looks it up against the rule set, and determines whether a reversal pathway exists. Appealable and non-appealable denials are separated.',
              },
              {
                step: '3',
                title: 'Findings are ranked by recoverable amount',
                body: 'Appealable denials are ranked by net recoverable dollar amount so your billing team works highest-value cases first. Each finding shows the claim detail, the reason code, and the math.',
              },
              {
                step: '4',
                title: 'Download the appeal packet and send',
                body: 'Each appealable denial has a packet: a denial-specific draft letter, the claim summary, and supporting documentation guidance. You review, edit if needed, and send to the payer.',
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

      {/* ── Who this is for ── */}
      <section className="border-b bg-zinc-50 px-4 py-14 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-5 text-2xl font-semibold tracking-tight text-zinc-900">
            Who this is for
          </h2>
          <ul className="mb-5 space-y-3">
            {[
              'Independent specialty practices — cardiology, orthopedics, oncology, and multi-specialty groups',
              '1–10 providers billing commercial payers and Medicare',
              'Billing teams that receive denial EOBs but do not have a systematic process for identifying which ones to appeal',
              'Practices processing 50+ claims per month with a meaningful denial rate',
              'Teams that want a ranked, prioritized list — not a pile of raw remittance data',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-zinc-700">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                {item}
              </li>
            ))}
          </ul>
          <div className="rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500">
            <span className="font-medium text-zinc-700">Not a fit:</span>{' '}
            large hospital systems with dedicated denial management departments, RCM vendors, or practices
            processing fewer than 50 claims per month.
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="border-b px-4 py-14 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-900">
            30-day pilot pricing
          </h2>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex flex-col gap-1 border-b border-zinc-100 pb-6 sm:flex-row sm:items-end sm:gap-8">
              <div>
                <p className="text-4xl font-bold text-zinc-900">$500</p>
                <p className="text-sm text-zinc-500">flat onboarding fee, one-time</p>
              </div>
              <div className="sm:ml-auto sm:text-right">
                <p className="text-xl font-semibold text-zinc-900">+ 25% success fee</p>
                <p className="text-sm text-zinc-500">on net recovered payer dollars only</p>
              </div>
            </div>
            <ul className="mb-6 space-y-3">
              {[
                'Full denial analysis from your 835 ERA and EOB files',
                'Appealable vs. non-appealable classification by CARC code',
                'Ready-to-send appeal packets with denial-specific letter templates',
                'No per-claim fees. No per-payer fees. No long-term contract.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                  <span className="text-sm leading-relaxed text-zinc-700">{item}</span>
                </li>
              ))}
            </ul>
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <strong className="block mb-1 text-amber-900">The honest framing:</strong>
              If your files contain no appealable denials, you are out $500. The 25% success fee
              applies only to payer dollars that are actually recovered — not patient responsibility,
              not the setup fee.
            </div>
            <Link href="/pilot">
              <Button size="lg" className="w-full bg-blue-700 text-white hover:bg-blue-800 sm:w-auto">
                Start the 30-Day Pilot →
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-center text-xs text-zinc-400">
            By starting the pilot you agree to the{' '}
            <Link href="/service-agreement" className="underline hover:text-zinc-600">Pilot Services Agreement</Link>
            , including the non-refundable $500 setup fee and the 25% success fee terms.
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="border-b px-4 py-14 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-2xl font-semibold tracking-tight text-zinc-900">
            Questions about denied claims recovery
          </h2>
          <div className="rounded-xl border border-zinc-200 bg-white px-6 sm:px-8">
            {FAQS.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-zinc-500">
            More questions?{' '}
            <Link href="/faq" className="underline hover:text-zinc-700">Full FAQ</Link>
            {' '}or{' '}
            <a href="mailto:chris@medicalrouter.com" className="underline hover:text-zinc-700">contact us</a>.
          </p>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="bg-blue-700 px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-3 text-3xl font-semibold text-white">
            Start recovering denied claims revenue
          </h2>
          <p className="mb-8 text-blue-200">
            Upload your ERA or EOB files. Get a ranked list of appealable denials with
            ready-to-send packets. Pay 25% only on what is actually recovered.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/pilot">
              <Button size="lg" className="w-full bg-white text-blue-700 hover:bg-blue-50 sm:w-auto">
                Start a 30-Day Pilot — $500
              </Button>
            </Link>
            <a href="mailto:chris@medicalrouter.com">
              <Button size="lg" variant="outline" className="w-full border-white bg-transparent text-white hover:bg-blue-800 sm:w-auto">
                Contact Us
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t bg-white py-8">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <address className="not-italic text-xs text-zinc-400">
              © {new Date().getFullYear()} MedicalRouter ·{' '}
              <a href="mailto:chris@medicalrouter.com" className="hover:text-zinc-600">chris@medicalrouter.com</a>
            </address>
            <nav aria-label="Footer navigation">
              <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-zinc-400">
                <Link href="/" className="hover:text-zinc-600">Home</Link>
                <Link href="/pilot" className="font-medium text-blue-700 underline hover:text-blue-900">30-Day Pilot — $500</Link>
                <Link href="/faq" className="hover:text-zinc-600">FAQ</Link>
                <Link href="/terms" className="hover:text-zinc-600">Terms of Use</Link>
                <Link href="/privacy" className="hover:text-zinc-600">Privacy Policy</Link>
                <Link href="/service-agreement" className="hover:text-zinc-600">Service Agreement</Link>
                <Link href="/login" className="hover:text-zinc-600">Sign in</Link>
              </div>
            </nav>
          </div>
        </div>
      </footer>

    </div>
  )
}
