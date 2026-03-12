import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { execSync } from 'child_process'
import { writeFileSync, readFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const AGREEMENT_TEXT = `SERVICE AGREEMENT TEXT GOES HERE

[This is a placeholder. Replace this entire block with your final MedicalRouter Pilot Services Agreement text before going live.]

Key terms summary (placeholder):
• $500 non-refundable onboarding fee
• 25% success fee on recovered payer amounts
• 7-day payment obligation on recovered amounts
• 12-month recovery window from date of identification
• Agreement governed by [GOVERNING STATE]
• Signed electronically by the authorized representative of the practice`

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const cookieStore = await cookies()
    const userClient = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    })

    const { data: { user } } = await userClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const serviceClient = createClient(
      supabaseUrl,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // Check admin role
    const { data: accountUser } = await serviceClient
      .from('account_users')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!accountUser || accountUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch agreement
    const { data: agreement, error } = await serviceClient
      .from('agreements')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !agreement) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Log download audit
    await serviceClient
      .from('agreement_audit_log')
      .insert({ agreement_id: id, admin_id: user.id, action: 'download' })

    // Generate PDF
    const agreedAtFormatted = new Date(agreement.agreed_at).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; margin: 40px; line-height: 1.6; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .subtitle { color: #555; font-size: 11px; margin-bottom: 24px; }
  .section { margin-bottom: 16px; }
  .label { font-weight: bold; font-size: 10px; text-transform: uppercase; color: #555; margin-bottom: 2px; }
  .value { font-size: 13px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
  .agreement-box { border: 1px solid #ccc; padding: 16px; background: #f9f9f9; white-space: pre-wrap; font-size: 11px; margin-bottom: 24px; }
  .sig-img { border: 1px solid #ccc; padding: 8px; background: #f9f9f9; max-width: 320px; }
  .footer { margin-top: 32px; font-size: 10px; color: #888; border-top: 1px solid #eee; padding-top: 8px; }
  .checkbox-row { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 16px; }
  .checkbox-box { width: 14px; height: 14px; border: 1px solid #333; display: inline-block; text-align: center; font-size: 10px; line-height: 14px; flex-shrink: 0; margin-top: 2px; }
</style>
</head>
<body>
<h1>MedicalRouter — Service Agreement</h1>
<p class="subtitle">Agreement Version: ${agreement.agreement_version} &nbsp;|&nbsp; Signed: ${agreedAtFormatted} &nbsp;|&nbsp; IP: ${agreement.ip_address || 'unknown'}</p>

<div class="agreement-box">${AGREEMENT_TEXT}</div>

<div class="section">
  <div class="label">Full Legal Name</div>
  <div class="value">${agreement.full_name}</div>
</div>
<div class="section">
  <div class="label">Title / Role at Practice</div>
  <div class="value">${agreement.title}</div>
</div>
<div class="section">
  <div class="label">Practice Legal Name</div>
  <div class="value">${agreement.practice_name}</div>
</div>
<div class="section">
  <div class="label">Date Signed</div>
  <div class="value">${agreedAtFormatted}</div>
</div>

<div class="checkbox-row">
  <div class="checkbox-box">✓</div>
  <div>I have read, understood, and agree to the terms of this Service Agreement on behalf of the practice named above.</div>
</div>

<div class="section">
  <div class="label">Electronic Signature</div>
  <img class="sig-img" src="${agreement.signature_image}" alt="Signature" />
</div>

<div class="footer">
  This document was electronically signed via MedicalRouter. Agreement version ${agreement.agreement_version}.
  IP address recorded at time of signing: ${agreement.ip_address || 'unknown'}.
  This is a legally binding electronic signature under applicable e-signature law.
</div>
</body>
</html>`

    const tmpHtml = join(tmpdir(), `agreement-dl-${Date.now()}.html`)
    const tmpPdf = join(tmpdir(), `agreement-dl-${Date.now()}.pdf`)

    try {
      writeFileSync(tmpHtml, html, 'utf8')
      execSync(`weasyprint "${tmpHtml}" "${tmpPdf}"`, { timeout: 30000 })
      const pdfBuffer = readFileSync(tmpPdf)

      const filename = `MedicalRouter-Agreement-${agreement.practice_name.replace(/\s+/g, '-')}-${id.slice(0, 8)}.pdf`

      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': String(pdfBuffer.length),
        },
      })
    } finally {
      try { unlinkSync(tmpHtml) } catch {}
      try { unlinkSync(tmpPdf) } catch {}
    }
  } catch (err: any) {
    console.error('[agreements/pdf]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
