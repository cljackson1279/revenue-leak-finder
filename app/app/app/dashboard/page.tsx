'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

type Stats = {
  totalFindings: number
  totalRecovery: number
  underpaid: number
  appealable: number
  needsReview: number
  incomplete: number
  openCount: number
  resolvedCount: number
  uploadsCount: number
}

type RecentFinding = {
  id: string
  procedure_code: string | null
  payer: string | null
  finding_type: string
  underpayment_amount: number | null
  confidence: string
  created_at: string
}

export default function DashboardPage() {
  const supabase = getSupabase()
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentFindings, setRecentFindings] = useState<RecentFinding[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: findings } = await supabase
          .from('findings')
          .select('id, finding_type, underpayment_amount, confidence, status, procedure_code, payer, created_at')
          .order('created_at', { ascending: false })

        const { count: uploadsCount } = await supabase
          .from('uploads')
          .select('id', { count: 'exact', head: true })

        if (findings) {
          const underpaid = findings.filter(f => f.finding_type === 'UNDERPAID')
          const appealable = findings.filter(f => f.finding_type === 'DENIED_APPEALABLE')
          const needsReview = findings.filter(f => f.finding_type === 'NEEDS_REVIEW')
          const incomplete = findings.filter(f => f.finding_type === 'INCOMPLETE_DATA')
          const open = findings.filter(f => f.status === 'open')
          const resolved = findings.filter(f => f.status === 'resolved')

          const totalRecovery = findings
            .filter(f => f.underpayment_amount && f.underpayment_amount > 0)
            .reduce((sum, f) => sum + (f.underpayment_amount || 0), 0)

          setStats({
            totalFindings: findings.length,
            totalRecovery,
            underpaid: underpaid.length,
            appealable: appealable.length,
            needsReview: needsReview.length,
            incomplete: incomplete.length,
            openCount: open.length,
            resolvedCount: resolved.length,
            uploadsCount: uploadsCount || 0,
          })

          setRecentFindings(findings.slice(0, 10))
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Revenue recovery overview</p>
        </div>
        <Link href="/app/upload">
          <Button>Upload files</Button>
        </Link>
      </div>

      {/* Primary Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Total Net Recoverable from Payer</p>
          <p className="text-3xl font-semibold tracking-tight text-green-700">
            {formatCurrency(stats?.totalRecovery || 0)}
          </p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Underpaid Claims</p>
          <p className="text-3xl font-semibold tracking-tight">{stats?.underpaid || 0}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Appealable Denials</p>
          <p className="text-3xl font-semibold tracking-tight">{stats?.appealable || 0}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Open Findings</p>
          <p className="text-3xl font-semibold tracking-tight">{stats?.openCount || 0}</p>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Uploads</p>
          <p className="text-lg font-medium">{stats?.uploadsCount || 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total Findings</p>
          <p className="text-lg font-medium">{stats?.totalFindings || 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Needs Review</p>
          <p className="text-lg font-medium">{stats?.needsReview || 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Resolved</p>
          <p className="text-lg font-medium">{stats?.resolvedCount || 0}</p>
        </Card>
      </div>

      {/* Empty State */}
      {(!stats || stats.totalFindings === 0) && (
        <Card className="p-12 text-center">
          <h2 className="mb-2 text-lg font-medium">No findings yet</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Upload your first 835 ERA or EOB PDF to start finding revenue leaks.
          </p>
          <Link href="/app/upload">
            <Button>Upload your first file</Button>
          </Link>
        </Card>
      )}

      {/* Recent Findings Table */}
      {recentFindings.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium">Recent Findings</h2>
            <Link href="/app/results" className="text-sm text-muted-foreground hover:text-foreground">
              View all
            </Link>
          </div>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-4 py-3 font-medium">Procedure</th>
                    <th className="px-4 py-3 font-medium">Payer</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Confidence</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentFindings.map(f => (
                    <tr
                      key={f.id}
                      className="cursor-pointer border-b last:border-0 hover:bg-zinc-50"
                      onClick={() => router.push(`/app/results/${f.id}`)}
                    >
                      <td className="px-4 py-3 font-mono text-xs">{f.procedure_code || '—'}</td>
                      <td className="px-4 py-3">{f.payer || 'Unknown'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          f.finding_type === 'UNDERPAID' ? 'bg-red-100 text-red-700' :
                          f.finding_type === 'DENIED_APPEALABLE' ? 'bg-orange-100 text-orange-700' :
                          f.finding_type === 'NEEDS_REVIEW' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {f.finding_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">
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
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(f.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
