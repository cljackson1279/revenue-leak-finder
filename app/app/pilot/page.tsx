import type { Metadata } from 'next'
import PilotPage from './PilotPage'

export const metadata: Metadata = {
  title: '30-Day Revenue Recovery Pilot — $500 Onboarding | MedicalRouter',
  description:
    'Start a 30-day pilot: MedicalRouter audits your denied and underpaid claims, generates appeal letters, and tracks recovery. $500 setup fee. 25% success fee on money recovered — nothing if we find nothing.',
  keywords: [
    'denied claims recovery pilot',
    'medical billing audit service',
    'underpaid insurance claims',
    'insurance appeal service',
    'revenue recovery healthcare',
    'medical billing recovery service',
    '835 ERA audit',
    'EOB review service',
  ],
  alternates: {
    canonical: 'https://medicalrouter.com/pilot',
  },
  openGraph: {
    url: 'https://medicalrouter.com/pilot',
    title: '30-Day Revenue Recovery Pilot — MedicalRouter',
    description:
      '$500 setup. 25% success fee on recovered amounts only. MedicalRouter audits your denied and underpaid claims and generates ready-to-send appeal letters.',
  },
}

export default function Page() {
  return <PilotPage />
}
