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
  denial_amount: number | null
  denial_category: string | null
  appeal_status: string | null
  appeal_by_date: string | null
  appeal_deadline_days: number | null
  carc_codes: string[] | null
  rarc_codes: string[] | null
  status: string
  created_at: string
}

const OPEN_STATUSES = ['open']
const CLOSED_STATUSES = ['resolved', 'ignored', 'closed']

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
  const [updatingAppealId, setUpdatingAppealId] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<'open' | 'closed'>('open')

  const [filterType, setFilterType] = useState<string>('')
  const [filterConfidence, setFilterConfidence] = useState<string>('')
  const [filterPayer, setFilterPayer] = useState<string>('')
  const [filterDenialCategory, setFilterDenialCategory] = useState<string>('')

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
      if (filterDenialCategory) query = query.eq('denial_category', filterDenialCategory)

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
  }, [uploadId, filterType, filterConfidence, filterPayer, filterDenialCategory])

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

  const updateAppealStatus = async (findingId: string, newAppealStatus: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setUpdatingAppealId(findingId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/findings/appeal-status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ finding_id: findingId, appeal_status: newAppealStatus }),
      })
      if (res.ok) {
        setFindings(prev => prev.map(f => f.id === findingId ? { ...f, appeal_status: newAppealStatus } : f))
      }
    } finally {
      setUpdatingAppealId(null)
    }
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

  const openFindings = findings.filter(f => OPEN_STATUSES.includes(f.status))
  const closedFindings = findings.filter(f => CLOSED_STATUSES.includes(f.status))
  const displayFindings = activeTab === 'open' ? openFindings : closedFindings

  // Net Recoverable = sum of underpayment_amount on open UNDERPAID findings only
  const totalNetRecoverable = openFindings
    .filter(f => f.finding_type === 'UNDERPAID' && (f.underpayment_amount ?? 0) > 0)
    .reduce((s, f) => s + (f.underpayment_amount || 0), 0)

  // Denied at risk = sum of denial_amount on open DENIED_APPEALABLE findings
  const totalDeniedAtRisk = openFindings
    .filter(f => f.finding_type === 'DENIED_APPEALABLE' && (f.denial_amount ?? 0) > 0)
    .reduce((s, f) => s + (f.denial_amount || 0), 0)

  const totalRecovered = closedFindings
    .filter(f => f.status === 'resolved' || f.status === 'closed')
    .filter(f => (f.underpayment_amount ?? 0) > 0)
    .reduce((s, f) => s + (f.underpayment_amount || 0), 0)

  const formatCurrency = (amount: number | null) =>
    amount != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount) : '—'

  const uniquePayers = [...new Set(findings.map(f => f.payer).filter(Boolean))]
  const uniqueDenialCategories = [...new Set(findings.map(f => f.denial_category).filter(Boolean))]

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

  const isDenial = (type: string) =>
    type === 'DENIED_APPEALABLE' || type === 'DENIED_NON_APPEALABLE'

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
          <p className="text-sm text-muted-foreground">Net Recoverable from Payer</p>
          <p className="text-2xl font-semibold tracking-tight text-green-700">
            {formatCurrency(totalNetRecoverable)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Underpaid claims only</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Denied — Amount at Risk</p>
          <p className="text-2xl font-semibold tracking-tight text-orange-700">
            {formatCurrency(totalDeniedAtRisk)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Appealable denials pending</p>
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

      {/* Tabs */}
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
            <label className="mb-1 block text-xs text-muted-foreground">Denial Category</label>
            <select
              className="rounded border px-2 py-1 text-sm"
              value={filterDenialCategory}
              onChange={e => setFilterDenialCategory(e.target.value)}
            >
              <option value="">All</option>
              {uniqueDenialCategories.map(cat => (
                <option key={cat} value={cat || ''}>
                  {DENIAL_CATEGORY_LABELS[cat || ''] || cat}
                </option>
              ))}
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
          {(filterType || filterConfidence || filterPayer || filterDenialCategory) && (
            <div className="flex items-end">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => { setFilterType(''); setFilterConfidence(''); setFilterPayer(''); setFilterDenialCategory('') }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>
      </Card>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">Could not load findings: {error}</p>
        </Card>
      )}

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
                  <th className="px-4 py-3 font-medium">Denial Category</th>
                  <th className="px-4 py-3 font-medium text-right">Billed</th>
                  <th className="px-4 py-3 font-medium text-right">Paid</th>
                  <th className="px-4 py-3 font-medium text-right">Net Recoverable</th>
                  <th className="px-4 py-3 font-medium">Appeal Status</th>
                  <th className="px-4 py-3 font-medium">Conf.</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayFindings.map(f => {
                  const daysLeft = daysUntil(f.appeal_by_date)
                  const isUrgent = daysLeft !== null && daysLeft <= 30 && daysLeft >= 0
                  const isOverdue = daysLeft !== null && daysLeft < 0
                  const displayRecoverable = f.finding_type === 'UNDERPAID'
                    ? f.underpayment_amount
                    : f.finding_type === 'DENIED_APPEALABLE'
                    ? null // denial_amount shown separately in type badge tooltip
                    : null

                  return (
                    <tr
                      key={f.id}
                      className="cursor-pointer border-b last:border-0 hover:bg-zinc-50"
                      onClick={() => router.push(`/app/results/${f.id}`)}
                    >
                      <td className="px-4 py-3 font-mono text-xs">{f.procedure_code || '—'}</td>
                      <td className="px-4 py-3 text-xs">{f.payer || 'Unknown'}</td>
                      <td className="px-4 py-3 text-xs">
                        <div>{f.service_date || '—'}</div>
                        {/* Appeal deadline urgency */}
                        {isDenial(f.finding_type) && f.appeal_by_date && (
                          <div className={`mt-0.5 text-xs font-medium ${
                            isOverdue ? 'text-red-600' :
                            isUrgent ? 'text-orange-600' :
                            'text-gray-400'
                          }`}>
                            {isOverdue
                              ? `Appeal overdue`
                              : isUrgent
                              ? `Appeal by ${f.appeal_by_date} (${daysLeft}d)`
                              : `Appeal by ${f.appeal_by_date}`}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeBadgeClass(f.finding_type)}`}>
                          {f.finding_type.replace(/_/g, ' ')}
                        </span>
                        {/* Denied amount at risk */}
                        {isDenial(f.finding_type) && f.denial_amount && (
                          <div className="mt-1 text-xs text-orange-600 font-medium">
                            {formatCurrency(f.denial_amount)} at risk
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {f.denial_category ? (
                          <span className="inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">
                            {DENIAL_CATEGORY_LABELS[f.denial_category] || f.denial_category}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-xs">{formatCurrency(f.billed_amount)}</td>
                      <td className="px-4 py-3 text-right text-xs">{formatCurrency(f.paid_amount)}</td>
                      <td className="px-4 py-3 text-right font-medium text-red-600">
                        {displayRecoverable && displayRecoverable > 0
                          ? formatCurrency(displayRecoverable)
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {isDenial(f.finding_type) ? (
                          <div onClick={e => e.stopPropagation()}>
                            <select
                              className={`rounded-full px-2 py-0.5 text-xs font-medium border-0 cursor-pointer ${
                                APPEAL_STATUS_COLORS[f.appeal_status || 'not_filed']
                              }`}
                              value={f.appeal_status || 'not_filed'}
                              disabled={updatingAppealId === f.id}
                              onChange={e => updateAppealStatus(f.id, e.target.value, e as unknown as React.MouseEvent)}
                            >
                              {Object.entries(APPEAL_STATUS_LABELS).map(([val, label]) => (
                                <option key={val} value={val}>{label}</option>
                              ))}
                            </select>
                          </div>
                        ) : '—'}
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
                  )
                })}
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
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading results…</div>}>
      <ResultsContent />
    </Suspense>
  )
}
