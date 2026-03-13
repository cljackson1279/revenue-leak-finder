import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — MedicalRouter',
  description:
    'MedicalRouter Privacy Policy: how we collect, use, and protect your data. We do not sell personal information. Learn how your uploaded billing documents are handled.',
  alternates: { canonical: 'https://medicalrouter.com/privacy' },
  openGraph: {
    url: 'https://medicalrouter.com/privacy',
    title: 'Privacy Policy — MedicalRouter',
    description: 'How MedicalRouter collects, uses, and protects your data.',
  },
  robots: { index: true, follow: false },
}

export default function PrivacyPage() {
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
        <h1 className="mb-2 text-4xl font-semibold tracking-tight text-zinc-900">Privacy Policy</h1>
        <p className="mb-10 text-sm text-zinc-400">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <div className="space-y-8 text-sm leading-relaxed text-zinc-700">

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">1. Introduction</h2>
            <p>MedicalRouter respects your privacy and is committed to protecting the information you provide through the website and platform. This Privacy Policy explains what information we collect, how we use it, how we protect it, and the choices available to you.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">2. Information We Collect</h2>
            <p className="mb-3">We may collect account and contact information, uploaded content and customer data, technical and usage information, and payment-related information necessary to provide and operate the service.</p>

            <h3 className="mb-2 font-semibold text-zinc-800">Account and Contact Information</h3>
            <p className="mb-3">This may include name, business name, email address, phone number, billing information, login credentials, and account identifiers.</p>

            <h3 className="mb-2 font-semibold text-zinc-800">Uploaded Content and Customer Data</h3>
            <p className="mb-3">This may include files uploaded to the platform, including EOBs, ERAs, 835 files, related billing documentation, provider, payer, claims, billing, and operational information contained in uploaded files, as well as user-entered notes, statuses, and workflow data.</p>

            <h3 className="mb-2 font-semibold text-zinc-800">Technical and Usage Information</h3>
            <p className="mb-3">This may include IP address, browser type, device information, log data, pages visited, actions taken in the platform, timestamps, and session information.</p>

            <h3 className="mb-2 font-semibold text-zinc-800">Payment Information</h3>
            <p>Payments may be processed by third-party payment processors. MedicalRouter may receive transaction metadata such as payment status, billing contact details, and partial payment identifiers, but does not necessarily store full payment card information directly.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">3. How We Use Information</h2>
            <p>We may use information to provide, operate, maintain, authenticate, secure, and support the platform; process uploaded files and generate findings; create reports, exports, and documentation; improve features, performance, accuracy, and reliability; prevent fraud, abuse, and security incidents; process payments; and comply with legal obligations.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">4. How We Share Information</h2>
            <p className="mb-3 font-semibold text-zinc-900">MedicalRouter does not sell your personal information.</p>
            <p>We may share information with service providers and infrastructure vendors who help host, secure, analyze, or operate the platform; with payment processors to handle transactions; when required by law, legal process, or governmental request; to protect rights, safety, security, and property; and in connection with a merger, acquisition, restructuring, financing, or sale of assets, subject to appropriate protections where required.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">5. Data Security</h2>
            <p>MedicalRouter uses administrative, technical, and organizational safeguards designed to protect uploaded information and limit unauthorized access. These safeguards are designed to protect data to the highest extent reasonably practicable. MedicalRouter is designed to safeguard sensitive business and healthcare-related billing information using strong security practices and controlled access. However, no method of transmission over the internet or method of electronic storage is completely secure, and absolute security cannot be guaranteed.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">6. Sensitive and Healthcare-Related Data</h2>
            <p>The platform may process healthcare-related billing data and other sensitive business information uploaded by users. MedicalRouter treats such information with heightened care and limits access to it to the extent reasonably necessary to provide and support the service. Users are responsible for ensuring they have the right to upload and process such data and for determining whether additional contractual or regulatory requirements apply to their use of the platform.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">7. Data Retention</h2>
            <p>MedicalRouter retains information for as long as reasonably necessary to provide the service, comply with legal obligations, resolve disputes, enforce agreements, maintain security, and support legitimate business operations. Retention periods may vary depending on the type of data, customer relationship, technical needs, and legal requirements.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">8. Data Access and Controls</h2>
            <p>Depending on the service design and applicable law, users may be able to access, update, or delete certain account information. You may also contact MedicalRouter regarding questions about your information or account data.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">9. Cookies and Analytics</h2>
            <p>MedicalRouter may use cookies, similar technologies, and analytics tools to support authentication, maintain sessions, improve performance, understand usage patterns, and enhance the user experience. You can manage certain cookie preferences through your browser settings, though doing so may affect platform functionality.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">10. Third-Party Services</h2>
            <p>The platform may rely on third-party providers for hosting, storage, authentication, analytics, communications, or payment processing. Those providers may process information on MedicalRouter&apos;s behalf subject to their own terms and privacy practices.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">11. International Transfers</h2>
            <p>If information is transferred, stored, or processed outside your state, province, or country, MedicalRouter will take reasonable steps to ensure appropriate safeguards are in place consistent with applicable law.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">12. Children&apos;s Privacy</h2>
            <p>MedicalRouter is intended for business use and is not directed to children under 13. MedicalRouter does not knowingly collect personal information directly from children.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">13. Changes to This Privacy Policy</h2>
            <p>MedicalRouter may update this Privacy Policy from time to time. When updated, the revised version will be posted on the site with a revised effective date where appropriate.</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">14. Contact</h2>
            <p>If you have questions about this Privacy Policy or your data, you may contact MedicalRouter using the contact information provided on the site: <a href="mailto:chris@medicalrouter.com" className="text-blue-700 underline hover:text-blue-900">chris@medicalrouter.com</a>.</p>
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
            <Link href="/terms" className="hover:text-zinc-600">Terms of Use</Link>
            <Link href="/privacy" className="font-medium text-zinc-700 hover:text-zinc-900">Privacy Policy</Link>
            <Link href="/service-agreement" className="hover:text-zinc-600">Service Agreement</Link>
            <Link href="/login" className="hover:text-zinc-600">Sign in</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
