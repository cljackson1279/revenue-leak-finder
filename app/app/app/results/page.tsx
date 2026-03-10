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

// Status groups
const OPEN_STATUSES = ['open']
const CLOSED_STATUSES = ['resolved', 'ignored', 'closed']

function ResultsContent() {
  const supabase = getSupabase()
  const searchParams = useSearchParams()
  const router = useRouter()
  const uploadId = searchParams.get('upload_id')

  const [findings, setFindings] = useState<Finding[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [generatingId, setGeneratingId] = useState<string | null>(null)

  // Tab: 'open' | 'closed'
  const [activeTab, setActiveTab] = useState<'open' | 'closed'>('open')

  // Filters (applied within the active tab)
  const [filterType, setFilterType] = useState<string>('')
  const [filterConfidence, setFilterConfidence] = useState<string>('')
  const [filterPayer, setFilterPayer] = useState<string>('')

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

      query = query.limit(500)

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
  }, [uploadId, filterType, filterConfidence, filterPayer])

  useEffect(() => {
    loadFindings()
  }, [loadFindings])

  const updateStatus = async (findingId: string, newStatus: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setUpdatingId(findingId)
    const { error: updateError } = await supabase
      .from('findings')
      .update({ status: newStatus })
      .eq('id', findingId)

    if (!updateError) {
      setFindings(prev => prev.map(f => f.id === findingId ? { ...f, status: newStatus } : f))
    }
    setUpdatingId(null)
  }

  const handleGenerateLetter = async (finding: Finding, e: React.MouseEvent) => {
    e.stopPropagation()
    setGeneratingId(finding.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch('/api/appeal-packet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ finding_ids: [finding.id] }),
      })

      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `appeal-${finding.procedure_code || finding.id}-${new Date().toISOString().split('T')[0]}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        const err = await res.json().catch(() => ({}))
        alert(`Failed to generate letter: ${err.error || res.statusText}`)
      }
    } finally {
      setGeneratingId(null)
    }
  }

  const handleExportCSV = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const params = new URLSearchParams()
    if (uploadId) params.set('upload_id', uploadId)
    if (filterType) params.set('finding_type', filterType)
    if (filterConfidence) params.set('confidence', filterConfidence)
    if (filterPayer) params.set('payer', filterPayer)

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
    } else {
      const err = await res.json().catch(() => ({}))
      alert(`Failed to generate packet: ${err.error || res.statusText}`)
    }
  }

  // Split findings into open vs closed
  const openFindings = findings.filter(f => OPEN_STATUSES.includes(f.status))
  const closedFindings = findings.filter(f => CLOSED_STATUSES.includes(f.status))
  const displayFindings = activeTab === 'open' ? openFindings : closedFindings

  // Totals — only count open findings for "potential recovery"
  const totalPotentialRecovery = openFindings
    .filter(f => (f.underpayment_amount ?? 0) > 0)
    .reduce((s, f) => s + (f.underpayment_amount || 0), 0)

  // Total recovered = sum of underpayment_amount on resolved/closed findings
  const totalRecovered = closedFindings
    .filter(f => f.status === 'resolved' || f.status === 'closed')
    .filter(f => (f.underpayment_amount ?? 0) > 0)
    .reduce((s, f) => s + (f.underpayment_amount || 0), 0)

  const formatCurrency = (amount: number | null) =>
    amount != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount) : '—'

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

  const statusBadgeVariant = (status: string) => {
    if (status === 'open') return 'outline'
    if (status === 'resolved' || status === 'closed') return 'default'
    return 'secondary'
  }

  const isAppealable = (type: string) =>
    type === 'UNDERPAID' || type === 'DENIED_APPEALABLE'

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
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
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={openFindings.length === 0}>
            Appeal Packet PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Potential Recovery</p>
          <p className="text-2xl font-semibold tracking-tight text-green-700">
            {formatCurrency(totalPotentialRecovery)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{openFindings.length} open findings</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Total Recovered</p>
          <p className="text-2xl font-semibold tracking-tight text-blue-700">
            {formatCurrency(totalRecovered)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{closedFindings.filter(f => f.status === 'resolved' || f.status === 'closed').length} resolved</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Open Findings</p>
          <p className="text-2xl font-semibold tracking-tight">{openFindings.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {openFindings.filter(f => isAppealable(f.finding_type)).length} appealable
          </p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Payers</p>
          <p className="text-2xl font-semibold tracking-tight">{uniquePayers.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">across all findings</p>
        </Card>
      </div>

      {/* Tabs: Open / Closed */}
      <div className="mb-4 flex border-b">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'open'
              ? 'border-zinc-900 text-zinc-900'
              : 'border-transparent text-muted-foreground hover:text-zinc-700'
          }`}
          onClick={() => setActiveTab('open')}
        >
          Open
          {openFindings.length > 0 && (
            <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
              {openFindings.length}
            </span>
          )}
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'closed'
              ? 'border-zinc-900 text-zinc-900'
              : 'border-transparent text-muted-foreground hover:text-zinc-700'
          }`}
          onClick={() => setActiveTab('closed')}
        >
          Closed / Completed
          {closedFindings.length > 0 && (
            <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
              {closedFindings.length}
            </span>
          )}
        </button>
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
          {(filterType || filterConfidence || filterPayer) && (
            <div className="flex items-end">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => { setFilterType(''); setFilterConfidence(''); setFilterPayer('') }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Error */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">Could not load findings: {error}</p>
        </Card>
      )}

      {/* Empty State */}
      {!loading && displayFindings.length === 0 && !error && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            {activeTab === 'open'
              ? (uploadId
                  ? 'No open findings for this upload.'
                  : 'No open findings. Upload and analyze files to see results.')
              : 'No closed findings yet. Resolve or close open findings to move them here.'}
          </p>
        </Card>
      )}

      {/* Findings Table */}
      {!loading && displayFindings.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-4 py-3 font-medium">Procedure</th>
                  <th className="px-4 py-3 font-medium">Payer</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium text-right">Billed</th>
                  <th className="px-4 py-3 font-medium text-right">Paid</th>
                  <th className="px-4 py-3 font-medium text-right">Recovery</th>
                  <th className="px-4 py-3 font-medium">Conf.</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayFindings.map(f => (
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
                    <td className="px-4 py-3 text-right text-xs">{formatCurrency(f.paid_amount)}</td>
                    <td className="px-4 py-3 text-right font-medium text-red-600">
                      {f.underpayment_amount && f.underpayment_amount > 0
                        ? formatCurrency(f.underpayment_amount)
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs ${
                        f.confidence === 'High' ? 'text-green-700 font-medium' :
                        f.confidence === 'Medium' ? 'text-yellow-700' :
                        'text-gray-500'
                      }`}>
                        {f.confidence}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusBadgeVariant(f.status)}>
                        {f.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div
                        className="flex items-center gap-1"
                        onClick={e => e.stopPropagation()}
                      >
                        {/* Open tab actions */}
                        {activeTab === 'open' && (
                          <>
                            {isAppealable(f.finding_type) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                disabled={generatingId === f.id}
                                onClick={e => handleGenerateLetter(f, e)}
                              >
                                {generatingId === f.id ? '...' : 'Letter'}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-green-700 hover:bg-green-50"
                              disabled={updatingId === f.id}
                              onClick={e => updateStatus(f.id, 'resolved', e)}
                            >
                              Resolve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-blue-700 hover:bg-blue-50"
                              disabled={updatingId === f.id}
                              onClick={e => updateStatus(f.id, 'closed', e)}
                            >
                              Close
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-muted-foreground hover:bg-zinc-100"
                              disabled={updatingId === f.id}
                              onClick={e => updateStatus(f.id, 'ignored', e)}
                            >
                              Ignore
                            </Button>
                          </>
                        )}

                        {/* Closed tab actions */}
                        {activeTab === 'closed' && (
                          <>
                            {isAppealable(f.finding_type) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                disabled={generatingId === f.id}
                                onClick={e => handleGenerateLetter(f, e)}
                              >
                                {generatingId === f.id ? '...' : 'Letter'}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-muted-foreground hover:bg-zinc-100"
                              disabled={updatingId === f.id}
                              onClick={e => updateStatus(f.id, 'open', e)}
                            >
                              Reopen
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Separator />
          <div className="px-4 py-3 text-xs text-muted-foreground">
            Showing {displayFindings.length} {activeTab === 'open' ? 'open' : 'closed'} finding{displayFindings.length !== 1 ? 's' : ''}.
            Click any row to view full detail.
          </div>
        </Card>
      )}
    </div>
  )
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading results...</p>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  )
}
