import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const SITE_URL = 'https://medicalrouter.com'
const OG_IMAGE = `${SITE_URL}/og-image.png`

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'MedicalRouter — Underpaid & Denied Claims Recovery for Medical Practices',
    template: '%s | MedicalRouter',
  },
  description:
    'MedicalRouter finds underpaid and denied claims in your 835 ERA and EOB files, calculates the net recoverable per claim, and generates ready-to-send appeal packets. $500 pilot. 25% success fee on recovered dollars only.',
  keywords: [
    'underpaid insurance claims',
    'denied claims recovery',
    'medical billing audit',
    'insurance claim appeal',
    'ERA 835 analysis',
    'EOB review',
    'revenue cycle management',
    'medical billing recovery',
    'claim denial management',
    'healthcare revenue recovery',
  ],
  authors: [{ name: 'MedicalRouter' }],
  creator: 'MedicalRouter',
  publisher: 'MedicalRouter',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: 'MedicalRouter',
    title: 'MedicalRouter — Underpaid & Denied Claims Recovery for Medical Practices',
    description:
      'Find underpaid and denied claims in your 835 ERA and EOB files. Net recoverable calculated per claim. Ready-to-send appeal packets. $500 pilot, 25% success fee on recovered dollars only.',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'MedicalRouter — Denied and Underpaid Claims Recovery',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MedicalRouter — Underpaid & Denied Claims Recovery for Medical Practices',
    description:
      'Find underpaid and denied claims in your 835 ERA and EOB files. Net recoverable per claim. Ready-to-send appeal packets. $500 pilot.',
    images: [OG_IMAGE],
    creator: '@medicalrouter',
  },
  alternates: {
    canonical: SITE_URL,
  },
  // Icons are served via Next.js App Router special files:
  //   app/favicon.ico  → browser tab favicon (16/32/48px multi-size ICO)
  //   app/icon.png     → 512x512 PNG icon
  //   app/apple-icon.png → 180x180 Apple touch icon
  // These files auto-generate the correct <link> tags — no manual icons config needed.
  manifest: '/manifest.json',
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'MedicalRouter',
  url: SITE_URL,
  description:
    'AI-powered medical billing audit tool that identifies underpaid and denied insurance claims from 835 ERA and EOB documents. No upfront cost — you only pay when money is recovered.',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: 'Free audit — 25% success fee on recovered amounts only',
  },
  provider: {
    '@type': 'Organization',
    name: 'MedicalRouter',
    url: SITE_URL,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Favicon: served via app/favicon.ico, app/icon.png, app/apple-icon.png (Next.js App Router special files) */}
        {/* Explicit fallback links for maximum browser compatibility */}
        <link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48" type="image/x-icon" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="msapplication-TileImage" content="/android-chrome-192x192.png" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
