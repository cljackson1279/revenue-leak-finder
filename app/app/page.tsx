'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getSupabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp, CheckCircle, Lock, FileText, BarChart2 } from 'lucide-react'

// ─── Sample findings ──────────────────────────────────────────────────────────

const SAMPLE_FINDINGS = [
  { id: '2024-03847', payer: 'UHC',      type: 'Underpayment', billed: '$1,240', paid: '$890', shortfall: '$350',   carc: 'CO-45', status: 'Appeal ready' },
  { id: '2024-03851', payer: 'Cigna',    type: 'Denial',       billed: '$2,100', paid: '$0',   shortfall: '$2,100', carc: 'CO-50', status: 'Appeal ready' },
  { id: '2024-03862', payer: 'Aetna',    type: 'Underpayment', billed: '$780',   paid: '$520', shortfall: '$260',   carc: 'CO-45', status: 'Appeal ready' },
  { id: '2024-03901', payer: 'BCBS',     type: 'Denial',       billed: '$1,650', paid: '$0',   shortfall: '$1,650', carc: 'CO-29', status: 'Appeal ready' },
  { id: '2024-03912', payer: 'Medicare', type: 'Underpayment', billed: '$430',   paid: '$310', shortfall: '$120',   carc: 'CO-45', status: 'Review'       },
]

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: 'What does the $500 cover?',
    a: 'Pilot setup, full analysis of your 835 ERA and EOB files, identification of underpayments and appealable denials, ready-to-send appeal packets, and 30-day access to the recovery tracking workflow. No per-file charges, no hidden fees.',
  },
  {
    q: 'When is the 25% success fee charged?',
    a: 'Only when a payer issues a corrected payment or upholds an appeal as a direct result of an opportunity found through this pilot. Not on the $500 fee, not on patient responsibility amounts. The fee is invoiced manually after recovery is confirmed.',
  },
  {
    q: 'Do you handle denied claims as well as underpayments?',
    a: 'Yes. The engine identifies underpayments (payer paid less than the contracted allowed amount) and appealable denials — CO-50 (medical necessity), CO-29 (timely filing), CO-97 (bundling), CO-4 (modifier), CO-16 (missing information), and others. Each finding includes the CARC code, the math, and a draft appeal letter.',
  },
  {
    q: 'Is there a long-term contract?',
    a: 'No. The pilot is a 30-day engagement. If you want to continue, we can discuss terms. You are never locked in.',
  },
  {
    q: 'Who is this best suited for?',
    a: 'Independent specialty practices — typically 1 to 10 providers — billing commercial payers and Medicare, processing at least 50 claims per month. Practices that have not systematically appealed underpayments or denials in the past 12 months will see the most meaningful findings.',
  },
  {
    q: 'How is my data handled?',
    a: 'Files are stored in private per-account storage, encrypted in transit. You retain full ownership — we do not use your data to train models or share it with third parties.',
  },
]

// ─── FAQ item ─────────────────────────────────────────────────────────────────

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
        {open
          ? <ChevronUp className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" />
          : <ChevronDown className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" />}
      </button>
      {open && <p className="pb-5 text-sm leading-relaxed text-zinc-600">{a}</p>}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const supabase = getSupabase()
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) router.push('/app/dashboard')
    }
    checkAuth()
  }, [router])

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
            Denied and underpaid claims recovery
          </p>
          <h1 className="mb-5 text-4xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-5xl">
            Find denied and underpaid claims<br className="hidden sm:block" /> in your ERA and EOB files.
          </h1>
          <p className="mb-5 max-w-2xl text-lg leading-relaxed text-zinc-600">
            For practice administrators and billing teams at independent specialty practices.
            MedicalRouter analyzes 835 ERAs and EOB PDFs to surface underpayments, denied claims,
            and billing errors — with appeal-ready findings for each one.
          </p>
          <p className="mb-6 inline-block rounded-md bg-zinc-100 px-3 py-1.5 font-mono text-sm text-zinc-600">
            Allowed − Paid − Patient Responsibility = Net Recoverable
          </p>

          {/* Above-fold proof: single example finding */}
          <div className="mb-8 flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm">
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
              <span className="font-medium text-zinc-800">Cigna</span>
              <span className="text-zinc-300">·</span>
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">Denial</span>
              <span className="text-zinc-300">·</span>
              <span className="font-mono text-xs text-zinc-400">CO-50</span>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-lg font-bold text-zinc-900">$2,100</p>
              <p className="text-xs text-zinc-400">recoverable</p>
            </div>
            <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
              Appeal ready
            </span>
          </div>
          <p className="mb-8 text-xs text-zinc-400">↑ Example finding. See full sample output below.</p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/pilot">
              <Button size="lg" className="w-full bg-blue-700 px-8 text-white hover:bg-blue-800 sm:w-auto">
                Start a 30-Day Pilot — $500
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button size="lg" variant="outline" className="w-full px-8 sm:w-auto">
                See how it works
              </Button>
            </a>
          </div>
          <p className="mt-4 text-sm text-zinc-500">
            No long-term contract · 25% success fee on recovered dollars only ·{' '}
            <Link href="/login" className="underline hover:text-zinc-700">Sign in →</Link>
          </p>
        </div>
      </section>

      {/* ── Sample findings from an ERA / EOB analysis ── */}
      <section className="border-b px-4 py-14 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6">
            <h2 className="mb-1 text-2xl font-semibold tracking-tight text-zinc-900">
              Sample findings from an ERA and EOB analysis
            </h2>
            <p className="text-sm text-zinc-500">
              Illustrative output. Structure and logic match what the engine produces from real files.
            </p>
          </div>

          {/* Table — desktop */}
          <div className="hidden overflow-hidden rounded-xl border border-zinc-200 sm:block">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50">
                <tr>
                  <th className="px-3 py-2.5 text-left font-medium text-zinc-500">Claim</th>
                  <th className="px-3 py-2.5 text-left font-medium text-zinc-500">Payer</th>
                  <th className="px-3 py-2.5 text-left font-medium text-zinc-500">Type</th>
                  <th className="px-3 py-2.5 text-right font-medium text-zinc-500">Billed</th>
                  <th className="px-3 py-2.5 text-right font-medium text-zinc-500">Paid</th>
                  <th className="px-3 py-2.5 text-right font-medium text-zinc-500">Shortfall</th>
                  <th className="px-3 py-2.5 text-left font-medium text-zinc-500">Reason</th>
                  <th className="px-3 py-2.5 text-left font-medium text-zinc-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {SAMPLE_FINDINGS.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-50">
                    <td className="px-3 py-2.5 font-mono text-xs text-zinc-400">{row.id}</td>
                    <td className="px-3 py-2.5 font-medium text-zinc-800">{row.payer}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.type === 'Denial' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                      }`}>{row.type}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-zinc-400">{row.billed}</td>
                    <td className="px-3 py-2.5 text-right text-zinc-400">{row.paid}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-zinc-900">{row.shortfall}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-zinc-400">{row.carc}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.status === 'Appeal ready' ? 'bg-blue-50 text-blue-700' : 'bg-zinc-100 text-zinc-600'
                      }`}>{row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-zinc-200 bg-zinc-50">
                <tr>
                  <td colSpan={5} className="px-3 py-2.5 text-sm font-medium text-zinc-700">Total across 5 claims</td>
                  <td className="px-3 py-2.5 text-right text-sm font-bold text-zinc-900">$4,480</td>
                  <td colSpan={2} className="px-3 py-2.5 text-xs text-zinc-400">illustrative</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Cards — mobile */}
          <div className="space-y-3 sm:hidden">
            {SAMPLE_FINDINGS.map((row) => (
              <div key={row.id} className="rounded-lg border border-zinc-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-medium text-zinc-800">{row.payer}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    row.type === 'Denial' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                  }`}>{row.type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-zinc-900">{row.shortfall}</p>
                    <p className="text-xs text-zinc-400">shortfall · {row.carc}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    row.status === 'Appeal ready' ? 'bg-blue-50 text-blue-700' : 'bg-zinc-100 text-zinc-600'
                  }`}>{row.status}</span>
                </div>
              </div>
            ))}
            <p className="pt-1 text-right text-sm font-semibold text-zinc-700">$4,480 total · illustrative</p>
          </div>

          <p className="mt-5 text-sm text-zinc-500">
            Each finding includes the math, the payer reason code, and a draft appeal letter ready to download.{' '}
            <Link href="/denied-claims-recovery" className="underline hover:text-zinc-700">
              How denied claims recovery works →
            </Link>
          </p>
        </div>
      </section>

      {/* ── How ERA and EOB analysis works ── */}
      <section id="how-it-works" className="border-b bg-zinc-50 px-4 py-14 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-8 text-2xl font-semibold tracking-tight text-zinc-900">
            How ERA and EOB analysis works
          </h2>
          <div className="grid gap-6 sm:grid-cols-4">
            {[
              {
                icon: <FileText className="h-5 w-5 text-blue-600" />,
                step: '1',
                title: 'Upload your files',
                body: '835 EDI files or EOB PDFs from UHC, Cigna, Aetna, BCBS, Medicare, or any major payer.',
              },
              {
                icon: <BarChart2 className="h-5 w-5 text-blue-600" />,
                step: '2',
                title: 'Claims are analyzed',
                body: <>The engine parses each transaction and flags underpayments and <Link href="/denied-claims-recovery" className="underline hover:text-zinc-900">appealable denied claims</Link> by CARC/RARC code.</>,
              },
              {
                icon: <CheckCircle className="h-5 w-5 text-blue-600" />,
                step: '3',
                title: 'Review ranked findings',
                body: 'Each finding shows: Allowed − Paid − Patient Responsibility = Net Recoverable, with the full claim detail.',
              },
              {
                icon: <Lock className="h-5 w-5 text-blue-600" />,
                step: '4',
                title: 'File appeals and track recovery',
                body: 'Download the appeal packet. File with the payer. Track each appeal from submitted through to resolved.',
              },
            ].map(({ icon, step, title, body }) => (
              <div key={step} className="rounded-xl border border-zinc-200 bg-white p-5">
                <div className="mb-3 flex items-center gap-2.5">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-700 text-xs font-bold text-white">
                    {step}
                  </div>
                  {icon}
                </div>
                <p className="mb-1 font-semibold text-zinc-900">{title}</p>
                <p className="text-sm leading-relaxed text-zinc-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who this is for / Data handling ── */}
      <section className="border-b px-4 py-14 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-10 sm:grid-cols-2">

            <div>
              <h2 className="mb-5 text-2xl font-semibold tracking-tight text-zinc-900">
                Who this is for
              </h2>
              <ul className="mb-5 space-y-3">
                {[
                  'Independent specialty practices — cardiology, orthopedics, oncology, multi-specialty groups',
                  '1–10 providers billing commercial payers and Medicare',
                  '50+ claims per month',
                  'Teams leaving denied claim appeals on the table',
                  'Practices that suspect short-pays but cannot identify them claim by claim',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-zinc-700">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
                <span className="font-medium text-zinc-700">Not a fit:</span>{' '}
                large hospital systems, RCM vendors reselling to patients, or practices processing fewer than 50 claims per month.
              </div>
              <p className="mt-4 text-sm">
                <Link href="/denied-claims-recovery" className="font-medium text-blue-700 underline hover:text-blue-900">
                  Learn how we handle denied claims recovery →
                </Link>
              </p>
            </div>

            <div>
              <h2 className="mb-5 text-2xl font-semibold tracking-tight text-zinc-900">
                How your data is handled
              </h2>
              <ul className="space-y-3">
                {[
                  'Files stored in private per-account storage — not shared across accounts',
                  'Encrypted in transit (TLS). You own your data.',
                  'Not used to train models or shared with third parties',
                  'No patient identifiers in system logs',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-zinc-700">
                    <Lock className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* ── 30-day pilot pricing ── */}
      <section className="border-b bg-zinc-50 px-4 py-14 sm:px-6 sm:py-16">
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
                'Full analysis of 835 ERA and EOB files for underpayments and appealable denied claims',
                'Net recoverable calculated per claim: Allowed − Paid − Patient Responsibility',
                'Appeal packets with denial-specific letter templates, classified by CARC/RARC code',
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
              If we find nothing actionable, you are out $500. The 25% success fee applies only to payer
              dollars actually recovered — not patient responsibility, not the setup fee.
            </div>

            <Link href="/pilot">
              <Button size="lg" className="w-full bg-blue-700 text-white hover:bg-blue-800 sm:w-auto">
                Start 30-Day Pilot →
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
            Frequently asked questions
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
            Ready to see what you are owed?
          </h2>
          <p className="mb-8 text-blue-200">
            Upload your ERA or EOB files. You keep all findings — and pay 25% only on what is actually recovered.
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
