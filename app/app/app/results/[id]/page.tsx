'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import carcCodes from '@/data/carc.json'
import rarcCodes from '@/data/rarc.json'

type Finding = {
  id: string
  finding_type: string
  confidence: string
  rationale: string
  action: string
  procedure_code: string | null
  payer: string | null
  service_date: string | null
  billed_amount: number | null
  allowed_amount: number | null
  paid_amount: number | null
  patient_responsibility: number | null
  underpayment_amount: number | null
  denial_amount: number | null
  denial_category: string | null
  appeal_status: string | null
  appeal_by_date: string | null
  appeal_deadline_days: number | null
  carc_codes: string[] | null
  rarc_codes: string[] | null
  evidence: Record<string, unknown> | null
  status: string
  created_at: string
  updated_at: string
  upload_id: string
}

const carcMap = carcCodes as Record<string, { description: string }>
const rarcMap = rarcCodes as Record<string, { description: string }>

function getCarcDescription(code: string): string | null {
  const normalized = code.replace(/^(CO|PR|OA|PI)-?/i, '')
  return carcMap[normalized]?.description || carcMap[code]?.description || null
}

function getRarcDescription(code: string): string | null {
  return rarcMap[code]?.description || null
}

const DENIAL_CATEGORY_LABELS: Record<string, string> = {
  medical_necessity: 'Medical Necessity',
  timely_filing: 'Timely Filing',
  bundling: 'Bundling',
  missing_info: 'Missing Info',
  authorization: 'Authorization',
  not_covered: 'Not Covered',
  duplicate_claim: 'Duplicate Claim',
  other: 'Other',
}

const APPEAL_STATUS_LABELS: Record<string, string> = {
  not_filed: 'Not Filed',
  filed: 'Filed',
  won: 'Won',
  lost: 'Lost',
  resubmitted: 'Resubmitted',
}

const APPEAL_STATUS_COLORS: Record<string, string> = {
  not_filed: 'bg-gray-100 text-gray-600',
  filed: 'bg-blue-100 text-blue-700',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
  resubmitted: 'bg-purple-100 text-purple-700',
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - new Date().getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function FindingDetailPage() {
  const supabase = getSupabase()
  const params = useParams()
  const router = useRouter()
  const findingId = params.id as string

  const [finding, setFinding] = useState<Finding | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [updatingAppeal, setUpdatingAppeal] = useState(false)
  const [generatingPacket, setGeneratingPacket] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('findings')
        .select('*')
        .eq('id', findingId)
        .single()

      if (data) setFinding(data)
      setLoading(false)
    }
    load()
  }, [findingId])

  const updateStatus = async (newStatus: string) => {
    setUpdating(true)
    const { error } = await supabase
      .from('findings')
      .update({ status: newStatus })
      .eq('id', findingId)

    if (!error && finding) {
      setFinding({ ...finding, status: newStatus })
    }
    setUpdating(false)
  }

  const updateAppealStatus = async (newAppealStatus: string) => {
    if (!finding) return
    setUpdatingAppeal(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/findings/appeal-status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ finding_id: finding.id, appeal_status: newAppealStatus }),
      })
      if (res.ok) {
        setFinding({ ...finding, appeal_status: newAppealStatus })
      }
    } finally {
      setUpdatingAppeal(false)
    }
  }

  const handleGenerateLetter = async () => {
    if (!finding) return
    setGeneratingPacket(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { alert('Session expired — please sign in again'); return }

      const res = await fetch('/api/appeal-packet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ finding_ids: [finding.id] }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'Failed to generate appeal packet')
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `appeal-${finding.procedure_code || finding.id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setGeneratingPacket(false)
    }
  }

  const formatCurrency = (amount: number | null) =>
    amount != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount) : '—'

  const typeBadgeClass = (type: string) => {
    switch (type) {
      case 'UNDERPAID': return 'bg-red-100 text-red-700'
      case 'DENIED_APPEALABLE': return 'bg-orange-100 text-orange-700'
      case 'DENIED_NON_APPEALABLE': return 'bg-gray-100 text-gray-600'
      case 'NEEDS_REVIEW': return 'bg-yellow-100 text-yellow-700'
      case 'INCOMPLETE_DATA': return 'bg-blue-100 text-blue-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const isAppealable = (type: string) =>
    type === 'UNDERPAID' || type === 'DENIED_APPEALABLE'

  const isDenial = (type: string) =>
    type === 'DENIED_APPEALABLE' || type === 'DENIED_NON_APPEALABLE'

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <p className="text-muted-foreground">Loading finding...</p>
      </div>
    )
  }

  if (!finding) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <p className="text-muted-foreground">Finding not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    )
  }

  const evidence = finding.evidence || {}
  const math = (evidence.math || {}) as Record<string, unknown>
  const source = (evidence.source || {}) as Record<string, unknown>
  const codes = (evidence.codes || {}) as Record<string, unknown>

  const daysLeft = daysUntil(finding.appeal_by_date)
  const isUrgent = daysLeft !== null && daysLeft <= 30 && daysLeft >= 0
  const isOverdue = daysLeft !== null && daysLeft < 0

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2 -ml-2">
            &larr; Back to results
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            Finding: {finding.procedure_code || 'N/A'}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeBadgeClass(finding.finding_type)}`}>
              {finding.finding_type.replace(/_/g, ' ')}
            </span>
            {finding.denial_category && (
              <span className="inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">
                {DENIAL_CATEGORY_LABELS[finding.denial_category] || finding.denial_category}
              </span>
            )}
            <span className={`text-sm ${
              finding.confidence === 'High' ? 'text-green-700' :
              finding.confidence === 'Medium' ? 'text-yellow-700' :
              'text-gray-500'
            }`}>
              {finding.confidence} confidence
            </span>
            <Badge variant={finding.status === 'open' ? 'outline' : 'default'}>
              {finding.status}
            </Badge>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {/* Underpaid: show net recoverable */}
          {finding.finding_type === 'UNDERPAID' && finding.underpayment_amount && finding.underpayment_amount > 0 && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Net Recoverable from Payer</p>
              <p className="text-3xl font-semibold text-red-600">
                {formatCurrency(finding.underpayment_amount)}
              </p>
            </div>
          )}
          {/* Denied: show amount at risk */}
          {isDenial(finding.finding_type) && finding.denial_amount && finding.denial_amount > 0 && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Amount at Risk (Denied)</p>
              <p className="text-3xl font-semibold text-orange-600">
                {formatCurrency(finding.denial_amount)}
              </p>
            </div>
          )}
          {isAppealable(finding.finding_type) && (
            <Button
              size="sm"
              onClick={handleGenerateLetter}
              disabled={generatingPacket}
            >
              {generatingPacket ? 'Generating...' : 'Generate Appeal Letter'}
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Denial-specific card */}
        {isDenial(finding.finding_type) && (
          <Card className="border-orange-200 bg-orange-50 p-6">
            <h2 className="mb-4 text-lg font-medium text-orange-900">Denial Details</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-orange-700">Denial Category</p>
                <p className="text-sm font-medium text-orange-900">
                  {finding.denial_category
                    ? (DENIAL_CATEGORY_LABELS[finding.denial_category] || finding.denial_category)
                    : 'Not classified'}
                </p>
              </div>
              <div>
                <p className="text-xs text-orange-700">Appeal Status</p>
                <div className="mt-1">
                  <select
                    className={`rounded-full px-3 py-1 text-sm font-medium border-0 cursor-pointer ${
                      APPEAL_STATUS_COLORS[finding.appeal_status || 'not_filed']
                    }`}
                    value={finding.appeal_status || 'not_filed'}
                    disabled={updatingAppeal}
                    onChange={e => updateAppealStatus(e.target.value)}
                  >
                    {Object.entries(APPEAL_STATUS_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <p className="text-xs text-orange-700">Appeal Deadline</p>
                {finding.appeal_by_date ? (
                  <div>
                    <p className={`text-sm font-medium ${
                      isOverdue ? 'text-red-700' :
                      isUrgent ? 'text-orange-700' :
                      'text-orange-900'
                    }`}>
                      {finding.appeal_by_date}
                    </p>
                    <p className={`text-xs ${
                      isOverdue ? 'text-red-600 font-semibold' :
                      isUrgent ? 'text-orange-600 font-semibold' :
                      'text-orange-700'
                    }`}>
                      {isOverdue
                        ? `Deadline passed ${Math.abs(daysLeft!)} day${Math.abs(daysLeft!) !== 1 ? 's' : ''} ago`
                        : daysLeft === 0
                        ? 'Due today'
                        : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-orange-700">
                    {finding.appeal_deadline_days
                      ? `${finding.appeal_deadline_days}-day window from DOS`
                      : 'Not set — verify with payer contract'}
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Key Details */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-medium">Claim Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Payer</p>
              <p className="text-sm font-medium">{finding.payer || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Service Date</p>
              <p className="text-sm font-medium">{finding.service_date || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Procedure Code</p>
              <p className="font-mono text-sm font-medium">{finding.procedure_code || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Upload ID</p>
              <p className="font-mono text-xs text-muted-foreground">{finding.upload_id}</p>
            </div>
          </div>
        </Card>

        {/* Math Trace */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-medium">Payment Breakdown</h2>
          <div className="grid gap-4 sm:grid-cols-5">
            <div>
              <p className="text-xs text-muted-foreground">Billed</p>
              <p className="text-lg font-medium">{formatCurrency(finding.billed_amount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Allowed</p>
              <p className="text-lg font-medium">{formatCurrency(finding.allowed_amount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Paid</p>
              <p className="text-lg font-medium">{formatCurrency(finding.paid_amount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Patient Resp.</p>
              <p className="text-lg font-medium">{formatCurrency(finding.patient_responsibility)}</p>
            </div>
            <div>
              {finding.finding_type === 'UNDERPAID' ? (
                <>
                  <p className="text-xs text-muted-foreground">Net Recoverable from Payer</p>
                  <p className="text-lg font-semibold text-red-600">
                    {formatCurrency(finding.underpayment_amount)}
                  </p>
                </>
              ) : isDenial(finding.finding_type) ? (
                <>
                  <p className="text-xs text-muted-foreground">Amount at Risk</p>
                  <p className="text-lg font-semibold text-orange-600">
                    {formatCurrency(finding.denial_amount)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Pending appeal outcome</p>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">Net Recoverable</p>
                  <p className="text-lg font-medium text-muted-foreground">—</p>
                </>
              )}
            </div>
          </div>
          {finding.finding_type === 'UNDERPAID' && (
            <div className="mt-4 rounded bg-zinc-50 p-3">
              <p className="font-mono text-xs text-muted-foreground">
                Formula: Net Recoverable = Allowed − Paid − Patient Responsibility
              </p>
              {'formula' in math && math.formula ? (
                <p className="font-mono text-xs text-muted-foreground mt-1">
                  {String(math.formula)}
                </p>
              ) : null}
            </div>
          )}
          {isDenial(finding.finding_type) && (
            <div className="mt-4 rounded bg-orange-50 p-3">
              <p className="font-mono text-xs text-orange-700">
                Note: Net Recoverable from Payer is not calculated for denied claims.
                The amount at risk reflects the billed amount. Actual recovery depends on appeal outcome.
              </p>
            </div>
          )}
        </Card>

        {/* CARC / RARC Codes */}
        {((finding.carc_codes && finding.carc_codes.length > 0) ||
          (finding.rarc_codes && finding.rarc_codes.length > 0)) && (
          <Card className="p-6">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-lg font-medium">Adjustment Reason Codes</h2>
              <span className="text-xs text-muted-foreground">
                Source:{' '}
                <a
                  href="https://www.wpc-edi.com/reference/codelists/healthcare/claim-adjustment-reason-codes/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  WPC (Washington Publishing Company)
                </a>
              </span>
            </div>
            <Separator className="mb-4" />

            {finding.carc_codes && finding.carc_codes.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  CARC — Claim Adjustment Reason Codes
                </p>
                <div className="space-y-2">
                  {finding.carc_codes.map(code => {
                    const desc = getCarcDescription(code)
                    return (
                      <div key={code} className="rounded border bg-zinc-50 px-3 py-2">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 shrink-0 font-mono text-xs font-semibold">{code}</span>
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            {desc || 'Description not available in cached code list. See WPC for current definitions.'}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {finding.rarc_codes && finding.rarc_codes.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  RARC — Remittance Advice Remark Codes
                </p>
                <div className="space-y-2">
                  {finding.rarc_codes.map(code => {
                    const desc = getRarcDescription(code)
                    return (
                      <div key={code} className="rounded border bg-zinc-50 px-3 py-2">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 shrink-0 font-mono text-xs font-semibold">{code}</span>
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            {desc || 'Description not available in cached code list. See WPC for current definitions.'}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Rationale & Action */}
        <Card className="p-6">
          <h2 className="mb-3 text-lg font-medium">Rationale</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{finding.rationale}</p>
          <Separator className="my-4" />
          <h2 className="mb-3 text-lg font-medium">Recommended Next Steps</h2>
          <p className="text-sm leading-relaxed">{finding.action}</p>
        </Card>

        {/* Evidence */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-medium">Evidence References</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Non-PHI identifiers and segment references only. No patient data stored.
          </p>

          <div className="space-y-1">
            {'claim_id' in source && source.claim_id ? (
              <div className="flex gap-2 text-xs">
                <span className="w-36 shrink-0 text-muted-foreground">Claim ID:</span>
                <span className="font-mono">{String(source.claim_id)}</span>
              </div>
            ) : null}
            {'trace_number' in source && source.trace_number ? (
              <div className="flex gap-2 text-xs">
                <span className="w-36 shrink-0 text-muted-foreground">Trace Number:</span>
                <span className="font-mono">{String(source.trace_number)}</span>
              </div>
            ) : null}
            {'payer_name' in source && source.payer_name ? (
              <div className="flex gap-2 text-xs">
                <span className="w-36 shrink-0 text-muted-foreground">Payer (N1):</span>
                <span className="font-mono">{String(source.payer_name)}</span>
              </div>
            ) : null}
            {'segment_indices' in source && source.segment_indices ? (
              <div className="flex gap-2 text-xs">
                <span className="w-36 shrink-0 text-muted-foreground">Segment Indices:</span>
                <span className="font-mono">{JSON.stringify(source.segment_indices)}</span>
              </div>
            ) : null}
          </div>

          {'adjustments' in codes && Array.isArray(codes.adjustments) && codes.adjustments.length > 0 ? (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground">CAS Adjustments</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="px-2 py-1 text-left font-medium">Group</th>
                      <th className="px-2 py-1 text-left font-medium">CARC</th>
                      <th className="px-2 py-1 text-right font-medium">Amount</th>
                      <th className="px-2 py-1 text-left font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(codes.adjustments as Array<{ group: string; code: string; amount: number }>).map((adj, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-2 py-1 font-mono">{adj.group}</td>
                        <td className="px-2 py-1 font-mono">{adj.code}</td>
                        <td className="px-2 py-1 text-right">{formatCurrency(adj.amount)}</td>
                        <td className="px-2 py-1 text-muted-foreground">
                          {getCarcDescription(adj.code) || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </Card>

        {/* Status Management */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-medium">Update Status</h2>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'open', label: 'Open' },
              { value: 'resolved', label: 'Mark Resolved' },
              { value: 'ignored', label: 'Ignore' },
            ].map(s => (
              <Button
                key={s.value}
                size="sm"
                variant={finding.status === s.value ? 'default' : 'outline'}
                onClick={() => updateStatus(s.value)}
                disabled={updating || finding.status === s.value}
              >
                {s.label}
              </Button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Last updated: {new Date(finding.updated_at || finding.created_at).toLocaleString()}
          </p>
        </Card>

        {/* Metadata */}
        <div className="text-xs text-muted-foreground">
          <p>Finding ID: <span className="font-mono">{finding.id}</span></p>
          <p>Created: {new Date(finding.created_at).toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}
