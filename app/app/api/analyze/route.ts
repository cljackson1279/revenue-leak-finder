import { NextResponse } from 'next/server'
import { authenticateRequest, AuthError } from '@/lib/auth'
import { parse835, computeFindings } from '@/lib/parse835'
import { parsePdfEob, pdfToFindings } from '@/lib/parsePdf'
import { getAnalyzeRateLimiter } from '@/lib/rateLimit'
import type { FindingInput } from '@/lib/parse835'

export const maxDuration = 30 // Vercel serverless timeout (seconds)

export async function POST(request: Request) {
  try {
    // ── 1. Auth ──
    let auth
    try {
      auth = await authenticateRequest(request)
    } catch (e) {
      if (e instanceof AuthError) {
        return NextResponse.json({ error: e.message }, { status: e.status })
      }
      throw e
    }

    const { supabase, accountId, user } = auth

    // ── 2. Rate limit ──
    const limiter = getAnalyzeRateLimiter()
    const rateLimitKey = `analyze:${accountId}`
    const { allowed, remaining, resetAt } = await limiter.check(rateLimitKey)

    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before retrying.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': String(remaining),
            'X-RateLimit-Reset': String(resetAt),
          },
        }
      )
    }

    // ── 3. Parse request ──
    const body = await request.json()
    const { upload_id } = body

    if (!upload_id) {
      return NextResponse.json({ error: 'upload_id is required' }, { status: 400 })
    }

    // ── 4. Load upload record ──
    const { data: upload, error: fetchError } = await supabase
      .from('uploads')
      .select('*')
      .eq('id', upload_id)
      .single()

    if (fetchError || !upload) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 })
    }

    // Verify ownership
    if (upload.account_id !== accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // ── 5. Mark as analyzing ──
    await supabase
      .from('uploads')
      .update({ status: 'analyzing' })
      .eq('id', upload_id)

    // Log without PHI
    console.log('[analyze] start', {
      upload_id,
      account_id: accountId,
      user_id: user.id,
      source_type: upload.source_type,
      filename_ext: upload.filename?.split('.').pop(),
    })

    // ── 6. Download file from storage ──
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('uploads')
      .download(upload.storage_path)

    if (downloadError || !fileBlob) {
      await supabase
        .from('uploads')
        .update({ status: 'error', error_message: 'Could not download file from storage' })
        .eq('id', upload_id)
      return NextResponse.json({ error: 'Could not download file' }, { status: 500 })
    }

    // ── 7. Parse based on source_type ──
    let findings: FindingInput[] = []

    try {
      if (upload.source_type === 'era_835') {
        const ediText = await fileBlob.text()
        const parsed = parse835(ediText)
        findings = computeFindings(parsed.claims)

        console.log('[analyze] 835 parsed', {
          upload_id,
          claims: parsed.claims.length,
          findings: findings.length,
          payer: parsed.payer,
        })
      } else if (upload.source_type === 'eob_pdf') {
        const buffer = Buffer.from(await fileBlob.arrayBuffer())
        const extraction = await parsePdfEob(buffer)
        findings = pdfToFindings(extraction, null)

        console.log('[analyze] PDF parsed', {
          upload_id,
          method: extraction.method,
          text_density: extraction.textDensity,
          line_items: extraction.lineItems.length,
          findings: findings.length,
        })
      } else {
        await supabase
          .from('uploads')
          .update({
            status: 'error',
            error_message: 'Unsupported file type. Upload 835 ERA (.edi/.x12/.835/.txt) or EOB PDF (.pdf).',
          })
          .eq('id', upload_id)
        return NextResponse.json(
          { error: 'Unsupported file type' },
          { status: 400 }
        )
      }
    } catch (parseError) {
      const msg = parseError instanceof Error ? parseError.message : 'Parse error'
      console.error('[analyze] parse error', { upload_id, error: msg })
      await supabase
        .from('uploads')
        .update({ status: 'error', error_message: `Parse error: ${msg}` })
        .eq('id', upload_id)
      return NextResponse.json({ error: `Parse error: ${msg}` }, { status: 500 })
    }

    // ── 8. Persist findings (idempotent: delete existing then insert) ──
    // Delete any existing findings for this upload (idempotent re-analysis)
    const { error: deleteError } = await supabase
      .from('findings')
      .delete()
      .eq('upload_id', upload_id)

    if (deleteError) {
      console.error('[analyze] delete existing findings error', {
        upload_id,
        error: deleteError.message,
      })
    }

    if (findings.length > 0) {
      const rows = findings.map(f => ({
        account_id: accountId,
        upload_id: upload_id,
        payer: f.payer,
        service_date: f.service_date,
        procedure_code: f.procedure_code,
        billed_amount: f.billed_amount,
        allowed_amount: f.allowed_amount,
        paid_amount: f.paid_amount,
        patient_responsibility: f.patient_responsibility,
        underpayment_amount: f.underpayment_amount,
        carc_codes: f.carc_codes,
        rarc_codes: f.rarc_codes,
        finding_type: f.finding_type,
        confidence: f.confidence,
        action: f.action,
        rationale: f.rationale,
        evidence: f.evidence,
        status: 'open',
      }))

      const { error: insertError } = await supabase.from('findings').insert(rows)

      if (insertError) {
        console.error('[analyze] insert findings error', {
          upload_id,
          error: insertError.message,
        })
        await supabase
          .from('uploads')
          .update({ status: 'error', error_message: `Failed to persist findings: ${insertError.message}` })
          .eq('id', upload_id)
        return NextResponse.json(
          { error: 'Failed to persist findings', details: insertError.message },
          { status: 500 }
        )
      }
    }

    // ── 9. Mark complete ──
    await supabase
      .from('uploads')
      .update({
        status: 'complete',
        analyzed_at: new Date().toISOString(),
      })
      .eq('id', upload_id)

    console.log('[analyze] complete', {
      upload_id,
      findings_count: findings.length,
    })

    return NextResponse.json({
      ok: true,
      findings_count: findings.length,
    })
  } catch (error) {
    console.error('[analyze] unexpected error', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
