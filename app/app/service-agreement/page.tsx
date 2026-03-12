import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Pilot Services Agreement — MedicalRouter',
  description:
    'MedicalRouter Pilot Services Agreement: commercial terms for the 30-day denied and underpaid claims recovery pilot. Covers the $500 onboarding fee, 25% success fee, 12-month recovery window, and client obligations.',
  alternates: { canonical: 'https://medicalrouter.com/service-agreement' },
  openGraph: {
    url: 'https://medicalrouter.com/service-agreement',
    title: 'Pilot Services Agreement — MedicalRouter',
    description: 'Commercial terms for the MedicalRouter 30-day claims recovery pilot.',
  },
  robots: { index: false, follow: false },
}

export default function ServiceAgreementPage() {
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

        {/* Header */}
        <div className="mb-10">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-blue-700">MedicalRouter</p>
          <h1 className="mb-2 text-4xl font-semibold tracking-tight text-zinc-900">
            Pilot Services Agreement
          </h1>
          <p className="text-sm text-zinc-500">
            This agreement governs the commercial terms of the MedicalRouter 30-Day Pilot engagement.
            Review it carefully before completing checkout.
          </p>
        </div>

        {/* Order form fields — placeholders for the signed copy */}
        <div className="mb-10 rounded-xl border border-zinc-200 bg-white px-6 py-6 sm:px-8">
          <h2 className="mb-4 text-base font-semibold text-zinc-900">Agreement Parties</h2>
          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="mb-1 font-medium text-zinc-700">Service Provider</p>
              <p className="text-zinc-500">MedicalRouter</p>
              <p className="text-zinc-400 text-xs mt-1">[LEGAL ENTITY NAME — PLACEHOLDER]</p>
              <p className="text-zinc-400 text-xs">[BUSINESS ADDRESS — PLACEHOLDER]</p>
            </div>
            <div>
              <p className="mb-1 font-medium text-zinc-700">Client (Practice / Clinic)</p>
              <p className="text-zinc-400 text-xs">Practice name, address, and authorized signatory to be completed at signing.</p>
            </div>
          </div>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-zinc-700">

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">1. Scope of Services</h2>
            <p>MedicalRouter agrees to provide the Client with access to its software platform and analysis services for a 30-day pilot engagement (&ldquo;Pilot Period&rdquo;). Services include review of uploaded billing-related documents (including 835 ERA files and PDF Explanation of Benefits documents), identification of potential underpayments, denied claims, and related recovery opportunities, and generation of findings and appeal-ready documentation to support the Client&apos;s billing team.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">2. Setup Fee — Non-Refundable</h2>
            <p>The Client agrees to pay a one-time setup fee of <strong>$500.00 USD</strong> before the Pilot Period begins and before any audit or analysis work commences. <strong>This setup fee is non-refundable under all circumstances.</strong> Payment of the setup fee is a condition precedent to MedicalRouter&apos;s obligation to perform any services under this Agreement.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">3. Success Fee — 25% Contingency</h2>
            <p className="mb-3">In addition to the setup fee, MedicalRouter is entitled to a success fee equal to <strong>25% of all recovered amounts</strong> from claims identified by MedicalRouter during the audit or Pilot Period, subject to the terms of this Section.</p>
            <p className="mb-3"><strong>Definition of Recovery.</strong> &ldquo;Recovery&rdquo; means actual payment received by the Client from a payer as a direct result of an appeal, corrected claim submission, resubmission, or other follow-up action taken in connection with a claim, denial, underpayment, or reimbursement opportunity identified by MedicalRouter. Recovery does not include patient responsibility amounts (co-pays, deductibles, coinsurance) or amounts that would have been paid regardless of MedicalRouter&apos;s identification.</p>
            <p><strong>Basis of Fee.</strong> The 25% success fee applies to the gross recovered amount received from the payer attributable to the identified opportunity, not net of any other costs or fees.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">4. 12-Month Recovery Window</h2>
            <p className="mb-3">The success fee obligation extends for a period of <strong>12 months from the date MedicalRouter identifies a claim, denial, underpayment, appeal opportunity, corrected claim opportunity, resubmission opportunity, or reimbursement opportunity</strong> (&ldquo;Recovery Window&rdquo;).</p>
            <p className="mb-3"><strong>This obligation survives the end of the Pilot Period.</strong> If MedicalRouter identifies an opportunity during the audit or Pilot Period, and the Client receives payer payment related to that opportunity at any point within 12 months after the date of identification — whether during or after the Pilot Period — MedicalRouter is entitled to the 25% success fee on the recovered amount.</p>
            <p>The Client may not avoid the success fee obligation by delaying the filing of an appeal, resubmission, or corrected claim beyond the Pilot Period. The fee applies to any recovery that occurs within the 12-month Recovery Window, regardless of when the Client initiates the follow-up action, provided the underlying opportunity was identified by MedicalRouter.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">5. Payment of Success Fee</h2>
            <p>The Client agrees to pay MedicalRouter&apos;s success fee within <strong>7 calendar days</strong> of receiving a recovered payment from a payer. The Client is responsible for promptly notifying MedicalRouter of any recovery related to an identified opportunity. MedicalRouter will invoice the Client for the applicable success fee upon notification or upon MedicalRouter&apos;s own identification of a recovery event. Invoices are due and payable within 7 calendar days of issuance.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">6. Verification and Documentation</h2>
            <p className="mb-3">The Client agrees to provide MedicalRouter with documentation sufficient to verify recovered amounts when requested. Acceptable documentation includes, but is not limited to:</p>
            <ul className="ml-4 list-disc space-y-1 text-zinc-600">
              <li>Updated Electronic Remittance Advice (ERA) or 835 files</li>
              <li>Explanation of Benefits (EOB) documents</li>
              <li>Remittance records or payer payment confirmations</li>
              <li>Billing system records reflecting the corrected or recovered payment</li>
              <li>Any other supporting documentation reasonably requested by MedicalRouter</li>
            </ul>
            <p className="mt-3">Failure to provide verification documentation does not relieve the Client of the obligation to pay the success fee on recoveries that occurred within the Recovery Window.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">7. Client Responsibilities</h2>
            <p>The Client is responsible for uploading accurate and complete billing documentation; reviewing all findings, recommendations, and generated documents before use or submission; ensuring that all appeals, resubmissions, and corrected claims are reviewed, approved, and submitted by qualified billing personnel; maintaining compliance with applicable payer requirements, regulations, and contractual obligations; and notifying MedicalRouter promptly of any recovery event within the Recovery Window.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">8. No Guarantee of Recovery</h2>
            <p>MedicalRouter does not guarantee any specific recovery outcome. Actual reimbursement results depend on payer rules, documentation quality, coding accuracy, filing deadlines, provider contract terms, and other factors outside MedicalRouter&apos;s control. MedicalRouter&apos;s services are analytical and workflow tools only and do not constitute legal, coding, billing, or compliance advice.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">9. Confidentiality</h2>
            <p>Each party agrees to keep confidential the other party&apos;s non-public business information disclosed in connection with this Agreement. MedicalRouter will use reasonable and appropriate administrative, technical, and organizational safeguards to protect non-public Client information, including uploaded billing data, against unauthorized access, use, or disclosure. Client data will be used only as necessary to provide, maintain, secure, support, and improve the service.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">10. Limitation of Liability</h2>
            <p className="uppercase text-xs leading-relaxed">TO THE MAXIMUM EXTENT PERMITTED BY LAW, MEDICALROUTER&apos;S TOTAL LIABILITY UNDER THIS AGREEMENT SHALL NOT EXCEED THE AMOUNT OF THE SETUP FEE PAID BY THE CLIENT. MEDICALROUTER SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR RELATED TO THIS AGREEMENT OR THE SERVICES PROVIDED HEREUNDER.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">11. Governing Law</h2>
            <p>This Agreement shall be governed by and construed in accordance with the laws of <span className="rounded bg-yellow-100 px-1 text-yellow-800 font-medium">the state in which the Client's principal place of business is located, or, if the parties cannot agree, the State of Delaware</span>, without regard to conflict of law principles.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">12. Entire Agreement</h2>
            <p>This Agreement, together with the MedicalRouter Terms of Use and Privacy Policy, constitutes the entire agreement between the parties with respect to the subject matter hereof and supersedes all prior discussions, representations, and agreements. Any modification to this Agreement must be in writing and signed by both parties.</p>
          </section>

        </div>

        {/* Signature block */}
        <div className="mt-12 rounded-xl border border-zinc-200 bg-white px-6 py-6 sm:px-8">
          <h2 className="mb-6 text-base font-semibold text-zinc-900">Acknowledgment and Signature</h2>
          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">Service Provider</p>
              <div className="mb-3 border-b border-zinc-300 pb-1">
                <p className="text-xs text-zinc-400">Authorized Signature</p>
              </div>
              <div className="mb-3 border-b border-zinc-300 pb-1">
                <p className="text-xs text-zinc-400">Printed Name &amp; Title</p>
              </div>
              <div className="border-b border-zinc-300 pb-1">
                <p className="text-xs text-zinc-400">Date</p>
              </div>
            </div>
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">Client (Practice / Clinic)</p>
              <div className="mb-3 border-b border-zinc-300 pb-1">
                <p className="text-xs text-zinc-400">Authorized Signature</p>
              </div>
              <div className="mb-3 border-b border-zinc-300 pb-1">
                <p className="text-xs text-zinc-400">Printed Name &amp; Title</p>
              </div>
              <div className="border-b border-zinc-300 pb-1">
                <p className="text-xs text-zinc-400">Date</p>
              </div>
            </div>
          </div>
          <p className="mt-6 text-xs text-zinc-400">
            By signing above, both parties agree to the terms of this MedicalRouter Pilot Services Agreement, including the non-refundable $500 setup fee, the 25% success fee on recovered amounts, the 7-day payment obligation, and the 12-month Recovery Window.
          </p>
        </div>

        {/* CTA */}
        <div className="mt-8 rounded-lg border border-blue-100 bg-blue-50 px-6 py-5">
          <p className="mb-3 text-sm font-semibold text-blue-900">Ready to start the pilot?</p>
          <p className="mb-4 text-sm text-blue-800">
            Payment of the $500 setup fee constitutes your agreement to these commercial terms.
            Review this agreement before completing checkout.
          </p>
          <Link
            href="/pilot"
            className="inline-block rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Start a 30-Day Pilot — $500 →
          </Link>
        </div>

      </main>

      {/* ── Footer ── */}
      <footer className="border-t bg-white px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-xs text-zinc-400 sm:flex-row">
          <p>© {new Date().getFullYear()} MedicalRouter. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-5">
            <Link href="/" className="hover:text-zinc-600">Home</Link>
            <Link href="/pilot" className="font-medium text-blue-700 underline hover:text-blue-900">30-Day Pilot — $500</Link>
            <Link href="/faq" className="hover:text-zinc-600">FAQ</Link>
            <Link href="/terms" className="hover:text-zinc-600">Terms of Use</Link>
            <Link href="/privacy" className="hover:text-zinc-600">Privacy Policy</Link>
            <Link href="/service-agreement" className="font-medium text-zinc-700 hover:text-zinc-900">Service Agreement</Link>
            <Link href="/login" className="hover:text-zinc-600">Sign in</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
