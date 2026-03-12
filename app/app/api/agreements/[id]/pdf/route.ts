import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { execSync } from 'child_process'
import { writeFileSync, readFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

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
