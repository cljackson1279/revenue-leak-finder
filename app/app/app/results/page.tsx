'use client'
import { useEffect, useState, Suspense, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
  status: string
  created_at: string
}

function ResultsContent() {
  const supabase = getSupabase()
  const searchParams = useSearchParams()
  const router = useRouter()
  const uploadId = searchParams.get('upload_id')

  const [findings, setFindings] = useState<Finding[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [filterType, setFilterType] = useState<string>('')
  const [filterConfidence, setFilterConfidence] = useState<string>('')
  const [filterPayer, setFilterPayer] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')

  const loadFindings = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }

      const { data: accountUser } = await supabase
        .from('account_users')
        .select('account_id')
        .eq('user_id', session.user.id)
        .single()

      if (!accountUser) { setLoading(false); return }

      let query = supabase
        .from('findings')
        .select('*')
        .eq('account_id', accountUser.account_id)
        .order('underpayment_amount', { ascending: false, nullsFirst: false })

      if (uploadId) query = query.eq('upload_id', uploadId)
      if (filterType) query = query.eq('finding_type', filterType)
      if (filterConfidence) query = query.eq('confidence', filterConfidence)
      if (filterPayer) query = query.eq('payer', filterPayer)
      if (filterStatus) query = query.eq('status', filterStatus)

      query = query.limit(200)

      const { data, error: fetchError } = await query

      if (fetchError) {
        setError(fetchError.message)
      } else {
        setFindings(data || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load findings')
    } finally {
      setLoading(false)
    }
  }, [uploadId, filterType, filterConfidence, filterPayer, filterStatus])

  useEffect(() => {
    loadFindings()
  }, [loadFindings])

  const totalRecovery = findings
    .filter(f => f.underpayment_amount && f.underpayment_amount > 0)
    .reduce((s, f) => s + (f.underpayment_amount || 0), 0)

  const formatCurrency = (amount: number | null) =>
    amount != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount) : '—'

  const handleExportCSV = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const params = new URLSearchParams()
    if (uploadId) params.set('upload_id', uploadId)
    if (filterType) params.set('finding_type', filterType)
    if (filterConfidence) params.set('confidence', filterConfidence)
    if (filterPayer) params.set('payer', filterPayer)
    if (filterStatus) params.set('status', filterStatus)

    const res = await fetch(`/api/export-csv?${params.toString()}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })

    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `findings-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleExportPDF = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const body: Record<string, unknown> = {}
    if (uploadId) body.upload_id = uploadId

    const res = await fetch('/api/appeal-packet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `appeal-packet-${new Date().toISOString().split('T')[0]}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const uniquePayers = [...new Set(findings.map(f => f.payer).filter(Boolean))]

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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Results</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {uploadId ? 'Findings for selected upload' : 'All findings across uploads'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={findings.length === 0}>
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={findings.length === 0}>
            Appeal Packet PDF
          </Button>
        </div>
      </div>

      {/* Summary Card */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Total Potential Recovery</p>
          <p className="text-3xl font-semibold tracking-tight text-green-700">
            {formatCurrency(totalRecovery)}
          </p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Findings</p>
          <p className="text-3xl font-semibold tracking-tight">{findings.length}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Payers</p>
          <p className="text-3xl font-semibold tracking-tight">{uniquePayers.length}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6 p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Type</label>
            <select
              className="rounded border px-2 py-1 text-sm"
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="">All</option>
              <option value="UNDERPAID">Underpaid</option>
              <option value="DENIED_APPEALABLE">Appealable Denial</option>
              <option value="DENIED_NON_APPEALABLE">Non-Appealable</option>
              <option value="NEEDS_REVIEW">Needs Review</option>
              <option value="INCOMPLETE_DATA">Incomplete Data</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Confidence</label>
            <select
              className="rounded border px-2 py-1 text-sm"
              value={filterConfidence}
              onChange={e => setFilterConfidence(e.target.value)}
            >
              <option value="">All</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Payer</label>
            <select
              className="rounded border px-2 py-1 text-sm"
              value={filterPayer}
              onChange={e => setFilterPayer(e.target.value)}
            >
              <option value="">All</option>
              {uniquePayers.map(p => (
                <option key={p} value={p || ''}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Status</label>
            <select
              className="rounded border px-2 py-1 text-sm"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="">All</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Error */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">Could not load findings: {error}</p>
        </Card>
      )}

      {/* Empty State */}
      {!loading && findings.length === 0 && !error && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            {uploadId
              ? 'No findings for this upload. Try running analysis again.'
              : 'No findings yet. Upload and analyze files to see results.'}
          </p>
        </Card>
      )}

      {/* Findings Table */}
      {!loading && findings.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-4 py-3 font-medium">Procedure</th>
                  <th className="px-4 py-3 font-medium">Payer</th>
                  <th className="px-4 py-3 font-medium">Service Date</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium text-right">Billed</th>
                  <th className="px-4 py-3 font-medium text-right">Allowed</th>
                  <th className="px-4 py-3 font-medium text-right">Paid</th>
                  <th className="px-4 py-3 font-medium text-right">Underpayment</th>
                  <th className="px-4 py-3 font-medium">Confidence</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {findings.map(f => (
                  <tr
                    key={f.id}
                    className="cursor-pointer border-b last:border-0 hover:bg-zinc-50"
                    onClick={() => router.push(`/app/results/${f.id}`)}
                  >
                    <td className="px-4 py-3 font-mono text-xs">{f.procedure_code || '—'}</td>
                    <td className="px-4 py-3 text-xs">{f.payer || 'Unknown'}</td>
                    <td className="px-4 py-3 text-xs">{f.service_date || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeBadgeClass(f.finding_type)}`}>
                        {f.finding_type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs">{formatCurrency(f.billed_amount)}</td>
                    <td className="px-4 py-3 text-right text-xs">{formatCurrency(f.allowed_amount)}</td>
                    <td className="px-4 py-3 text-right text-xs">{formatCurrency(f.paid_amount)}</td>
                    <td className="px-4 py-3 text-right font-medium text-red-600">
                      {f.underpayment_amount ? formatCurrency(f.underpayment_amount) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs ${
                        f.confidence === 'High' ? 'text-green-700' :
                        f.confidence === 'Medium' ? 'text-yellow-700' :
                        'text-gray-500'
                      }`}>
                        {f.confidence}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={f.status === 'open' ? 'outline' : f.status === 'resolved' ? 'default' : 'secondary'}>
                        {f.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {loading && (
        <p className="text-muted-foreground">Loading findings...</p>
      )}
    </div>
  )
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-8 sm:px-6"><p className="text-muted-foreground">Loading...</p></div>}>
      <ResultsContent />
    </Suspense>
  )
}
