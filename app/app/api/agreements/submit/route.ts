import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const AGREEMENT_VERSION = 'v1.0'

const AGREEMENT_TEXT = `SERVICE AGREEMENT TEXT GOES HERE

[This is a placeholder. Replace this entire block with your final MedicalRouter Pilot Services Agreement text before going live.]

Key terms summary (placeholder):
• $500 non-refundable onboarding fee
• 25% success fee on recovered payer amounts
• 7-day payment obligation on recovered amounts
• 12-month recovery window from date of identification
• Agreement governed by [GOVERNING STATE]
• Signed electronically by the authorized representative of the practice`

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

async function generateAgreementPdfBuffer(params: {
  fullName: string
  title: string
  practiceName: string
  agreedAt: string
  ipAddress: string
  agreementVersion: string
  signatureImage: string
}): Promise<Buffer> {
  // Build a minimal HTML document for the PDF
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
  .agreement-box { border: 1px solid #ccc; padding: 16px; background: #f9f9f9; white-space: pre-wrap; font-size: 11px; margin-bottom: 24px; max-height: 400px; overflow: hidden; }
  .sig-img { border: 1px solid #ccc; padding: 8px; background: #f9f9f9; max-width: 320px; }
  .footer { margin-top: 32px; font-size: 10px; color: #888; border-top: 1px solid #eee; padding-top: 8px; }
  .checkbox-row { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 16px; }
  .checkbox-box { width: 14px; height: 14px; border: 1px solid #333; display: inline-block; text-align: center; font-size: 10px; line-height: 14px; flex-shrink: 0; margin-top: 2px; }
</style>
</head>
<body>
<h1>MedicalRouter — Service Agreement</h1>
<p class="subtitle">Agreement Version: ${params.agreementVersion} &nbsp;|&nbsp; Signed: ${params.agreedAt} &nbsp;|&nbsp; IP: ${params.ipAddress}</p>

<div class="agreement-box">${AGREEMENT_TEXT}</div>

<div class="section">
  <div class="label">Full Legal Name</div>
  <div class="value">${params.fullName}</div>
</div>
<div class="section">
  <div class="label">Title / Role at Practice</div>
  <div class="value">${params.title}</div>
</div>
<div class="section">
  <div class="label">Practice Legal Name</div>
  <div class="value">${params.practiceName}</div>
</div>
<div class="section">
  <div class="label">Date Signed</div>
  <div class="value">${params.agreedAt}</div>
</div>

<div class="checkbox-row">
  <div class="checkbox-box">✓</div>
  <div>I have read, understood, and agree to the terms of this Service Agreement on behalf of the practice named above.</div>
</div>

<div class="section">
  <div class="label">Electronic Signature</div>
  <img class="sig-img" src="${params.signatureImage}" alt="Signature" />
</div>

<div class="footer">
  This document was electronically signed via MedicalRouter. Agreement version ${params.agreementVersion}.
  IP address recorded at time of signing: ${params.ipAddress}.
  This is a legally binding electronic signature under applicable e-signature law.
</div>
</body>
</html>`

  // Use html-pdf-node or fallback to a simple buffer approach
  // We'll use the html content and convert via the available weasyprint CLI
  const { execSync } = await import('child_process')
  const { writeFileSync, readFileSync, unlinkSync } = await import('fs')
  const { tmpdir } = await import('os')
  const { join } = await import('path')

  const tmpHtml = join(tmpdir(), `agreement-${Date.now()}.html`)
  const tmpPdf = join(tmpdir(), `agreement-${Date.now()}.pdf`)

  try {
    writeFileSync(tmpHtml, html, 'utf8')
    execSync(`weasyprint "${tmpHtml}" "${tmpPdf}"`, { timeout: 30000 })
    const pdfBuffer = readFileSync(tmpPdf)
    return pdfBuffer
  } finally {
    try { unlinkSync(tmpHtml) } catch {}
    try { unlinkSync(tmpPdf) } catch {}
  }
}

async function sendAgreementEmail(params: {
  toEmail: string
  fullName: string
  practiceName: string
  pdfBuffer: Buffer
  agreedAt: string
}): Promise<void> {
  // Use Resend if available, otherwise log and skip
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    console.log('[agreements] RESEND_API_KEY not set — skipping email send')
    return
  }

  const { Resend } = await import('resend')
  const resend = new Resend(resendKey)

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'noreply@medicalrouter.com',
    to: params.toEmail,
    subject: 'Your MedicalRouter Service Agreement — Signed Copy',
    html: `<p>Hi ${params.fullName},</p>
<p>Thank you for signing the MedicalRouter Service Agreement on behalf of <strong>${params.practiceName}</strong>.</p>
<p>A PDF copy of your signed agreement is attached to this email for your records.</p>
<p>Signed: ${params.agreedAt}</p>
<p>If you have any questions, please contact us at <a href="mailto:[CONTACT_EMAIL]">[CONTACT_EMAIL]</a>.</p>
<p>— The MedicalRouter Team</p>`,
    attachments: [
      {
        filename: `MedicalRouter-Service-Agreement-${params.practiceName.replace(/\s+/g, '-')}.pdf`,
        content: params.pdfBuffer.toString('base64'),
      },
    ],
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { fullName, title, practiceName, signatureImage, agreementVersion, accountId } = body

    if (!fullName || !title || !practiceName || !signatureImage) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get the authenticated user from the session cookie
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const authHeader = req.headers.get('authorization') || ''
    const cookieHeader = req.headers.get('cookie') || ''

    // Use service client to get user from the request
    const serviceClient = getServiceClient()

    // Parse the access token from the cookie
    const accessTokenMatch = cookieHeader.match(/sb-[^-]+-auth-token=([^;]+)/)
    let userId: string | null = null
    let userEmail: string | null = null

    // Try to get user via the auth header or by creating a user-scoped client
    const { createServerClient } = await import('@supabase/ssr')
    const { cookies } = await import('next/headers')
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

    userId = user.id
    userEmail = user.email || null

    // Check for duplicate submission
    const { data: existing } = await serviceClient
      .from('agreements')
      .select('id')
      .eq('client_id', userId)
      .eq('agreement_version', agreementVersion || AGREEMENT_VERSION)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Agreement already signed' }, { status: 409 })
    }

    // Capture IP
    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown'

    const agreedAt = new Date().toISOString()

    // Insert agreement record
    const { data: agreement, error: insertError } = await serviceClient
      .from('agreements')
      .insert({
        account_id: accountId,
        client_id: userId,
        full_name: fullName,
        title,
        practice_name: practiceName,
        agreed_at: agreedAt,
        ip_address: ipAddress,
        signature_image: signatureImage,
        agreement_version: agreementVersion || AGREEMENT_VERSION,
        pdf_sent: false,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[agreements] Insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Generate PDF and send email (non-blocking — don't fail the request if this fails)
    if (userEmail) {
      try {
        const agreedAtFormatted = new Date(agreedAt).toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
        })
        const pdfBuffer = await generateAgreementPdfBuffer({
          fullName,
          title,
          practiceName,
          agreedAt: agreedAtFormatted,
          ipAddress,
          agreementVersion: agreementVersion || AGREEMENT_VERSION,
          signatureImage,
        })

        await sendAgreementEmail({
          toEmail: userEmail,
          fullName,
          practiceName,
          pdfBuffer,
          agreedAt: agreedAtFormatted,
        })

        // Mark pdf_sent
        await serviceClient
          .from('agreements')
          .update({ pdf_sent: true })
          .eq('id', agreement.id)
      } catch (emailErr) {
        console.error('[agreements] PDF/email error (non-fatal):', emailErr)
      }
    }

    return NextResponse.json({ success: true, agreementId: agreement.id })
  } catch (err: any) {
    console.error('[agreements] Unexpected error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
