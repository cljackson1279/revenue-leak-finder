import type { Metadata } from 'next'
import FaqPage from './FaqPage'

export const metadata: Metadata = {
  title: 'FAQ — MedicalRouter',
  description:
    'Answers to common questions about MedicalRouter: how the denied and underpaid claims audit works, what the $500 pilot covers, the 25% success fee, data security, and supported file formats.',
  keywords: [
    'medical billing audit FAQ',
    'denied claims recovery questions',
    'underpaid insurance claims help',
    'MedicalRouter FAQ',
    '835 ERA EOB audit questions',
  ],
  alternates: {
    canonical: 'https://medicalrouter.com/faq',
  },
  openGraph: {
    url: 'https://medicalrouter.com/faq',
    title: 'FAQ — MedicalRouter',
    description:
      'Common questions about MedicalRouter: denied claims recovery, the $500 pilot, the 25% success fee, and data security.',
  },
}

export default function Page() {
  return <FaqPage />
}
