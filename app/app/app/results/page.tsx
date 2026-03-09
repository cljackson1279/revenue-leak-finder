'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type Finding = {
  id: string
  finding_type: string
  amount: number
  confidence: string
  rationale: string
  procedure_code: string
  payer: string
  created_at: string
}

function ResultsContent() {
  const searchParams = useSearchParams()
  const uploadId = searchParams.get('upload_id')

  const [findings, setFindings] = useState<Finding[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

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
        .order('created_at', { ascending: false })

      if (uploadId) {
        query = query.eq('upload_id', uploadId)
      } else {
        query = query.limit(50)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        setError(fetchError.message)
      } else {
        setFindings(data || [])
      }
      setLoading(false)
    }
    load()
  }, [uploadId])

  const totalAmount = findings.reduce((s, f) => s + Number(f.amount), 0)

  const confidenceVariant = (c: string) =>
    c === 'High' ? 'default' : c === 'Med' ? 'outline' : 'destructive'

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Results</h1>
        <p className="mt-1 text-base text-muted-foreground">
          {uploadId
            ? 'Findings for selected upload.'
            : 'Revenue leak opportunities identified from your 835 ERA uploads.'}
        </p>
      </div>

      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium">Total Potential Recovery</h2>
              {loading ? (
                <p className="mt-1 text-muted-foreground text-sm">Loading…</p>
              ) : (
                <>
                  <p className="mt-1 text-3xl font-semibold tracking-tight">
                    ${totalAmount.toFixed(2)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {findings.length > 0
                      ? `Based on ${findings.length} identified opportunity${findings.length !== 1 ? 'ies' : 'y'}`
                      : 'Upload and analyze an 835 ERA file to see findings here.'}
                  </p>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" disabled>Download PDF</Button>
              <Button variant="outline" disabled>Download CSV</Button>
            </div>
          </div>
        </Card>

        {error && (
          <Card className="p-4 border-destructive">
            <p className="text-sm text-destructive">
              Could not load findings: {error}. Make sure the findings table exists (see{' '}
              <code>supabase/migrations/20260309000000_create_findings.sql</code>).
            </p>
          </Card>
        )}

        {!loading && findings.length === 0 && !error && (
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">
              {uploadId
                ? 'No findings for this upload yet. Try running analysis again.'
                : 'No findings yet. Upload and analyze an 835 ERA file to see results here.'}
            </p>
          </Card>
        )}

        {!loading && findings.length > 0 && (
          <Card className="p-6">
            <h2 className="text-lg font-medium">Top Opportunities</h2>
            <Separator className="my-4" />
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payer</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Finding</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Rationale</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {findings.map(f => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.payer}</TableCell>
                      <TableCell>{f.procedure_code}</TableCell>
                      <TableCell>{f.finding_type}</TableCell>
                      <TableCell className="text-right font-semibold text-red-600">
                        ${Number(f.amount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={confidenceVariant(f.confidence)}>
                          {f.confidence}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs text-xs text-muted-foreground truncate" title={f.rationale}>
                        {f.rationale}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline">Appeal</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-8 sm:px-6"><p className="text-muted-foreground">Loading…</p></div>}>
      <ResultsContent />
    </Suspense>
  )
}
