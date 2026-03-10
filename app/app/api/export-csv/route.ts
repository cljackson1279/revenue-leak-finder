import { NextResponse } from 'next/server'
import { authenticateRequest, AuthError } from '@/lib/auth'

export const maxDuration = 15

/**
 * Server-side CSV export of findings.
 * Accepts query params for filtering: upload_id, finding_type, confidence, payer, status
 */
export async function GET(request: Request) {
  try {
    let auth
    try {
      auth = await authenticateRequest(request)
    } catch (e) {
      if (e instanceof AuthError) {
        return NextResponse.json({ error: e.message }, { status: e.status })
      }
      throw e
    }

    const { supabase, accountId } = auth
    const url = new URL(request.url)

    // Build query with filters
    let query = supabase
      .from('findings')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })

    const uploadId = url.searchParams.get('upload_id')
    if (uploadId) query = query.eq('upload_id', uploadId)

    const findingType = url.searchParams.get('finding_type')
    if (findingType) query = query.eq('finding_type', findingType)

    const confidence = url.searchParams.get('confidence')
    if (confidence) query = query.eq('confidence', confidence)

    const payer = url.searchParams.get('payer')
    if (payer) query = query.eq('payer', payer)

    const status = url.searchParams.get('status')
    if (status) query = query.eq('status', status)

    const { data: findings, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to load findings' }, { status: 500 })
    }

    if (!findings || findings.length === 0) {
      return new NextResponse('No findings match the current filters.', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    // CSV columns per spec
    // Formula: Net Recoverable from Payer = Allowed - Paid - Patient Responsibility
    const headers = [
      'payer', 'service_date', 'procedure_code', 'type', 'confidence',
      'billed', 'allowed', 'paid', 'patient_responsibility', 'net_recoverable_from_payer',
      'formula', 'carc', 'rarc', 'action', 'rationale', 'status',
    ]

    const escapeCSV = (val: string | null | undefined): string => {
      if (val === null || val === undefined) return ''
      const str = String(val)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const rows = findings.map(f => [
      escapeCSV(f.payer),
      escapeCSV(f.service_date),
      escapeCSV(f.procedure_code),
      escapeCSV(f.finding_type),
      escapeCSV(f.confidence),
      escapeCSV(f.billed_amount?.toString()),
      escapeCSV(f.allowed_amount?.toString()),
      escapeCSV(f.paid_amount?.toString()),
      escapeCSV(f.patient_responsibility?.toString()),
      escapeCSV(f.underpayment_amount?.toString()),
      escapeCSV('Net Recoverable = Allowed - Paid - Patient Responsibility'),
      escapeCSV(f.carc_codes?.join('; ')),
      escapeCSV(f.rarc_codes?.join('; ')),
      escapeCSV(f.action),
      escapeCSV(f.rationale),
      escapeCSV(f.status),
    ].join(','))

    const csv = [headers.join(','), ...rows].join('\n')

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="findings-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('[export-csv] error', { error: error instanceof Error ? error.message : 'unknown' })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
