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
// NOTE: /og-image-icon.png is a temporary OG image (square).
// Replace with a 1200×630 PNG at /public/og-image.png for proper social previews.
const OG_IMAGE = `${SITE_URL}/og-image-icon.png`

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'MedicalRouter — Denied & Underpaid Claims Recovery from ERA and EOB Files',
    template: '%s | MedicalRouter',
  },
  description:
    'Find denied claims, underpayments, and billing errors in your ERA and EOB files. MedicalRouter surfaces recoverable dollars claim by claim and generates appeal-ready findings for your billing team.',
  keywords: [
    'denied claims recovery',
    'underpaid claims recovery',
    'ERA analysis',
    'EOB analysis',
    'claims revenue recovery',
    'appeal-ready claim findings',
    'medical billing audit',
    'ERA 835 analysis',
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
    title: 'MedicalRouter — Denied & Underpaid Claims Recovery from ERA and EOB Files',
    description:
      'Find denied claims, underpayments, and billing errors in your ERA and EOB files. MedicalRouter surfaces recoverable dollars claim by claim and generates appeal-ready findings.',
    images: [
      {
        url: OG_IMAGE,
        width: 512,
        height: 512,
        alt: 'MedicalRouter — Denied and Underpaid Claims Recovery from ERA and EOB Files',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MedicalRouter — Denied & Underpaid Claims Recovery from ERA and EOB Files',
    description:
      'Upload ERA or EOB files. Get a ranked list of underpayments and denied claims with appeal-ready findings. $500 pilot.',
    images: [OG_IMAGE],
    creator: '@medicalrouter',
  },
  alternates: {
    canonical: SITE_URL,
  },
  // Icons are served via Next.js App Router special files:
  //   app/favicon.ico  → browser tab favicon
  //   app/icon.png     → 512x512 PNG icon
  //   app/apple-icon.png → 180x180 Apple touch icon
  manifest: '/manifest.json',
}

// Structured data: WebApplication + Organization
// Only truthful, verifiable information. No fake reviews, ratings, or medical claims.
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'MedicalRouter',
  url: SITE_URL,
  description:
    'Claims revenue recovery tool for independent medical practices. Parses 835 ERA and EOB files to identify denied and underpaid claims, calculates net recoverable per claim, and generates ready-to-send appeal packets.',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '500',
    priceCurrency: 'USD',
    description: '$500 flat onboarding fee for a 30-day pilot. 25% success fee on recovered payer dollars only. No long-term contract.',
  },
  provider: {
    '@type': 'Organization',
    name: 'MedicalRouter',
    url: SITE_URL,
    email: 'chris@medicalrouter.com',
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
