import Link from 'next/link'

export const metadata = {
  title: 'Terms of Use — MedicalRouter',
  description: 'Terms of Use governing access to and use of the MedicalRouter platform.',
}

export default function TermsPage() {
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
        <h1 className="mb-2 text-4xl font-semibold tracking-tight text-zinc-900">Terms of Use</h1>
        <p className="mb-10 text-sm text-zinc-400">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <div className="prose prose-zinc max-w-none space-y-8 text-sm leading-relaxed text-zinc-700">

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">1. Acceptance of Terms</h2>
            <p>These Terms of Use govern your access to and use of the MedicalRouter website, platform, software, and related services. By accessing or using the service, you agree to be bound by these Terms. If you do not agree, do not use the service.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">2. Description of Service</h2>
            <p>MedicalRouter provides software tools that assist users in reviewing billing-related documents, identifying potential underpayments and denied claims, organizing findings, and generating draft or appeal-ready documentation. The service is intended to support billing review workflows and operational decision-making.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">3. No Legal, Coding, or Billing Guarantee</h2>
            <p>MedicalRouter does not provide legal advice, medical advice, coding advice, reimbursement guarantees, or payer-specific representation. Any findings, recommendations, calculations, categorizations, or generated documents provided through the service are informational tools only and must be independently reviewed by qualified personnel before use or submission.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">4. User Responsibilities</h2>
            <p>You agree to provide accurate account information, use the service only for lawful business purposes, upload only data and files you are authorized to use, review all outputs before relying on or submitting them, maintain the confidentiality of your login credentials, and ensure your use of the service complies with applicable laws, regulations, payer requirements, and contractual obligations.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">5. Authorized Data and Permissions</h2>
            <p>You represent and warrant that you have all necessary rights, permissions, and authority to upload, process, and use any data, documents, and files submitted to the platform, including any information relating to patients, claims, payers, providers, or billing records.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">6. Healthcare and Sensitive Information</h2>
            <p>If you upload healthcare-related or sensitive information, you are responsible for ensuring that your use of the platform is legally permitted and appropriately authorized. If a Business Associate Agreement or other specific compliance agreement is required for your use case, you should not upload regulated data until that agreement is executed and in effect, if applicable.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">7. Account Security</h2>
            <p>You are responsible for safeguarding account credentials and restricting access to authorized users only. You must promptly notify MedicalRouter of any suspected unauthorized access, compromise, or misuse of your account.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">8. Platform Outputs and Limitations</h2>
            <p>The platform may generate findings, classifications, recovery estimates, denial categorizations, deadline indicators, or draft documentation. These outputs depend on uploaded file quality, extracted data, payer coding, business rules, and available information. Outputs may be incomplete, incorrect, or require further validation. You agree not to rely on the platform as the sole basis for financial, legal, compliance, or operational action.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">9. Acceptable Use</h2>
            <p>You may not use the service for unlawful, fraudulent, deceptive, or harmful purposes; attempt to gain unauthorized access to the platform or its systems; interfere with or disrupt platform functionality; reverse engineer, scrape, copy, or exploit the service except as permitted by law; upload malicious code, malware, or harmful content; or use the service in a way that violates privacy, confidentiality, or data protection obligations.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">10. Intellectual Property</h2>
            <p>The platform, software, design, workflows, and related materials are owned by MedicalRouter or its licensors and are protected by applicable intellectual property laws. Subject to these Terms, you are granted a limited, non-exclusive, non-transferable right to access and use the service for your internal business purposes.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">11. Customer Data</h2>
            <p>As between the parties, you retain ownership of the data and files you upload to the platform. You grant MedicalRouter the rights necessary to host, process, analyze, transmit, store, back up, and display that data solely to provide, maintain, secure, support, and improve the service, and as otherwise permitted by this Privacy Policy and applicable law.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">12. Confidentiality and Data Protection</h2>
            <p>MedicalRouter will use reasonable and appropriate administrative, technical, and organizational measures designed to safeguard non-public customer information against unauthorized access, use, disclosure, loss, misuse, and alteration. MedicalRouter is designed to protect sensitive uploaded information through strong security practices, restricted internal access, and secure infrastructure controls. However, no transmission or storage system can be guaranteed completely secure.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">13. Availability and Changes</h2>
            <p>MedicalRouter may update, modify, suspend, or discontinue all or part of the service at any time. Features may change over time. No specific uptime, availability level, or feature set is guaranteed unless separately agreed in writing.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">14. Fees and Payment</h2>
            <p>If you purchase a paid offering, you agree to pay all applicable fees as presented at the time of purchase or as otherwise agreed in writing. Additional success-based fees, if applicable, will be governed by your order, service agreement, statement of work, or other written commercial terms.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">15. Termination</h2>
            <p>MedicalRouter may suspend or terminate access to the service if you violate these Terms, misuse the platform, create risk for the service or others, or fail to pay applicable fees. You may stop using the service at any time.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">16. Disclaimers</h2>
            <p className="uppercase text-xs leading-relaxed">THE SERVICE IS PROVIDED ON AN &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS. TO THE MAXIMUM EXTENT PERMITTED BY LAW, MEDICALROUTER DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, ACCURACY, AND RESULTS.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">17. Limitation of Liability</h2>
            <p className="uppercase text-xs leading-relaxed">TO THE MAXIMUM EXTENT PERMITTED BY LAW, MEDICALROUTER SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF DATA, REVENUE, PROFITS, BUSINESS OPPORTUNITY, OR GOODWILL, ARISING OUT OF OR RELATED TO THE USE OF THE SERVICE.</p>
            <p className="mt-3 uppercase text-xs leading-relaxed">TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE TOTAL LIABILITY OF MEDICALROUTER FOR ANY CLAIMS ARISING OUT OF OR RELATING TO THE SERVICE SHALL NOT EXCEED THE AMOUNT PAID BY YOU TO MEDICALROUTER FOR THE SERVICE IN THE TWELVE MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">18. Indemnification</h2>
            <p>You agree to defend, indemnify, and hold harmless MedicalRouter and its affiliates, officers, agents, and service providers from and against claims, liabilities, damages, losses, and expenses arising from your use of the service, your data, your violation of these Terms, or your violation of applicable law or third-party rights.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">19. Governing Law</h2>
            <p>These Terms shall be governed by and construed in accordance with the laws of the state in which the Client&apos;s principal place of business is located, or, if the parties cannot agree, the State of Delaware, without regard to conflict of law principles.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">20. Updates to Terms</h2>
            <p>MedicalRouter may update these Terms from time to time. Updated Terms will be effective when posted on the site. Your continued use of the service after updated Terms are posted constitutes acceptance of the revised Terms.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">21. Contact</h2>
            <p>Questions about these Terms may be directed through the contact information provided on the site: <a href="mailto:[CONTACT_EMAIL]" className="text-blue-700 underline hover:text-blue-900">[CONTACT_EMAIL]</a>.</p>
          </section>

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
            <Link href="/terms" className="font-medium text-zinc-700 hover:text-zinc-900">Terms of Use</Link>
            <Link href="/privacy" className="hover:text-zinc-600">Privacy Policy</Link>
            <Link href="/service-agreement" className="hover:text-zinc-600">Service Agreement</Link>
            <Link href="/login" className="hover:text-zinc-600">Sign in</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
