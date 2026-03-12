'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

// ─── Signature canvas (dynamically imported to avoid SSR issues) ─────────────
import dynamic from 'next/dynamic'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SignatureCanvas = dynamic(() => import('react-signature-canvas') as any, { ssr: false }) as any

const AGREEMENT_VERSION = 'v1.0'

const AGREEMENT_TEXT = `MEDICALROUTER PILOT SERVICES AGREEMENT

This Agreement governs the commercial terms of the MedicalRouter 30-Day Pilot engagement. Review it carefully before signing.

1. SCOPE OF SERVICES

MedicalRouter agrees to provide the Client with access to its software platform and analysis services for a 30-day pilot engagement ("Pilot Period"). Services include review of uploaded billing-related documents (including 835 ERA files and PDF Explanation of Benefits documents), identification of potential underpayments, denied claims, and related recovery opportunities, and generation of findings and appeal-ready documentation to support the Client's billing team.

2. SETUP FEE — NON-REFUNDABLE

The Client agrees to pay a one-time setup fee of $500.00 USD before the Pilot Period begins and before any audit or analysis work commences. This setup fee is non-refundable under all circumstances. Payment of the setup fee is a condition precedent to MedicalRouter's obligation to perform any services under this Agreement.

3. SUCCESS FEE — 25% CONTINGENCY

In addition to the setup fee, MedicalRouter is entitled to a success fee equal to 25% of all recovered amounts from claims identified by MedicalRouter during the audit or Pilot Period, subject to the terms of this Section.

Definition of Recovery. "Recovery" means actual payment received by the Client from a payer as a direct result of an appeal, corrected claim submission, resubmission, or other follow-up action taken in connection with a claim, denial, underpayment, or reimbursement opportunity identified by MedicalRouter. Recovery does not include patient responsibility amounts (co-pays, deductibles, coinsurance) or amounts that would have been paid regardless of MedicalRouter's identification.

Basis of Fee. The 25% success fee applies to the gross recovered amount received from the payer attributable to the identified opportunity, not net of any other costs or fees.

4. 12-MONTH RECOVERY WINDOW

The success fee obligation extends for a period of 12 months from the date MedicalRouter identifies a claim, denial, underpayment, appeal opportunity, corrected claim opportunity, resubmission opportunity, or reimbursement opportunity ("Recovery Window").

This obligation survives the end of the Pilot Period. If MedicalRouter identifies an opportunity during the audit or Pilot Period, and the Client receives payer payment related to that opportunity at any point within 12 months after the date of identification — whether during or after the Pilot Period — MedicalRouter is entitled to the 25% success fee on the recovered amount.

The Client may not avoid the success fee obligation by delaying the filing of an appeal, resubmission, or corrected claim beyond the Pilot Period. The fee applies to any recovery that occurs within the 12-month Recovery Window, regardless of when the Client initiates the follow-up action, provided the underlying opportunity was identified by MedicalRouter.

5. PAYMENT OF SUCCESS FEE

The Client agrees to pay MedicalRouter's success fee within 7 calendar days of receiving a recovered payment from a payer. The Client is responsible for promptly notifying MedicalRouter of any recovery related to an identified opportunity. MedicalRouter will invoice the Client for the applicable success fee upon notification or upon MedicalRouter's own identification of a recovery event. Invoices are due and payable within 7 calendar days of issuance.

6. VERIFICATION AND DOCUMENTATION

The Client agrees to provide MedicalRouter with documentation sufficient to verify recovered amounts when requested. Acceptable documentation includes, but is not limited to:

  • Updated Electronic Remittance Advice (ERA) or 835 files
  • Explanation of Benefits (EOB) documents
  • Remittance records or payer payment confirmations
  • Billing system records reflecting the corrected or recovered payment
  • Any other supporting documentation reasonably requested by MedicalRouter

Failure to provide verification documentation does not relieve the Client of the obligation to pay the success fee on recoveries that occurred within the Recovery Window.

7. CLIENT RESPONSIBILITIES

The Client is responsible for uploading accurate and complete billing documentation; reviewing all findings, recommendations, and generated documents before use or submission; ensuring that all appeals, resubmissions, and corrected claims are reviewed, approved, and submitted by qualified billing personnel; maintaining compliance with applicable payer requirements, regulations, and contractual obligations; and notifying MedicalRouter promptly of any recovery event within the Recovery Window.

8. NO GUARANTEE OF RECOVERY

MedicalRouter does not guarantee any specific recovery outcome. Actual reimbursement results depend on payer rules, documentation quality, coding accuracy, filing deadlines, provider contract terms, and other factors outside MedicalRouter's control. MedicalRouter's services are analytical and workflow tools only and do not constitute legal, coding, billing, or compliance advice.

9. CONFIDENTIALITY

Each party agrees to keep confidential the other party's non-public business information disclosed in connection with this Agreement. MedicalRouter will use reasonable and appropriate administrative, technical, and organizational safeguards to protect non-public Client information, including uploaded billing data, against unauthorized access, use, or disclosure. Client data will be used only as necessary to provide, maintain, secure, support, and improve the service.

10. LIMITATION OF LIABILITY

TO THE MAXIMUM EXTENT PERMITTED BY LAW, MEDICALROUTER'S TOTAL LIABILITY UNDER THIS AGREEMENT SHALL NOT EXCEED THE AMOUNT OF THE SETUP FEE PAID BY THE CLIENT. MEDICALROUTER SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR RELATED TO THIS AGREEMENT OR THE SERVICES PROVIDED HEREUNDER.

11. GOVERNING LAW

This Agreement shall be governed by and construed in accordance with the laws of the state in which the Client's principal place of business is located, or, if the parties cannot agree, the State of Delaware, without regard to conflict of law principles.

12. ENTIRE AGREEMENT

This Agreement, together with the MedicalRouter Terms of Use and Privacy Policy, constitutes the entire agreement between the parties with respect to the subject matter hereof and supersedes all prior discussions, representations, and agreements. Any modification to this Agreement must be in writing and signed by both parties.

─────────────────────────────────────────────────────────────────────────────
By checking the box below and submitting your electronic signature, you acknowledge that you have read, understand, and agree to all terms of this MedicalRouter Pilot Services Agreement, including the non-refundable $500 setup fee, the 25% success fee on recovered amounts, the 7-day payment obligation, and the 12-month Recovery Window. You confirm that you are authorized to bind the practice or clinic identified above to this Agreement.
─────────────────────────────────────────────────────────────────────────────`

export default function SignAgreementPage() {
  const supabase = getSupabase()
  const router = useRouter()

  // Form state
  const [fullName, setFullName] = useState('')
  const [title, setTitle] = useState('')
  const [practiceName, setPracticeName] = useState('')
  const [checked, setChecked] = useState(false)
  const [today] = useState(() => new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))

  // Signature canvas ref
  const sigRef = useRef<any>(null)
  const [sigEmpty, setSigEmpty] = useState(true)

  // UI state
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [accountId, setAccountId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // Load user + account + pre-fill practice name
  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      setUserId(session.user.id)

      // Check if already signed current version
      const { data: existing } = await supabase
        .from('agreements')
        .select('id')
        .eq('client_id', session.user.id)
        .eq('agreement_version', AGREEMENT_VERSION)
        .maybeSingle()

      if (existing) {
        router.push('/app/dashboard')
        return
      }

      // Get account info for practice name pre-fill
      const { data: accountUser } = await supabase
        .from('account_users')
        .select('account_id')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (accountUser) {
        setAccountId(accountUser.account_id)
        const { data: account } = await supabase
          .from('accounts')
          .select('name')
          .eq('id', accountUser.account_id)
          .maybeSingle()
        if (account?.name) setPracticeName(account.name)
      }

      setLoading(false)
    }
    load()
  }, [])

  const handleSigEnd = useCallback(() => {
    setSigEmpty(sigRef.current?.isEmpty() ?? true)
  }, [])

  const clearSig = () => {
    sigRef.current?.clear()
    setSigEmpty(true)
  }

  const canSubmit = fullName.trim() && title.trim() && practiceName.trim() && checked && !sigEmpty

  const handleSubmit = async () => {
    if (!canSubmit || !userId) return
    setSubmitting(true)
    setError(null)

    try {
      // Get base64 PNG of signature
      const signatureImage = sigRef.current.getTrimmedCanvas().toDataURL('image/png')

      // Get the current session access token to send in the Authorization header
      // (Next.js App Router API routes cannot reliably read Supabase cookies server-side)
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      const accessToken = currentSession?.access_token || ''

      const res = await fetch('/api/agreements/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          title: title.trim(),
          practiceName: practiceName.trim(),
          signatureImage,
          agreementVersion: AGREEMENT_VERSION,
          accountId,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submission failed')

      router.push('/app/dashboard')
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-sm text-zinc-400">Loading agreement…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">

        {/* Header */}
        <div className="mb-8">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-blue-700">MedicalRouter</p>
          <h1 className="mb-2 text-3xl font-semibold tracking-tight text-zinc-900">
            Service Agreement
          </h1>
          <p className="text-sm text-zinc-500">
            Please read the agreement below carefully, then complete and sign the form to continue.
            You must sign before accessing any platform features.
          </p>
        </div>

        {/* Agreement text scroll box */}
        <div className="mb-8 h-72 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-6 text-sm leading-relaxed text-zinc-700 shadow-sm sm:h-80">
          <pre className="whitespace-pre-wrap font-sans">{AGREEMENT_TEXT}</pre>
        </div>

        {/* Form */}
        <div className="space-y-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">

          {/* Full Legal Name */}
          <div>
            <Label htmlFor="fullName" className="mb-1.5 block text-sm font-medium text-zinc-800">
              Full Legal Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="e.g. Jane A. Smith"
              className="w-full"
            />
          </div>

          {/* Title / Role */}
          <div>
            <Label htmlFor="title" className="mb-1.5 block text-sm font-medium text-zinc-800">
              Title / Role at Practice <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Practice Manager, Physician Owner"
              className="w-full"
            />
          </div>

          {/* Practice Legal Name */}
          <div>
            <Label htmlFor="practiceName" className="mb-1.5 block text-sm font-medium text-zinc-800">
              Practice Legal Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="practiceName"
              value={practiceName}
              onChange={e => setPracticeName(e.target.value)}
              placeholder="Legal name of the practice or clinic"
              className="w-full"
            />
            <p className="mt-1 text-xs text-zinc-400">Auto-populated from your account — edit if needed.</p>
          </div>

          {/* Date */}
          <div>
            <Label className="mb-1.5 block text-sm font-medium text-zinc-800">Date</Label>
            <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
              {today}
            </div>
            <p className="mt-1 text-xs text-zinc-400">Auto-populated with today&apos;s date. Not editable.</p>
          </div>

          {/* Signature canvas */}
          <div>
            <Label className="mb-1.5 block text-sm font-medium text-zinc-800">
              Signature <span className="text-red-500">*</span>
            </Label>
            <p className="mb-2 text-xs text-zinc-400">Draw your signature below using your mouse or finger.</p>
            <div className="relative overflow-hidden rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50">
              <SignatureCanvas
                ref={sigRef}
                onEnd={handleSigEnd}
                penColor="#1e3a5f"
                canvasProps={{
                  className: 'w-full',
                  style: { height: '140px', touchAction: 'none' },
                }}
              />
              {sigEmpty && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="text-sm text-zinc-300">Sign here</span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={clearSig}
              className="mt-2 text-xs text-zinc-400 underline hover:text-zinc-600"
            >
              Clear signature
            </button>
          </div>

          {/* Checkbox */}
          <div className="flex items-start gap-3">
            <input
              id="agree"
              type="checkbox"
              checked={checked}
              onChange={e => setChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-zinc-300 accent-blue-700"
            />
            <label htmlFor="agree" className="cursor-pointer text-sm leading-relaxed text-zinc-700">
              I have read, understood, and agree to the terms of this Service Agreement on behalf of the practice named above.
            </label>
          </div>

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50"
            size="lg"
          >
            {submitting ? 'Submitting…' : 'Submit Agreement'}
          </Button>

          <p className="text-center text-xs text-zinc-400">
            Agreement version {AGREEMENT_VERSION} · {today}
          </p>
        </div>
      </div>
    </div>
  )
}
