import Link from 'next/link'
import { XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Checkout Canceled — MedicalRouter',
  description: 'Your checkout was canceled. No payment was taken.',
}

export default function PilotCanceledPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">

      {/* Nav */}
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="text-base font-semibold tracking-tight text-zinc-900">
            MedicalRouter
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="flex flex-1 items-center justify-center px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-lg text-center">
          <div className="mb-6 flex justify-center">
            <XCircle className="h-16 w-16 text-zinc-300" />
          </div>
          <h1 className="mb-3 text-3xl font-semibold tracking-tight text-zinc-900">
            Checkout was canceled
          </h1>
          <p className="mb-2 text-lg text-zinc-600">
            No payment was taken. Your card was not charged.
          </p>
          <p className="mb-8 text-sm leading-relaxed text-zinc-500">
            If you have questions about the pilot offer or want to talk through whether it is
            right for your practice, email us at{' '}
            <a
              href="mailto:chris@medicalrouter.com"
              className="text-blue-700 underline hover:text-blue-900"
            >
              chris@medicalrouter.com
            </a>{' '}
            or book a demo.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/pilot">
              <Button className="w-full bg-blue-700 text-white hover:bg-blue-800 sm:w-auto">
                Return to pilot page
              </Button>
            </Link>
            <a href="mailto:chris@medicalrouter.com">
              <Button variant="outline" className="w-full sm:w-auto">
                Contact us
              </Button>
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white px-4 py-6 sm:px-6">
        <p className="text-center text-xs text-zinc-400">
          © {new Date().getFullYear()} MedicalRouter. All rights reserved.
        </p>
      </footer>

    </div>
  )
}
