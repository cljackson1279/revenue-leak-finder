'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ─── Types ───────────────────────────────────────────────────────────────────

type AccountUser = {
  user_id: string
  role: string
  created_at: string
}

type Account = {
  id: string
  name: string
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  created_at: string
}

type UploadStats = {
  total: number
  complete: number
  error: number
  pending: number
}

type FindingStats = {
  total: number
  open: number
  resolved: number
  ignored: number
  totalRecovery: number
}

type AgreementRow = {
  id: string
  full_name: string
  title: string
  practice_name: string
  agreed_at: string
  ip_address: string | null
  agreement_version: string
  pdf_sent: boolean
  client_id: string
  account_id: string
}

type AgreementDetail = AgreementRow & {
  signature_image: string
}

// ─── Agreement View Modal ────────────────────────────────────────────────────

function AgreementModal({
  agreementId,
  onClose,
}: {
  agreementId: string
  onClose: () => void
}) {
  const supabase = getSupabase()
  const [detail, setDetail] = useState<AgreementDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const token = session?.access_token || ''
      fetch(`/api/agreements/${agreementId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
        .then(r => r.json())
        .then(d => {
          if (d.error) setError(d.error)
          else setDetail(d.agreement)
        })
        .catch(() => setError('Failed to load agreement'))
        .finally(() => setLoading(false))
    })
  }, [agreementId])

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ''
      const res = await fetch(`/api/agreements/${agreementId}/pdf?action=download`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('PDF generation failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `MedicalRouter-Agreement-${detail?.practice_name?.replace(/\s+/g, '-') || agreementId.slice(0, 8)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      alert('PDF download failed: ' + err.message)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl">
        {/* Modal header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
          <h2 className="text-lg font-semibold text-zinc-900">Signed Agreement</h2>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              disabled={downloading || !detail}
            >
              {downloading ? 'Generating…' : 'Download PDF'}
            </Button>
            <button
              onClick={onClose}
              className="ml-2 rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          {loading && <p className="text-sm text-zinc-400">Loading…</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {detail && (
            <div className="space-y-5 text-sm text-zinc-700">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">Full Legal Name</p>
                  <p className="font-medium text-zinc-900">{detail.full_name}</p>
                </div>
                <div>
                  <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">Title / Role</p>
                  <p className="font-medium text-zinc-900">{detail.title}</p>
                </div>
                <div>
                  <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">Practice Legal Name</p>
                  <p className="font-medium text-zinc-900">{detail.practice_name}</p>
                </div>
                <div>
                  <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">Date Signed</p>
                  <p className="font-medium text-zinc-900">
                    {new Date(detail.agreed_at).toLocaleString('en-US', {
                      year: 'numeric', month: 'long', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                <div>
                  <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">IP Address</p>
                  <p className="font-mono text-zinc-700">{detail.ip_address || '—'}</p>
                </div>
                <div>
                  <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">Agreement Version</p>
                  <p className="font-mono text-zinc-700">{detail.agreement_version}</p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Electronic Signature</p>
                <div className="inline-block rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={detail.signature_image}
                    alt="Electronic signature"
                    className="max-h-28 max-w-xs"
                  />
                </div>
              </div>

              <div className="rounded-lg bg-zinc-50 px-4 py-3 text-xs text-zinc-500">
                This agreement was electronically signed via MedicalRouter. The signature above is a legally binding
                electronic signature under applicable e-signature law. Agreement ID: <span className="font-mono">{detail.id}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Admin Page ─────────────────────────────────────────────────────────

export default function AdminPage() {
  const supabase = getSupabase()

  const [account, setAccount] = useState<Account | null>(null)
  const [users, setUsers] = useState<AccountUser[]>([])
  const [uploadStats, setUploadStats] = useState<UploadStats | null>(null)
  const [findingStats, setFindingStats] = useState<FindingStats | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Editable settings
  const [practiceName, setPracticeName] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')

  // Agreements section state
  const [agreements, setAgreements] = useState<AgreementRow[]>([])
  const [agreementsLoading, setAgreementsLoading] = useState(false)
  const [agreementsError, setAgreementsError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [viewingAgreementId, setViewingAgreementId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { setLoading(false); return }

        setUserEmail(session.user.email || '')
        setCurrentUserId(session.user.id)

        const { data: accountUser } = await supabase
          .from('account_users')
          .select('account_id, role')
          .eq('user_id', session.user.id)
          .single()

        if (!accountUser) { setLoading(false); return }

        const adminFlag = accountUser.role === 'admin'
        setIsAdmin(adminFlag)

        // Account details
        const { data: acct } = await supabase
          .from('accounts')
          .select('*')
          .eq('id', accountUser.account_id)
          .single()

        if (acct) {
          setAccount(acct)
          setPracticeName(acct.name || '')
          setContactName(acct.contact_name || '')
          setContactPhone(acct.contact_phone || '')
          setContactEmail(acct.contact_email || '')
        }

        // All users in this account
        const { data: allUsers } = await supabase
          .from('account_users')
          .select('user_id, role, created_at')
          .eq('account_id', accountUser.account_id)
          .order('created_at', { ascending: true })

        setUsers(allUsers || [])

        // Upload stats
        const { data: uploads } = await supabase
          .from('uploads')
          .select('status')
          .eq('account_id', accountUser.account_id)

        if (uploads) {
          setUploadStats({
            total: uploads.length,
            complete: uploads.filter(u => u.status === 'complete').length,
            error: uploads.filter(u => u.status === 'error').length,
            pending: uploads.filter(u => u.status === 'uploaded' || u.status === 'analyzing').length,
          })
        }

        // Finding stats
        const { data: findings } = await supabase
          .from('findings')
          .select('status, underpayment_amount')
          .eq('account_id', accountUser.account_id)

        if (findings) {
          setFindingStats({
            total: findings.length,
            open: findings.filter(f => f.status === 'open').length,
            resolved: findings.filter(f => f.status === 'resolved').length,
            ignored: findings.filter(f => f.status === 'ignored').length,
            totalRecovery: findings
              .filter(f => f.underpayment_amount && f.underpayment_amount > 0)
              .reduce((s, f) => s + (f.underpayment_amount || 0), 0),
          })
        }

        // Load agreements if admin
        if (adminFlag) {
          setAgreementsLoading(true)
          try {
            const res = await fetch('/api/agreements/list', {
              headers: { 'Authorization': `Bearer ${session.access_token}` },
            })
            const data = await res.json()
            if (data.error) setAgreementsError(data.error)
            else setAgreements(data.agreements || [])
          } catch {
            setAgreementsError('Failed to load agreements')
          } finally {
            setAgreementsLoading(false)
          }
        }
      } catch (err) {
        console.error('Admin load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSaveSettings = async () => {
    if (!account) return
    setSaving(true)
    setMessage(null)

    const { error } = await supabase
      .from('accounts')
      .update({
        name: practiceName.trim() || account.name,
        contact_name: contactName.trim() || null,
        contact_phone: contactPhone.trim() || null,
        contact_email: contactEmail.trim() || null,
      })
      .eq('id', account.id)

    if (error) {
      setMessage({ type: 'error', text: `Failed to save: ${error.message}` })
    } else {
      setAccount(prev => prev ? {
        ...prev,
        name: practiceName.trim() || prev.name,
        contact_name: contactName.trim() || null,
        contact_phone: contactPhone.trim() || null,
        contact_email: contactEmail.trim() || null,
      } : prev)
      setMessage({ type: 'success', text: 'Settings saved.' })
    }
    setSaving(false)
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

  // ── Agreements filtering ────────────────────────────────────────────────────
  const filteredAgreements = agreements.filter(a => {
    const q = searchQuery.toLowerCase()
    const matchesSearch = !q ||
      a.practice_name.toLowerCase().includes(q) ||
      a.full_name.toLowerCase().includes(q)

    const signedDate = new Date(a.agreed_at)
    const matchesFrom = !dateFrom || signedDate >= new Date(dateFrom)
    const matchesTo = !dateTo || signedDate <= new Date(dateTo + 'T23:59:59')

    return matchesSearch && matchesFrom && matchesTo
  })

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Practice settings, team members, agreements, and system information
        </p>
      </div>

      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-6">
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">

        {/* ── Agreements Section (admin only) ─────────────────────────────── */}
        {isAdmin && (
          <Card className="p-6">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-lg font-medium">Signed Agreements</h2>
              <Badge variant="secondary" className="text-sm">
                {agreements.length} agreement{agreements.length !== 1 ? 's' : ''} signed
              </Badge>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              All electronically signed service agreements. Only visible to admins.
            </p>
            <Separator className="mb-5" />

            {/* Search + date filters */}
            <div className="mb-4 flex flex-wrap gap-3">
              <div className="min-w-[200px] flex-1">
                <Input
                  placeholder="Search by practice or signer name…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="shrink-0 text-xs text-zinc-500">From</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="h-9 w-36 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="shrink-0 text-xs text-zinc-500">To</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="h-9 w-36 text-sm"
                />
              </div>
              {(searchQuery || dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setSearchQuery(''); setDateFrom(''); setDateTo('') }}
                  className="h-9 text-xs text-zinc-400"
                >
                  Clear
                </Button>
              )}
            </div>

            {agreementsLoading && (
              <p className="py-4 text-center text-sm text-zinc-400">Loading agreements…</p>
            )}
            {agreementsError && (
              <Alert variant="destructive">
                <AlertDescription>{agreementsError}</AlertDescription>
              </Alert>
            )}

            {!agreementsLoading && !agreementsError && (
              filteredAgreements.length === 0 ? (
                <p className="py-6 text-center text-sm text-zinc-400">
                  {agreements.length === 0 ? 'No agreements signed yet.' : 'No agreements match your filters.'}
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-zinc-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        <th className="px-4 py-3">Practice Name</th>
                        <th className="px-4 py-3">Signer Name</th>
                        <th className="px-4 py-3">Title</th>
                        <th className="px-4 py-3">Date Signed</th>
                        <th className="px-4 py-3">IP Address</th>
                        <th className="px-4 py-3">Version</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {filteredAgreements.map(a => (
                        <tr key={a.id} className="hover:bg-zinc-50">
                          <td className="px-4 py-3 font-medium text-zinc-900">{a.practice_name}</td>
                          <td className="px-4 py-3 text-zinc-700">{a.full_name}</td>
                          <td className="px-4 py-3 text-zinc-500">{a.title}</td>
                          <td className="px-4 py-3 text-zinc-500">
                            {new Date(a.agreed_at).toLocaleDateString('en-US', {
                              year: 'numeric', month: 'short', day: 'numeric',
                            })}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-zinc-400">{a.ip_address || '—'}</td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="text-xs">{a.agreement_version}</Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-3 text-xs"
                                onClick={() => setViewingAgreementId(a.id)}
                              >
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-3 text-xs"
                                onClick={async () => {
                                  const { data: { session: dlSession } } = await supabase.auth.getSession()
                                  const dlToken = dlSession?.access_token || ''
                                  const res = await fetch(`/api/agreements/${a.id}/pdf?action=download`, {
                                    headers: { 'Authorization': `Bearer ${dlToken}` },
                                  })
                                  if (!res.ok) { alert('PDF generation failed'); return }
                                  const blob = await res.blob()
                                  const url = URL.createObjectURL(blob)
                                  const el = document.createElement('a')
                                  el.href = url
                                  el.download = `MedicalRouter-Agreement-${a.practice_name.replace(/\s+/g, '-')}.pdf`
                                  el.click()
                                  URL.revokeObjectURL(url)
                                }}
                              >
                                Download PDF
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {filteredAgreements.length > 0 && filteredAgreements.length < agreements.length && (
              <p className="mt-2 text-xs text-zinc-400">
                Showing {filteredAgreements.length} of {agreements.length} agreements
              </p>
            )}
          </Card>
        )}

        {/* ── Practice Settings ────────────────────────────────────────────── */}
        <Card className="p-6">
          <h2 className="mb-1 text-lg font-medium">Practice Settings</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            These fields are used in generated appeal letters and PDF packets.
          </p>
          <Separator className="mb-5" />

          <div className="space-y-4">
            <div>
              <Label htmlFor="practice-name" className="text-xs font-medium">Practice Name</Label>
              <Input
                id="practice-name"
                value={practiceName}
                onChange={e => setPracticeName(e.target.value)}
                placeholder="e.g. Riverside Medical Group"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="contact-name" className="text-xs font-medium">Default Contact Name</Label>
              <Input
                id="contact-name"
                value={contactName}
                onChange={e => setContactName(e.target.value)}
                placeholder="e.g. Jane Smith, Billing Manager"
                className="mt-1"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="contact-phone" className="text-xs font-medium">Contact Phone</Label>
                <Input
                  id="contact-phone"
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="contact-email" className="text-xs font-medium">Contact Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  placeholder="billing@practice.com"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Account ID: <span className="font-mono">{account?.id || '—'}</span>
            </p>
            <Button onClick={handleSaveSettings} disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </Card>

        {/* ── Team Members ─────────────────────────────────────────────────── */}
        <Card className="p-6">
          <h2 className="mb-1 text-lg font-medium">Team Members</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            All users with access to this account.
          </p>
          <Separator className="mb-4" />

          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No team members found.</p>
          ) : (
            <div className="space-y-2">
              {users.map(u => (
                <div
                  key={u.user_id}
                  className="flex items-center justify-between rounded border px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-mono text-xs text-muted-foreground">{u.user_id}</p>
                      {u.user_id === currentUserId && (
                        <span className="shrink-0 text-xs text-muted-foreground">(you)</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Joined {new Date(u.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="ml-3 shrink-0">
                    {u.role}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          <p className="mt-4 text-xs text-muted-foreground">
            To add a team member, have them sign in at the login page with their email.
            On first login they will create their own account.
          </p>
        </Card>

        {/* ── Upload Stats ─────────────────────────────────────────────────── */}
        {uploadStats && (
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-medium">Upload Statistics</h2>
            <Separator className="mb-4" />
            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-semibold">{uploadStats.total}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Complete</p>
                <p className="text-2xl font-semibold text-green-700">{uploadStats.complete}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-2xl font-semibold text-yellow-700">{uploadStats.pending}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Errors</p>
                <p className="text-2xl font-semibold text-red-700">{uploadStats.error}</p>
              </div>
            </div>
          </Card>
        )}

        {/* ── Finding Stats ─────────────────────────────────────────────────── */}
        {findingStats && (
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-medium">Finding Statistics</h2>
            <Separator className="mb-4" />
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Total Findings</p>
                <p className="text-2xl font-semibold">{findingStats.total}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Net Recoverable from Payer</p>
                <p className="text-2xl font-semibold text-green-700">
                  {formatCurrency(findingStats.totalRecovery)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Resolution Rate</p>
                <p className="text-2xl font-semibold">
                  {findingStats.total > 0
                    ? `${Math.round(((findingStats.resolved + findingStats.ignored) / findingStats.total) * 100)}%`
                    : '0%'}
                </p>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Open</p>
                <p className="text-lg font-medium text-orange-600">{findingStats.open}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Resolved</p>
                <p className="text-lg font-medium text-green-700">{findingStats.resolved}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ignored</p>
                <p className="text-lg font-medium text-muted-foreground">{findingStats.ignored}</p>
              </div>
            </div>
          </Card>
        )}

        {/* ── System Info ──────────────────────────────────────────────────── */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-medium">System Information</h2>
          <Separator className="mb-4" />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version</span>
              <span className="font-mono">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Parser</span>
              <span className="font-mono">Deterministic 835 + PDF</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">OCR</span>
              <span className="font-mono">Stub (feature-flagged)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">CARC/RARC Codes</span>
              <span className="font-mono">Built-in (WPC source)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rate Limiting</span>
              <span className="font-mono">In-memory (10 req/min)</span>
            </div>
          </div>
        </Card>

        {/* ── Session ──────────────────────────────────────────────────────── */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-medium">Session</h2>
          <Separator className="mb-4" />
          <div className="space-y-2">
            <div className="flex gap-2 text-sm">
              <span className="w-32 shrink-0 text-muted-foreground">Signed in as:</span>
              <span className="font-medium">{userEmail || '—'}</span>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="w-32 shrink-0 text-muted-foreground">User ID:</span>
              <span className="font-mono text-muted-foreground">{currentUserId}</span>
            </div>
          </div>
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await supabase.auth.signOut()
                window.location.href = '/login'
              }}
            >
              Sign Out
            </Button>
          </div>
        </Card>
      </div>

      {/* ── Agreement View Modal ─────────────────────────────────────────── */}
      {viewingAgreementId && (
        <AgreementModal
          agreementId={viewingAgreementId}
          onClose={() => setViewingAgreementId(null)}
        />
      )}
    </div>
  )
}
