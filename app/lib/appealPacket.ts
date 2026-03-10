/**
 * Appeal Packet PDF Generator
 *
 * Generates a professional, letterhead-ready appeal packet containing:
 * 1. Cover page with practice info and summary
 * 2. Findings summary table
 * 3. Individual appeal letters — one per finding, grouped by payer
 *    Each letter is formatted for copy-paste onto practice letterhead.
 * 4. Submission checklist
 * 5. Evidence appendix (non-PHI segment references + CARC/RARC descriptions)
 *
 * Uses PDFKit for server-side PDF generation (Vercel-compatible, pure Node.js).
 * Listed in next.config.ts serverExternalPackages to prevent edge bundling.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit')
import type { Finding } from './database'
import { getCarcDescription, getRarcDescription } from './codeLookup'

// ─── Types ──────────────────────────────────────────────────────────────────

type AppealPacketOptions = {
  accountName: string
  findings: Finding[]
  uploadIds: string[]
  contactName?: string
  contactPhone?: string
  contactEmail?: string
  dateRange?: { start: string; end: string }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number | null | undefined) =>
  `$${(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const today = () =>
  new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

// Derive a human-readable CARC category for the letter subject line
function getCarcCategory(carcCodes: string[] | null): string {
  if (!carcCodes || carcCodes.length === 0) return 'Claim Denial'
  const primary = carcCodes[0].replace(/^(CO|PR|OA|PI)-?/i, '')
  const n = parseInt(primary, 10)
  if ([45, 59, 97, 4, 18, 22, 23, 24].includes(n)) return 'Contractual / Bundling Dispute'
  if ([29, 31].includes(n)) return 'Timely Filing Dispute'
  if ([50, 57, 96, 151, 167, 197].includes(n)) return 'Medical Necessity Appeal'
  if ([16, 27, 33, 109, 125].includes(n)) return 'Missing or Invalid Information'
  if ([1, 2, 3].includes(n)) return 'Deductible / Coinsurance Dispute'
  return 'Claim Denial Appeal'
}

// ─── Professional letter copy by finding type ────────────────────────────────

function getAppealLetterContent(finding: Finding, opts: AppealPacketOptions): string[] {
  const evidence = finding.evidence as Record<string, unknown> | null
  const source = evidence?.source as Record<string, unknown> | null
  const claimId = (source?.claim_id as string) || '[CLAIM REFERENCE NUMBER]'
  const contactName = opts.contactName || '[PROVIDER NAME]'
  const contactPhone = opts.contactPhone || '[PHONE NUMBER]'
  const contactEmail = opts.contactEmail || '[EMAIL ADDRESS]'
  const practiceName = opts.accountName || '[PRACTICE NAME]'
  const payer = finding.payer || '[PAYER NAME]'
  const dos = finding.service_date || '[DATE OF SERVICE]'
  const cpt = finding.procedure_code || '[PROCEDURE CODE]'
  const carcList = finding.carc_codes?.join(', ') || 'N/A'
  const rarcList = finding.rarc_codes?.join(', ') || 'N/A'

  const header = [
    `[PRACTICE LETTERHEAD — PLACE ON OFFICIAL LETTERHEAD BEFORE SENDING]`,
    ``,
    `${today()}`,
    ``,
    `Appeals Department`,
    `${payer}`,
    `[PAYER MAILING ADDRESS]`,
    ``,
    `RE: Formal Appeal — ${finding.finding_type === 'UNDERPAID' ? 'Underpayment' : getCarcCategory(finding.carc_codes)}`,
    `Claim Reference Number: ${claimId}`,
    `Date of Service: ${dos}`,
    `Procedure Code(s): ${cpt}`,
    `CARC Code(s): ${carcList}`,
    rarcList !== 'N/A' ? `RARC Code(s): ${rarcList}` : null,
    ``,
    `To Whom It May Concern:`,
    ``,
  ].filter(l => l !== null) as string[]

  const footer = [
    ``,
    `We respectfully request a written response within 30 days of receipt of this letter.`,
    `Please direct all correspondence to:`,
    ``,
    `    ${contactName}`,
    `    ${practiceName}`,
    `    Phone: ${contactPhone}`,
    `    Email: ${contactEmail}`,
    ``,
    `Thank you for your prompt attention to this matter.`,
    ``,
    `Sincerely,`,
    ``,
    ``,
    `_________________________________`,
    `${contactName}`,
    `${practiceName}`,
    ``,
    `Enclosures:`,
    `  - Copy of original claim (CMS-1500 / UB-04)`,
    `  - Copy of Explanation of Benefits (EOB) / ERA`,
    `  - Supporting documentation (see checklist)`,
  ]

  let body: string[]

  switch (finding.finding_type) {
    case 'UNDERPAID': {
      const underpayment = fmt(finding.underpayment_amount)
      const billed = fmt(finding.billed_amount)
      const allowed = fmt(finding.allowed_amount)
      const paid = fmt(finding.paid_amount)
      const pr = fmt(finding.patient_responsibility)

      body = [
        `We are writing to formally appeal the underpayment on the above-referenced claim. Our records indicate that the reimbursement received does not reflect the contracted rate or the correct application of benefits under our provider agreement.`,
        ``,
        `PAYMENT SUMMARY`,
        ``,
        `    Amount Billed:                ${billed}`,
        `    Contractual Allowed Amount:   ${allowed}`,
        `    Patient Responsibility:       ${pr}`,
        `    Amount Paid by Payer:         ${paid}`,
        `    ─────────────────────────────────────────`,
        `    Underpayment Amount:          ${underpayment}`,
        ``,
        `CARC Code ${carcList} was applied to this claim. Per our provider agreement and the applicable fee schedule, the expected payer payment for CPT ${cpt} rendered on ${dos} is ${allowed}. After applying the patient responsibility of ${pr}, the expected net payer payment is ${fmt((finding.allowed_amount ?? 0) - (finding.patient_responsibility ?? 0))}. The actual payment received was ${paid}, resulting in an underpayment of ${underpayment}.`,
        ``,
        `We are requesting that you review the contracted rate for CPT ${cpt} and reprocess this claim to issue the balance of ${underpayment}. Please provide a corrected Explanation of Benefits (EOB) upon reprocessing.`,
        ``,
        `If you believe this payment was made correctly, please provide a written explanation citing the specific contract provision or fee schedule section that supports the payment amount, along with a copy of the applicable fee schedule.`,
      ]
      break
    }

    case 'DENIED_APPEALABLE': {
      const primaryCarc = (finding.carc_codes?.[0] ?? '').replace(/^(CO|PR|OA|PI)-?/i, '')
      const n = parseInt(primaryCarc, 10)

      if ([29, 31].includes(n)) {
        // Timely filing
        body = [
          `We are writing to formally appeal the denial of the above-referenced claim on the basis of timely filing (CARC ${carcList}).`,
          ``,
          `GROUNDS FOR APPEAL`,
          ``,
          `This claim was submitted within the timely filing period required under our provider agreement. We have enclosed documentation demonstrating the original submission date, including clearinghouse confirmation and/or date-stamped claim records.`,
          ``,
          `Timely filing denials are not appropriate when the provider can demonstrate that the claim was submitted within the required timeframe. Pursuant to [PAYER NAME]'s provider manual and our contractual agreement, the timely filing period for this claim type is [TIMELY FILING PERIOD — e.g., 12 months from date of service]. Our records confirm this claim was submitted on [ORIGINAL SUBMISSION DATE], which is within the required period.`,
          ``,
          `We request that you waive the timely filing denial and reprocess this claim for payment of ${fmt(finding.billed_amount)} for CPT ${cpt} rendered on ${dos}.`,
          ``,
          `DOCUMENTATION ENCLOSED`,
          `  - Clearinghouse submission confirmation with timestamp`,
          `  - Date-stamped copy of original claim`,
          `  - Any prior payer correspondence regarding this claim`,
        ]
      } else if ([97, 59, 4, 18, 22, 23, 24].includes(n)) {
        // Bundling / modifier / included in another service
        body = [
          `We are writing to formally appeal the denial of the above-referenced claim. This claim was denied under CARC ${carcList}, indicating the service was considered included in another procedure or subject to bundling rules.`,
          ``,
          `GROUNDS FOR APPEAL`,
          ``,
          `We respectfully disagree with this determination. CPT ${cpt} represents a distinct and separately identifiable service that was performed on ${dos} and is not included in, or bundled with, any other procedure billed on the same date. The services rendered were medically necessary, clinically distinct, and appropriately documented in the patient's medical record.`,
          ``,
          `Per the National Correct Coding Initiative (NCCI) edits and the applicable CPT guidelines, CPT ${cpt} is a separately reportable service when [BRIEF CLINICAL JUSTIFICATION — e.g., performed at a separate anatomical site / required distinct clinical decision-making / performed at a separate session]. The appropriate modifier has been appended to indicate the distinct nature of this service.`,
          ``,
          `We request that you review the operative/clinical notes enclosed herein and reprocess this claim for payment.`,
          ``,
          `DOCUMENTATION ENCLOSED`,
          `  - Clinical/operative notes for date of service`,
          `  - Modifier justification documentation`,
          `  - Applicable NCCI edit reference`,
        ]
      } else if ([50, 57, 96, 151, 167, 197].includes(n)) {
        // Medical necessity
        body = [
          `We are writing to formally appeal the denial of the above-referenced claim on the basis of medical necessity (CARC ${carcList}).`,
          ``,
          `GROUNDS FOR APPEAL`,
          ``,
          `The service rendered — CPT ${cpt} on ${dos} — was medically necessary for the diagnosis and treatment of the patient's condition. The treating provider determined that this service was required based on the patient's clinical presentation, history, and applicable evidence-based clinical guidelines.`,
          ``,
          `We respectfully request that your medical director or a qualified peer reviewer conduct a clinical review of the enclosed documentation. The medical record demonstrates that the patient met the criteria for this service as defined by [PAYER NAME]'s coverage policy and the applicable clinical guidelines.`,
          ``,
          `Denial of medically necessary services is inconsistent with [PAYER NAME]'s obligation to provide covered benefits under the patient's plan. We request that this claim be approved and reprocessed for payment.`,
          ``,
          `DOCUMENTATION ENCLOSED`,
          `  - Complete clinical notes for date of service`,
          `  - Letter of medical necessity from treating provider`,
          `  - Relevant diagnostic test results`,
          `  - Applicable clinical guidelines or peer-reviewed literature`,
        ]
      } else if ([16, 27, 33, 109, 125].includes(n)) {
        // Missing / invalid information
        body = [
          `We are writing to formally appeal the denial of the above-referenced claim. This claim was denied under CARC ${carcList}, indicating missing or invalid information was cited as the reason for denial.`,
          ``,
          `GROUNDS FOR APPEAL`,
          ``,
          `We have reviewed the original claim and the Explanation of Benefits (EOB) and believe the required information was included at the time of submission. We are resubmitting this appeal with the complete and corrected claim information enclosed.`,
          ``,
          `If specific information was missing or invalid, please identify the precise field(s) at issue so we may provide the correct information. We are committed to resolving this matter promptly and request that you reprocess the corrected claim.`,
          ``,
          `DOCUMENTATION ENCLOSED`,
          `  - Corrected claim (CMS-1500 / UB-04)`,
          `  - Supporting documentation addressing the cited deficiency`,
          `  - Original EOB / ERA`,
        ]
      } else {
        // Generic appealable denial
        body = [
          `We are writing to formally appeal the denial of the above-referenced claim (CARC ${carcList}).`,
          ``,
          `GROUNDS FOR APPEAL`,
          ``,
          `${finding.rationale}`,
          ``,
          `We believe this claim was denied in error and that the services rendered on ${dos} were covered, medically necessary, and properly billed. We respectfully request that you conduct a full review of this claim and the enclosed supporting documentation and reprocess the claim for appropriate payment.`,
          ``,
          `DOCUMENTATION ENCLOSED`,
          `  - Copy of original claim`,
          `  - Copy of EOB / ERA`,
          `  - Supporting clinical documentation`,
        ]
      }
      break
    }

    default: {
      body = [
        `We are writing to request reconsideration of the above-referenced claim.`,
        ``,
        `${finding.rationale}`,
        ``,
        `Recommended Action: ${finding.action}`,
        ``,
        `We respectfully request a thorough review of this claim and the enclosed documentation. Please reprocess or provide a written explanation of the determination within 30 days.`,
      ]
    }
  }

  return [...header, ...body, ...footer]
}

// ─── PDF Generation ─────────────────────────────────────────────────────────

export function generateAppealPacketPdf(opts: AppealPacketOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 72, // 1-inch margins (standard business letter)
      size: 'LETTER',
      bufferPages: true, // needed for page footers
    })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const W = doc.page.width - 144 // content width (72pt margin each side)

    // ── Helper: horizontal rule ──
    const rule = (color = '#cccccc') => {
      doc.moveTo(72, doc.y).lineTo(72 + W, doc.y).strokeColor(color).lineWidth(0.5).stroke()
      doc.lineWidth(1).strokeColor('#000000')
      doc.moveDown(0.5)
    }

    // ── Helper: section heading ──
    const sectionHeading = (text: string) => {
      doc.moveDown(0.5)
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a1a').text(text)
      doc.moveDown(0.3)
      rule('#333333')
      doc.fillColor('#000000')
    }

    const dateStr = today()

    // ═══════════════════════════════════════════════════════════════════════
    // PAGE 1: COVER
    // ═══════════════════════════════════════════════════════════════════════
    doc.fontSize(26).font('Helvetica-Bold').fillColor('#1a1a1a').text('Appeal Packet', { align: 'left' })
    doc.moveDown(0.2)
    doc.fontSize(16).font('Helvetica').fillColor('#333333').text(opts.accountName)
    doc.moveDown(0.2)
    doc.fontSize(10).fillColor('#666666').text(`Generated: ${dateStr}`)
    doc.fillColor('#000000')
    doc.moveDown(1.5)
    rule()

    // Summary stats
    const underpaid = opts.findings.filter(f => f.finding_type === 'UNDERPAID')
    const appealable = opts.findings.filter(f => f.finding_type === 'DENIED_APPEALABLE')
    const needsReview = opts.findings.filter(f => f.finding_type === 'NEEDS_REVIEW')
    const incomplete = opts.findings.filter(f => f.finding_type === 'INCOMPLETE_DATA')
    const totalRecovery = opts.findings.reduce((sum, f) => sum + (f.underpayment_amount || 0), 0)
    const appealFindings = opts.findings.filter(
      f => f.finding_type === 'UNDERPAID' || f.finding_type === 'DENIED_APPEALABLE'
    )

    doc.fontSize(13).font('Helvetica-Bold').text('Summary')
    doc.moveDown(0.4)
    doc.fontSize(10).font('Helvetica')
    const statLines = [
      [`Total Potential Recovery:`, fmt(totalRecovery)],
      [`Underpaid Claims:`, `${underpaid.length}  (${fmt(underpaid.reduce((s, f) => s + (f.underpayment_amount || 0), 0))})`],
      [`Appealable Denials:`, `${appealable.length}`],
      [`Needs Review:`, `${needsReview.length}`],
      [`Incomplete Data:`, `${incomplete.length}`],
      [`Total Appeal Letters Enclosed:`, `${appealFindings.length}`],
    ]
    for (const [label, value] of statLines) {
      const y = doc.y
      doc.text(label, 72, y, { width: 240, lineBreak: false })
      doc.text(value, 320, y, { width: 200 })
    }
    doc.moveDown(1.5)

    // Top findings by recovery
    const top5 = [...opts.findings]
      .sort((a, b) => (b.underpayment_amount || 0) - (a.underpayment_amount || 0))
      .slice(0, 5)

    if (top5.length > 0) {
      doc.fontSize(13).font('Helvetica-Bold').text('Top Findings by Recovery Amount')
      doc.moveDown(0.4)
      doc.fontSize(9).font('Helvetica')
      for (const f of top5) {
        const y = doc.y
        doc.text(f.procedure_code || 'N/A', 72, y, { width: 60, lineBreak: false })
        doc.text((f.payer || 'Unknown').substring(0, 22), 140, y, { width: 160, lineBreak: false })
        doc.text(f.finding_type.replace(/_/g, ' '), 310, y, { width: 130, lineBreak: false })
        doc.text(fmt(f.underpayment_amount), 450, y, { width: 80 })
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PAGE 2: FINDINGS SUMMARY TABLE
    // ═══════════════════════════════════════════════════════════════════════
    doc.addPage()
    sectionHeading('Findings Summary')

    const cols = [72, 130, 260, 350, 415, 470]
    doc.fontSize(8).font('Helvetica-Bold')
    const hY = doc.y
    doc.text('CPT', cols[0], hY, { width: 50, lineBreak: false })
    doc.text('Payer', cols[1], hY, { width: 125, lineBreak: false })
    doc.text('Type', cols[2], hY, { width: 85, lineBreak: false })
    doc.text('Recovery', cols[3], hY, { width: 60, lineBreak: false })
    doc.text('Conf.', cols[4], hY, { width: 50, lineBreak: false })
    doc.text('Status', cols[5], hY, { width: 60 })
    doc.moveDown(0.3)
    rule()

    doc.fontSize(8).font('Helvetica')
    for (const f of opts.findings) {
      if (doc.y > doc.page.height - 80) doc.addPage()
      const rowY = doc.y
      doc.text(f.procedure_code || 'N/A', cols[0], rowY, { width: 50, lineBreak: false })
      doc.text((f.payer || 'Unknown').substring(0, 20), cols[1], rowY, { width: 125, lineBreak: false })
      doc.text(f.finding_type.replace(/_/g, ' ').substring(0, 20), cols[2], rowY, { width: 85, lineBreak: false })
      doc.text(f.underpayment_amount ? fmt(f.underpayment_amount) : '—', cols[3], rowY, { width: 60, lineBreak: false })
      doc.text(f.confidence, cols[4], rowY, { width: 50, lineBreak: false })
      doc.text(f.status, cols[5], rowY, { width: 60 })
      doc.moveDown(0.2)
    }

    // ═══════════════════════════════════════════════════════════════════════
    // APPEAL LETTERS — one per finding, grouped by payer
    // ═══════════════════════════════════════════════════════════════════════
    const byPayer = new Map<string, Finding[]>()
    for (const f of appealFindings) {
      const payer = f.payer || 'Unknown Payer'
      if (!byPayer.has(payer)) byPayer.set(payer, [])
      byPayer.get(payer)!.push(f)
    }

    for (const [payer, findings] of byPayer) {
      doc.addPage()
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#1a1a1a')
        .text(`Appeal Letters — ${payer}`)
      doc.moveDown(0.3)
      doc.fontSize(9).font('Helvetica').fillColor('#555555')
        .text('The following letters are formatted for copy-paste onto your practice letterhead. Replace all bracketed placeholders before sending.')
      doc.fillColor('#000000')
      doc.moveDown(0.5)
      rule()

      for (const f of findings) {
        if (doc.y > doc.page.height - 200) doc.addPage()

        // Letter label
        doc.fontSize(10).font('Helvetica-Bold')
          .text(`Letter: CPT ${f.procedure_code || 'N/A'} — ${f.finding_type === 'UNDERPAID' ? 'Underpayment Appeal' : getCarcCategory(f.carc_codes)}`)
        doc.moveDown(0.3)

        // Letter body — monospace for clean copy-paste
        const lines = getAppealLetterContent(f, opts)
        doc.fontSize(9).font('Courier')
        for (const line of lines) {
          if (doc.y > doc.page.height - 60) doc.addPage()
          doc.text(line === '' ? ' ' : line, { lineGap: 1 })
        }
        doc.moveDown(1)
        rule('#aaaaaa')
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SUBMISSION CHECKLIST
    // ═══════════════════════════════════════════════════════════════════════
    doc.addPage()
    sectionHeading('Appeal Submission Checklist')

    const checklistSections = [
      {
        category: 'For All Appeals',
        items: [
          'Copy of the original claim (CMS-1500 or UB-04)',
          'Copy of the EOB/ERA showing the denial or underpayment',
          'Completed appeal letter (printed on practice letterhead)',
          'Provider NPI and Tax ID verification',
          'Patient name, date of birth, and member ID',
        ],
      },
      {
        category: 'For Underpayment Appeals',
        items: [
          'Copy of contracted fee schedule (relevant CPT section)',
          'Calculation showing expected vs. actual payment',
          'Any prior correspondence about this claim',
          'Corrected EOB request if applicable',
        ],
      },
      {
        category: 'For Medical Necessity Appeals',
        items: [
          'Complete clinical notes for date of service',
          'Letter of medical necessity from treating provider',
          'Relevant diagnostic test results',
          'Applicable clinical guidelines or peer-reviewed literature',
          'Prior authorization documentation (if applicable)',
        ],
      },
      {
        category: 'For Timely Filing Appeals',
        items: [
          'Clearinghouse submission confirmation with timestamp',
          'Date-stamped copy of original claim',
          'Any prior payer correspondence regarding this claim',
          'Proof of eligibility verification at time of service',
        ],
      },
      {
        category: 'For Bundling / Modifier Appeals',
        items: [
          'Operative or clinical notes showing distinct procedures',
          'Documentation of separate anatomical sites (if applicable)',
          'Modifier justification documentation',
          'NCCI edit reference or applicable CPT guideline',
        ],
      },
      {
        category: 'Submission Instructions',
        items: [
          'Send via certified mail with return receipt OR via payer portal with confirmation',
          'Keep a copy of everything submitted',
          'Note the submission date and expected response deadline (typically 30–60 days)',
          'Follow up in writing if no response within 30 days',
          'Escalate to state insurance commissioner if appeal is wrongly denied',
        ],
      },
    ]

    for (const section of checklistSections) {
      if (doc.y > doc.page.height - 100) doc.addPage()
      doc.fontSize(11).font('Helvetica-Bold').text(section.category)
      doc.moveDown(0.2)
      doc.fontSize(9).font('Helvetica')
      for (const item of section.items) {
        doc.text(`\u25A1  ${item}`, { indent: 15, lineGap: 2 })
      }
      doc.moveDown(0.6)
    }

    // ═══════════════════════════════════════════════════════════════════════
    // EVIDENCE APPENDIX
    // ═══════════════════════════════════════════════════════════════════════
    doc.addPage()
    sectionHeading('Evidence Appendix')
    doc.fontSize(9).font('Helvetica').fillColor('#555555')
      .text('This appendix contains non-PHI evidence references only. No patient identifiers are included. CARC/RARC descriptions sourced from the Washington Publishing Company (WPC).')
    doc.fillColor('#000000')
    doc.moveDown(0.5)

    for (const f of opts.findings) {
      if (doc.y > doc.page.height - 120) doc.addPage()

      doc.fontSize(11).font('Helvetica-Bold')
        .text(`${f.procedure_code || 'N/A'} — ${f.finding_type.replace(/_/g, ' ')}`)
      doc.moveDown(0.2)
      doc.fontSize(8).font('Helvetica')

      // Math trace
      if (f.billed_amount != null || f.allowed_amount != null) {
        doc.text(
          `Math: Billed=${fmt(f.billed_amount)}  Allowed=${fmt(f.allowed_amount)}  Paid=${fmt(f.paid_amount)}  PR=${fmt(f.patient_responsibility)}  Underpayment=${fmt(f.underpayment_amount)}`
        )
      }

      // CARC descriptions
      if (f.carc_codes && f.carc_codes.length > 0) {
        for (const code of f.carc_codes) {
          const desc = getCarcDescription(code)
          doc.text(`CARC ${code}: ${desc || 'Description not available'}  [source: WPC]`)
        }
      }

      // RARC descriptions
      if (f.rarc_codes && f.rarc_codes.length > 0) {
        for (const code of f.rarc_codes) {
          const desc = getRarcDescription(code)
          doc.text(`RARC ${code}: ${desc || 'Description not available'}  [source: WPC]`)
        }
      }

      // Source refs
      const evidence = f.evidence as Record<string, unknown> | null
      const src = evidence?.source as Record<string, unknown> | null
      if (src?.claim_id) doc.text(`Claim reference: ${src.claim_id}`)
      if (src?.segment_indices) doc.text(`Segment indices: ${JSON.stringify(src.segment_indices)}`)

      doc.moveDown(0.5)
      rule()
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PAGE FOOTERS
    // ═══════════════════════════════════════════════════════════════════════
    const range = doc.bufferedPageRange()
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i)
      const pageNum = i - range.start + 1
      const total = range.count
      doc.fontSize(7).fillColor('#999999')
        .text(
          `${opts.accountName}  —  Appeal Packet  —  Page ${pageNum} of ${total}  —  Generated by Revenue Recovery Engine  —  CONFIDENTIAL`,
          72,
          doc.page.height - 36,
          { align: 'center', width: W }
        )
      doc.fillColor('#000000')
    }

    doc.end()
  })
}
