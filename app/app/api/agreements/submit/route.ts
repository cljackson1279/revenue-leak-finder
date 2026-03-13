import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const AGREEMENT_VERSION = 'v1.0'

const AGREEMENT_TEXT = `MEDICALROUTER PILOT SERVICES AGREEMENT

This Agreement governs the commercial terms of the MedicalRouter 30-Day Pilot engagement. Review it carefully before signing.

1. SCOPE OF SERVICES

MedicalRouter agrees to provide the Client with access to its software platform and analysis services for a 30-day pilot engagement ("Pilot Period"). Services include review of uploaded billing-related documents (including 835 ERA files and PDF Explanation of Benefits documents), identification of potential underpayments, denied claims, and related recovery opportunities, and generation of findings and appeal-ready documentation to support the Client's billing team.

2. SETUP FEE — NON-REFUNDABLE

The Client agrees to pay a one-time setup fee of $500.00 USD before the Pilot Period begins and before any audit or analysis work commences. This setup fee is non-refundable under all circumstances. Payment of the setup fee is a condition precedent to MedicalRouter's obligation to perform any services under this Agreement.

3. SUCCESS FEE — 25% CONTINGENCY

In addition to the setup fee, MedicalRouter is entitled to a success fee equal to 25% of all recovered amounts from claims identified by MedicalRouter during the audit or Pilot Period, subject to the terms of this Section.

Definition of Recovery. "Recovery" means actual payment received by the Client from a payer as a direct result of an appeal, corrected claim submission, resubmission, or other follow-up action taken in connection with a claim, denial, underpayment, or reimbursement opportunity identified by MedicalRouter. Recovery does not include patient responsibility amounts (co-pays, deductibles, coinsurance) or amounts that would have been paid regardless of MedicalRouter's identification.

Basis of Fee. The 25% success fee applies to the gross recovered amount received from the payer attributable to the identified opportunity, not net of any other costs or fees.

4. 12-MONTH RECOVERY WINDOW

The success fee obligation extends for a period of 12 months from the date MedicalRouter identifies a claim, denial, underpayment, appeal opportunity, corrected claim opportunity, resubmission opportunity, or reimbursement opportunity ("Recovery Window").

This obligation survives the end of the Pilot Period. If MedicalRouter identifies an opportunity during the audit or Pilot Period, and the Client receives payer payment related to that opportunity at any point within 12 months after the date of identification — whether during or after the Pilot Period — MedicalRouter is entitled to the 25% success fee on the recovered amount.

The Client may not avoid the success fee obligation by delaying the filing of an appeal, resubmission, or corrected claim beyond the Pilot Period. The fee applies to any recovery that occurs within the 12-month Recovery Window, regardless of when the Client initiates the follow-up action, provided the underlying opportunity was identified by MedicalRouter.

5. PAYMENT OF SUCCESS FEE

The Client agrees to pay MedicalRouter's success fee within 7 calendar days of receiving a recovered payment from a payer. The Client is responsible for promptly notifying MedicalRouter of any recovery related to an identified opportunity. MedicalRouter will invoice the Client for the applicable success fee upon notification or upon MedicalRouter's own identification of a recovery event. Invoices are due and payable within 7 calendar days of issuance.

6. VERIFICATION AND DOCUMENTATION

The Client agrees to provide MedicalRouter with documentation sufficient to verify recovered amounts when requested. Acceptable documentation includes, but is not limited to:

  • Updated Electronic Remittance Advice (ERA) or 835 files
  • Explanation of Benefits (EOB) documents
  • Remittance records or payer payment confirmations
  • Billing system records reflecting the corrected or recovered payment
  • Any other supporting documentation reasonably requested by MedicalRouter

Failure to provide verification documentation does not relieve the Client of the obligation to pay the success fee on recoveries that occurred within the Recovery Window.

7. CLIENT RESPONSIBILITIES

The Client is responsible for uploading accurate and complete billing documentation; reviewing all findings, recommendations, and generated documents before use or submission; ensuring that all appeals, resubmissions, and corrected claims are reviewed, approved, and submitted by qualified billing personnel; maintaining compliance with applicable payer requirements, regulations, and contractual obligations; and notifying MedicalRouter promptly of any recovery event within the Recovery Window.

8. NO GUARANTEE OF RECOVERY

MedicalRouter does not guarantee any specific recovery outcome. Actual reimbursement results depend on payer rules, documentation quality, coding accuracy, filing deadlines, provider contract terms, and other factors outside MedicalRouter's control. MedicalRouter's services are analytical and workflow tools only and do not constitute legal, coding, billing, or compliance advice.

9. CONFIDENTIALITY

Each party agrees to keep confidential the other party's non-public business information disclosed in connection with this Agreement. MedicalRouter will use reasonable and appropriate administrative, technical, and organizational safeguards to protect non-public Client information, including uploaded billing data, against unauthorized access, use, or disclosure. Client data will be used only as necessary to provide, maintain, secure, support, and improve the service.

10. LIMITATION OF LIABILITY

TO THE MAXIMUM EXTENT PERMITTED BY LAW, MEDICALROUTER'S TOTAL LIABILITY UNDER THIS AGREEMENT SHALL NOT EXCEED THE AMOUNT OF THE SETUP FEE PAID BY THE CLIENT. MEDICALROUTER SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR RELATED TO THIS AGREEMENT OR THE SERVICES PROVIDED HEREUNDER.

11. GOVERNING LAW

This Agreement shall be governed by and construed in accordance with the laws of the state in which the Client's principal place of business is located, or, if the parties cannot agree, the State of Delaware, without regard to conflict of law principles.

12. ENTIRE AGREEMENT

This Agreement, together with the MedicalRouter Terms of Use and Privacy Policy, constitutes the entire agreement between the parties with respect to the subject matter hereof and supersedes all prior discussions, representations, and agreements. Any modification to this Agreement must be in writing and signed by both parties.`

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
    from: process.env.RESEND_FROM_EMAIL || 'chris@medicalrouter.com',
    to: params.toEmail,
    subject: 'Your MedicalRouter Service Agreement — Signed Copy',
    html: `<p>Hi ${params.fullName},</p>
<p>Thank you for signing the MedicalRouter Service Agreement on behalf of <strong>${params.practiceName}</strong>.</p>
<p>A PDF copy of your signed agreement is attached to this email for your records.</p>
<p>Signed: ${params.agreedAt}</p>
<p>If you have any questions, please contact us at <a href="mailto:chris@medicalrouter.com">chris@medicalrouter.com</a>.</p>
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

    // Authenticate via the Bearer token sent in the Authorization header
    // (Next.js App Router API routes cannot reliably read Supabase auth cookies server-side)
    const serviceClient = getServiceClient()

    const authHeader = req.headers.get('authorization') || ''
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null

    let userId: string | null = null
    let userEmail: string | null = null

    if (bearerToken) {
      // Validate the token via the service client
      const { data: { user }, error: userError } = await serviceClient.auth.getUser(bearerToken)
      if (!user || userError) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
      }
      userId = user.id
      userEmail = user.email || null
    } else {
      // Fallback: try reading from cookies via @supabase/ssr
      try {
        const { createServerClient } = await import('@supabase/ssr')
        const { cookies } = await import('next/headers')
        const cookieStore = await cookies()
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
      } catch {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
      }
    }

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
