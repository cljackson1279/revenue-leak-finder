import { NextResponse } from 'next/server'
import { authenticateRequest, AuthError } from '@/lib/auth'
import { generateAppealPacketPdf } from '@/lib/appealPacket'
import type { Finding } from '@/lib/database'

export const maxDuration = 30

export async function POST(request: Request) {
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
    const body = await request.json()
    const { upload_id, finding_ids } = body

    // Get account name
    const { data: account } = await supabase
      .from('accounts')
      .select('name')
      .eq('id', accountId)
      .single()

    const accountName = account?.name || 'Medical Practice'

    // Build findings query
    let query = supabase
      .from('findings')
      .select('*')
      .eq('account_id', accountId)

    if (upload_id) {
      query = query.eq('upload_id', upload_id)
    }

    if (finding_ids && Array.isArray(finding_ids) && finding_ids.length > 0) {
      query = query.in('id', finding_ids)
    }

    const { data: findings, error } = await query.order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to load findings' }, { status: 500 })
    }

    if (!findings || findings.length === 0) {
      return NextResponse.json({ error: 'No findings to include in packet' }, { status: 400 })
    }

    // Generate PDF
    const pdfBuffer = generateAppealPacketPdf({
      accountName,
      findings: findings as Finding[],
      uploadIds: upload_id ? [upload_id] : [...new Set(findings.map((f: Finding) => f.upload_id))],
    })

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="appeal-packet-${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    })
  } catch (error) {
    console.error('[appeal-packet] error', { error: error instanceof Error ? error.message : 'unknown' })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
