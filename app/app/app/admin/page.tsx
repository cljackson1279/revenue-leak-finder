'use client'
import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

type AccountInfo = {
  id: string
  name: string
  created_at: string
}

type UploadStats = {
  total: number
  complete: number
  error: number
  uploaded: number
}

type FindingStats = {
  total: number
  open: number
  resolved: number
  dismissed: number
  in_progress: number
  totalRecovery: number
}

export default function AdminPage() {
  const supabase = getSupabase()
  const [account, setAccount] = useState<AccountInfo | null>(null)
  const [uploadStats, setUploadStats] = useState<UploadStats | null>(null)
  const [findingStats, setFindingStats] = useState<FindingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string>('')

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setUserEmail(user.email || '')

        const { data: accountUser } = await supabase
          .from('account_users')
          .select('account_id')
          .eq('user_id', user.id)
          .single()

        if (!accountUser) return

        const { data: accountData } = await supabase
          .from('accounts')
          .select('*')
          .eq('id', accountUser.account_id)
          .single()

        if (accountData) setAccount(accountData)

        const { data: uploads } = await supabase
          .from('uploads')
          .select('status')
          .eq('account_id', accountUser.account_id)

        if (uploads) {
          setUploadStats({
            total: uploads.length,
            complete: uploads.filter(u => u.status === 'complete').length,
            error: uploads.filter(u => u.status === 'error').length,
            uploaded: uploads.filter(u => u.status === 'uploaded').length,
          })
        }

        const { data: findings } = await supabase
          .from('findings')
          .select('status, underpayment_amount')
          .eq('account_id', accountUser.account_id)

        if (findings) {
          setFindingStats({
            total: findings.length,
            open: findings.filter(f => f.status === 'open').length,
            resolved: findings.filter(f => f.status === 'resolved').length,
            dismissed: findings.filter(f => f.status === 'dismissed').length,
            in_progress: findings.filter(f => f.status === 'in_progress').length,
            totalRecovery: findings
              .filter(f => f.underpayment_amount && f.underpayment_amount > 0)
              .reduce((s, f) => s + (f.underpayment_amount || 0), 0),
          })
        }
      } catch (error) {
        console.error('Admin load error:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <p className="text-muted-foreground">Loading admin...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">Account settings and system information</p>
      </div>

      <div className="space-y-6">
        {/* Account Info */}
        <Card className="p-6">
          <h2 className="text-lg font-medium">Account</h2>
          <Separator className="my-4" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Account Name</p>
              <p className="text-sm font-medium">{account?.name || 'Not set'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium">{userEmail}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Account ID</p>
              <p className="font-mono text-xs">{account?.id || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="text-sm">{account ? new Date(account.created_at).toLocaleDateString() : '—'}</p>
            </div>
          </div>
        </Card>

        {/* Upload Stats */}
        <Card className="p-6">
          <h2 className="text-lg font-medium">Upload Statistics</h2>
          <Separator className="my-4" />
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Total Uploads</p>
              <p className="text-2xl font-semibold">{uploadStats?.total || 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Complete</p>
              <p className="text-2xl font-semibold text-green-700">{uploadStats?.complete || 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-2xl font-semibold text-yellow-700">{uploadStats?.uploaded || 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Errors</p>
              <p className="text-2xl font-semibold text-red-700">{uploadStats?.error || 0}</p>
            </div>
          </div>
        </Card>

        {/* Finding Stats */}
        <Card className="p-6">
          <h2 className="text-lg font-medium">Finding Statistics</h2>
          <Separator className="my-4" />
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Total Findings</p>
              <p className="text-2xl font-semibold">{findingStats?.total || 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Recovery Potential</p>
              <p className="text-2xl font-semibold text-green-700">
                {formatCurrency(findingStats?.totalRecovery || 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Resolution Rate</p>
              <p className="text-2xl font-semibold">
                {findingStats && findingStats.total > 0
                  ? `${Math.round(((findingStats.resolved + findingStats.dismissed) / findingStats.total) * 100)}%`
                  : '0%'}
              </p>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Open</p>
              <p className="text-lg font-medium">{findingStats?.open || 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">In Progress</p>
              <p className="text-lg font-medium">{findingStats?.in_progress || 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Resolved</p>
              <p className="text-lg font-medium text-green-700">{findingStats?.resolved || 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Dismissed</p>
              <p className="text-lg font-medium">{findingStats?.dismissed || 0}</p>
            </div>
          </div>
        </Card>

        {/* System Info */}
        <Card className="p-6">
          <h2 className="text-lg font-medium">System Information</h2>
          <Separator className="my-4" />
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
      </div>
    </div>
  )
}
