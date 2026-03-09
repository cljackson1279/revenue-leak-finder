'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

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
  carc_codes: string[] | null
  rarc_codes: string[] | null
  evidence: Record<string, unknown> | null
  status: string
  created_at: string
  updated_at: string
  upload_id: string
}

export default function FindingDetailPage() {
  const supabase = getSupabase()
  const params = useParams()
  const router = useRouter()
  const findingId = params.id as string

  const [finding, setFinding] = useState<Finding | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

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

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2">
            &larr; Back to results
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            Finding: {finding.procedure_code || 'N/A'}
          </h1>
          <div className="mt-1 flex items-center gap-3">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeBadgeClass(finding.finding_type)}`}>
              {finding.finding_type.replace(/_/g, ' ')}
            </span>
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
        {finding.underpayment_amount && finding.underpayment_amount > 0 && (
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Underpayment</p>
            <p className="text-3xl font-semibold text-red-600">
              {formatCurrency(finding.underpayment_amount)}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-6">
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
              <p className="text-xs text-muted-foreground">CARC Codes</p>
              <p className="font-mono text-sm">{finding.carc_codes?.join(', ') || '—'}</p>
            </div>
          </div>
        </Card>

        {/* Math Trace */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-medium">Math Trace</h2>
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
              <p className="text-xs text-muted-foreground">Underpayment</p>
              <p className="text-lg font-semibold text-red-600">
                {formatCurrency(finding.underpayment_amount)}
              </p>
            </div>
          </div>
          {'formula' in math && math.formula ? (
            <div className="mt-4 rounded bg-zinc-50 p-3">
              <p className="font-mono text-xs text-muted-foreground">
                Formula: {String(math.formula)}
              </p>
              {'expected_payer_payment' in math && math.expected_payer_payment != null ? (
                <p className="font-mono text-xs text-muted-foreground">
                  Expected Payer Payment: {formatCurrency(Number(math.expected_payer_payment))}
                </p>
              ) : null}
            </div>
          ) : null}
        </Card>

        {/* Rationale & Action */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-medium">Rationale</h2>
          <p className="text-sm leading-relaxed">{finding.rationale}</p>
          <Separator className="my-4" />
          <h2 className="mb-4 text-lg font-medium">Recommended Action</h2>
          <p className="text-sm leading-relaxed">{finding.action}</p>
        </Card>

        {/* Evidence (non-PHI) */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-medium">Evidence</h2>
          {'claim_id' in source && source.claim_id ? (
            <div className="mb-2">
              <span className="text-xs text-muted-foreground">Claim ID: </span>
              <span className="font-mono text-xs">{String(source.claim_id)}</span>
            </div>
          ) : null}
          {'trace_number' in source && source.trace_number ? (
            <div className="mb-2">
              <span className="text-xs text-muted-foreground">Trace Number: </span>
              <span className="font-mono text-xs">{String(source.trace_number)}</span>
            </div>
          ) : null}
          {'segment_indices' in source && source.segment_indices ? (
            <div className="mb-2">
              <span className="text-xs text-muted-foreground">Segment Indices: </span>
              <span className="font-mono text-xs">{JSON.stringify(source.segment_indices)}</span>
            </div>
          ) : null}
          {'adjustments' in codes && Array.isArray(codes.adjustments) && codes.adjustments.length > 0 ? (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Adjustments</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="px-2 py-1 text-left">Group</th>
                      <th className="px-2 py-1 text-left">CARC</th>
                      <th className="px-2 py-1 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(codes.adjustments as Array<{ group: string; code: string; amount: number }>).map((adj, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-2 py-1">{adj.group}</td>
                        <td className="px-2 py-1 font-mono">{adj.code}</td>
                        <td className="px-2 py-1 text-right">{formatCurrency(adj.amount)}</td>
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
          <h2 className="mb-4 text-lg font-medium">Status</h2>
          <div className="flex flex-wrap gap-2">
            {['open', 'in_progress', 'resolved', 'dismissed'].map(s => (
              <Button
                key={s}
                size="sm"
                variant={finding.status === s ? 'default' : 'outline'}
                onClick={() => updateStatus(s)}
                disabled={updating || finding.status === s}
              >
                {s.replace(/_/g, ' ')}
              </Button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Last updated: {new Date(finding.updated_at).toLocaleString()}
          </p>
        </Card>

        {/* Metadata */}
        <div className="text-xs text-muted-foreground">
          <p>Finding ID: {finding.id}</p>
          <p>Upload ID: {finding.upload_id}</p>
          <p>Created: {new Date(finding.created_at).toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}
