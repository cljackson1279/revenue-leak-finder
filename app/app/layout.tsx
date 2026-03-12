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
    default: 'MedicalRouter — AI-Powered Denied & Underpaid Claims Recovery',
    template: '%s | MedicalRouter',
  },
  description:
    'MedicalRouter uses AI to find underpaid and denied insurance claims your practice never appealed. Upload your 835 ERA or EOB. Free audit. You only pay when we recover your money.',
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
    title: 'MedicalRouter — AI-Powered Denied & Underpaid Claims Recovery',
    description:
      'Find underpaid and denied insurance claims your practice never appealed. Free audit. You only pay when we recover your money.',
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
    title: 'MedicalRouter — AI-Powered Denied & Underpaid Claims Recovery',
    description:
      'Find underpaid and denied insurance claims your practice never appealed. Free audit. You only pay when we recover your money.',
    images: [OG_IMAGE],
    creator: '@medicalrouter',
  },
  alternates: {
    canonical: SITE_URL,
  },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'mask-icon', url: '/icon-192x192.png' },
    ],
  },
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
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="msapplication-TileImage" content="/icon-192x192.png" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
