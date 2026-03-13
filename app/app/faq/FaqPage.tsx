'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp } from 'lucide-react'

const FAQS = [
  {
    q: 'What is MedicalRouter?',
    a: 'MedicalRouter is a software platform that helps medical practices review billing-related documents, identify potential underpayments and denied claims, and generate findings and appeal-ready documentation to help billing teams prioritize follow-up.',
  },
  {
    q: 'Who is MedicalRouter for?',
    a: 'MedicalRouter is designed for independent medical practices, specialty groups, and billing teams that want a faster way to identify missed payer revenue and organize recovery efforts.',
  },
  {
    q: 'What kinds of documents can be uploaded?',
    a: 'Users may upload supported billing-related files such as EOBs, ERAs, 835 files, and related claims documentation, subject to platform requirements and accepted file formats.',
  },
  {
    q: 'What does the platform identify?',
    a: 'The platform is designed to identify potential payer underpayments, denied claims, and related recovery opportunities based on the information available in uploaded documents and platform logic.',
  },
  {
    q: 'Does MedicalRouter guarantee recovery?',
    a: 'No. MedicalRouter helps identify possible recovery opportunities and organize supporting information, but actual reimbursement outcomes depend on many factors, including payer rules, documentation quality, coding accuracy, filing deadlines, and provider contract terms.',
  },
  {
    q: 'Does the platform replace a billing team or legal advisor?',
    a: 'No. MedicalRouter is a workflow and analysis tool. It does not replace professional billing judgment, coding review, compliance review, legal advice, or payer-specific expertise.',
  },
  {
    q: 'Are appeal letters automatically submitted?',
    a: 'No. The platform may generate draft or appeal-ready documentation, but users are responsible for reviewing, approving, editing, and submitting any appeal or correspondence.',
  },
  {
    q: 'How is "Net Recoverable from Payer" calculated?',
    a: 'For underpayment findings, MedicalRouter currently calculates Net Recoverable from Payer using this formula: Allowed Amount − Payer Paid Amount − Patient Responsibility. For denied claims, the platform may separately identify the amount at risk, which is not the same as a confirmed recoverable amount.',
  },
  {
    q: 'Are denied claims handled differently from underpayments?',
    a: 'Yes. The platform distinguishes between underpayments and denied claims. Denied claims may be categorized separately and may include different workflows, deadlines, or recommendations depending on the available data.',
  },
  {
    q: 'Is my data secure?',
    a: 'MedicalRouter uses administrative, technical, and organizational safeguards designed to protect uploaded information and limit unauthorized access. These safeguards are designed to protect data to the highest extent reasonably practicable, including controlled access, authentication controls, encrypted transmission, secure infrastructure practices, logging, and role-based restrictions. No system can guarantee absolute security, but MedicalRouter is designed to safeguard customer data using strong security practices.',
  },
  {
    q: 'Who owns the uploaded data?',
    a: 'You retain ownership of the data and files you upload. MedicalRouter uses that data only as needed to provide, maintain, secure, and improve the service, subject to the Terms of Use and Privacy Policy.',
  },
  {
    q: 'Can multiple team members use the platform?',
    a: 'That depends on the account setup and service plan. Access may be limited to authorized users associated with the customer account.',
  },
  {
    q: 'How do I get support?',
    a: 'Users can contact MedicalRouter through the contact method listed on the site for platform support, account questions, and technical issues.',
  },
]

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

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-zinc-50">

      {/* ── Nav ── */}
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="text-xl font-semibold tracking-tight text-zinc-900 hover:text-zinc-700">
            MedicalRouter
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/pilot" className="font-medium text-blue-700 hover:text-blue-900">Start a Pilot</Link>
            <Link href="/login" className="text-zinc-500 hover:text-zinc-900">Sign in</Link>
          </div>
        </div>
      </nav>

      {/* ── Content ── */}
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
        <h1 className="mb-3 text-4xl font-semibold tracking-tight text-zinc-900">
          Frequently Asked Questions
        </h1>
        <p className="mb-10 text-base text-zinc-500">
          Questions about how MedicalRouter works, what it identifies, and how your data is protected.
        </p>

        <div className="rounded-xl border border-zinc-200 bg-white px-6 sm:px-8">
          {FAQS.map((faq) => (
            <FaqItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>

        <div className="mt-10 rounded-lg border border-blue-100 bg-blue-50 px-6 py-5">
          <p className="text-sm text-blue-800">
            Have a question not answered here?{' '}
            <a href="mailto:chris@medicalrouter.com" className="font-medium underline hover:text-blue-900">
              Contact us
            </a>
            {' '}and we will get back to you promptly.
          </p>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t bg-white px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-xs text-zinc-400 sm:flex-row">
          <p>© {new Date().getFullYear()} MedicalRouter. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-5">
            <Link href="/" className="hover:text-zinc-600">Home</Link>
            <Link href="/pilot" className="font-medium text-blue-700 underline hover:text-blue-900">30-Day Pilot — $500</Link>
            <Link href="/faq" className="font-medium text-zinc-700 hover:text-zinc-900">FAQ</Link>
            <Link href="/terms" className="hover:text-zinc-600">Terms of Use</Link>
            <Link href="/privacy" className="hover:text-zinc-600">Privacy Policy</Link>
            <Link href="/service-agreement" className="hover:text-zinc-600">Service Agreement</Link>
            <Link href="/login" className="hover:text-zinc-600">Sign in</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
