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

export default function AdminPage() {
  const supabase = getSupabase()

  const [account, setAccount] = useState<Account | null>(null)
  const [users, setUsers] = useState<AccountUser[]>([])
  const [uploadStats, setUploadStats] = useState<UploadStats | null>(null)
  const [findingStats, setFindingStats] = useState<FindingStats | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Editable settings
  const [practiceName, setPracticeName] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')

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

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Practice settings, team members, and system information
        </p>
      </div>

      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-6">
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Practice Settings */}
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

        {/* Team Members */}
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

        {/* Upload Stats */}
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

        {/* Finding Stats */}
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

        {/* System Info */}
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

        {/* Session */}
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
    </div>
  )
}
