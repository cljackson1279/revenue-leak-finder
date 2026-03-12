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

const AGREEMENT_TEXT = `SERVICE AGREEMENT TEXT GOES HERE

[This is a placeholder. Replace this entire block with your final MedicalRouter Pilot Services Agreement text before going live. The full agreement text will be displayed here for the client to read before signing.]

Key terms summary (placeholder):
• $500 non-refundable onboarding fee
• 25% success fee on recovered payer amounts
• 7-day payment obligation on recovered amounts
• 12-month recovery window from date of identification
• Agreement governed by [GOVERNING STATE]
• Signed electronically by the authorized representative of the practice`

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

      const res = await fetch('/api/agreements/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
