/**
 * Appeal Packet PDF Generator
 *
 * Generates a comprehensive appeal packet containing:
 * 1. Cover page with summary
 * 2. Summary table of findings
 * 3. Individual appeal letters grouped by payer
 * 4. Checklist page
 * 5. Evidence appendix (non-PHI)
 *
 * Uses PDFKit for server-side PDF generation (Vercel-compatible, pure Node.js).
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

// ─── Appeal letter content ───────────────────────────────────────────────────

function getAppealLetterContent(finding: Finding, opts: AppealPacketOptions): string {
  const evidence = finding.evidence as Record<string, unknown>
  const claimId = ((evidence?.source as Record<string, unknown>)?.claim_id as string) || 'See attached'
  const contactName = opts.contactName || 'Billing Department'
  const practiceName = opts.accountName

  switch (finding.finding_type) {
    case 'UNDERPAID':
      return [
        `APPEAL FOR UNDERPAYMENT`,
        ``,
        `Claim Reference: ${claimId}`,
        `Date of Service: ${finding.service_date || 'N/A'}`,
        `Procedure Code: ${finding.procedure_code || 'N/A'}`,
        ``,
        `Dear Claims Review Department,`,
        ``,
        `We are formally appealing the underpayment on the above-referenced claim.`,
        ``,
        `  Billed Amount:          $${(finding.billed_amount || 0).toFixed(2)}`,
        `  Allowed Amount:         $${(finding.allowed_amount || 0).toFixed(2)}`,
        `  Amount Paid:            $${(finding.paid_amount || 0).toFixed(2)}`,
        `  Patient Responsibility: $${(finding.patient_responsibility || 0).toFixed(2)}`,
        `  Underpayment:           $${(finding.underpayment_amount || 0).toFixed(2)}`,
        ``,
        finding.rationale,
        ``,
        `We respectfully request that the underpayment of $${(finding.underpayment_amount || 0).toFixed(2)} be reviewed and remitted within 30 days.`,
        ``,
        `Sincerely,`,
        contactName,
        practiceName,
      ].join('\n')

    case 'DENIED_APPEALABLE':
      return [
        `APPEAL FOR DENIED CLAIM`,
        ``,
        `Claim Reference: ${claimId}`,
        `Date of Service: ${finding.service_date || 'N/A'}`,
        `Procedure Code: ${finding.procedure_code || 'N/A'}`,
        `CARC Code(s): ${finding.carc_codes?.join(', ') || 'N/A'}`,
        ``,
        `Dear Claims Review Department,`,
        ``,
        `We are formally appealing the denial of the above-referenced claim.`,
        ``,
        finding.rationale,
        ``,
        `We respectfully request that this claim be reviewed and reprocessed for payment.`,
        ``,
        `Sincerely,`,
        contactName,
        practiceName,
      ].join('\n')

    default:
      return [
        `REQUEST FOR RECONSIDERATION`,
        ``,
        `Claim Reference: ${claimId}`,
        `Date of Service: ${finding.service_date || 'N/A'}`,
        `Procedure Code: ${finding.procedure_code || 'N/A'}`,
        ``,
        `Dear Claims Review Department,`,
        ``,
        `We are requesting reconsideration of the above-referenced claim.`,
        ``,
        finding.rationale,
        ``,
        `Recommended Action: ${finding.action}`,
        ``,
        `Sincerely,`,
        contactName,
        practiceName,
      ].join('\n')
  }
}

// ─── PDF Generation ─────────────────────────────────────────────────────────

export function generateAppealPacketPdf(opts: AppealPacketOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const W = doc.page.width - 100 // content width (50 margin each side)
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

    // ── Helper: section divider ──
    const divider = () => {
      doc.moveTo(50, doc.y).lineTo(50 + W, doc.y).strokeColor('#cccccc').stroke()
      doc.moveDown(0.5)
    }

    // ── Page 1: Cover ──────────────────────────────────────────────────────
    doc.fontSize(28).font('Helvetica-Bold').text('Appeal Packet', { align: 'left' })
    doc.moveDown(0.3)
    doc.fontSize(14).font('Helvetica').text(opts.accountName)
    doc.moveDown(0.3)
    doc.fontSize(10).fillColor('#555555').text(`Generated: ${dateStr}`)
    if (opts.dateRange) {
      doc.text(`Date Range: ${opts.dateRange.start} to ${opts.dateRange.end}`)
    }
    doc.text(`Uploads Analyzed: ${opts.uploadIds.length}`)
    doc.text(`Total Findings: ${opts.findings.length}`)
    doc.fillColor('#000000')
    doc.moveDown(1)
    divider()

    // Summary stats
    const underpaid = opts.findings.filter(f => f.finding_type === 'UNDERPAID')
    const appealable = opts.findings.filter(f => f.finding_type === 'DENIED_APPEALABLE')
    const needsReview = opts.findings.filter(f => f.finding_type === 'NEEDS_REVIEW')
    const incomplete = opts.findings.filter(f => f.finding_type === 'INCOMPLETE_DATA')
    const totalRecovery = opts.findings.reduce((sum, f) => sum + (f.underpayment_amount || 0), 0)

    doc.fontSize(13).font('Helvetica-Bold').text('Summary')
    doc.moveDown(0.3)
    doc.fontSize(10).font('Helvetica')
    doc.text(`Total Potential Recovery:  $${totalRecovery.toFixed(2)}`, { continued: false })
    doc.text(`Underpaid Claims:          ${underpaid.length}  ($${underpaid.reduce((s, f) => s + (f.underpayment_amount || 0), 0).toFixed(2)})`)
    doc.text(`Appealable Denials:        ${appealable.length}`)
    doc.text(`Needs Review:              ${needsReview.length}`)
    doc.text(`Incomplete Data:           ${incomplete.length}`)
    doc.moveDown(1)

    // Top findings
    const top5 = [...opts.findings]
      .sort((a, b) => (b.underpayment_amount || 0) - (a.underpayment_amount || 0))
      .slice(0, 5)

    if (top5.length > 0) {
      doc.fontSize(13).font('Helvetica-Bold').text('Top Findings by Recovery Amount')
      doc.moveDown(0.3)
      doc.fontSize(9).font('Helvetica')
      for (const f of top5) {
        doc.text(`${f.procedure_code || 'N/A'}  |  ${(f.payer || 'Unknown').substring(0, 25)}  |  ${f.finding_type}  |  $${(f.underpayment_amount || 0).toFixed(2)}  |  ${f.confidence}`)
      }
    }

    // ── Page 2: Findings Summary Table ────────────────────────────────────
    doc.addPage()
    doc.fontSize(18).font('Helvetica-Bold').text('Findings Summary')
    doc.moveDown(0.5)
    divider()

    // Column positions
    const c = [50, 110, 230, 310, 370, 430, 490]
    doc.fontSize(8).font('Helvetica-Bold')
    doc.text('Procedure', c[0], doc.y, { width: 55, lineBreak: false })
    doc.text('Payer', c[1], doc.y, { width: 115, lineBreak: false })
    doc.text('Type', c[2], doc.y, { width: 75, lineBreak: false })
    doc.text('Recovery', c[3], doc.y, { width: 55, lineBreak: false })
    doc.text('Conf.', c[4], doc.y, { width: 55, lineBreak: false })
    doc.text('Status', c[5], doc.y, { width: 60 })
    doc.moveDown(0.3)
    divider()

    doc.fontSize(8).font('Helvetica')
    for (const f of opts.findings) {
      if (doc.y > doc.page.height - 80) doc.addPage()
      const rowY = doc.y
      doc.text(f.procedure_code || 'N/A', c[0], rowY, { width: 55, lineBreak: false })
      doc.text((f.payer || 'Unknown').substring(0, 18), c[1], rowY, { width: 115, lineBreak: false })
      doc.text(f.finding_type.replace('_', ' ').substring(0, 18), c[2], rowY, { width: 75, lineBreak: false })
      doc.text(`$${(f.underpayment_amount || 0).toFixed(2)}`, c[3], rowY, { width: 55, lineBreak: false })
      doc.text(f.confidence, c[4], rowY, { width: 55, lineBreak: false })
      doc.text(f.status, c[5], rowY, { width: 60 })
      doc.moveDown(0.2)
    }

    // ── Appeal Letters ─────────────────────────────────────────────────────
    const appealFindings = opts.findings.filter(
      f => f.finding_type === 'UNDERPAID' || f.finding_type === 'DENIED_APPEALABLE'
    )

    // Group by payer
    const byPayer = new Map<string, Finding[]>()
    for (const f of appealFindings) {
      const payer = f.payer || 'Unknown Payer'
      if (!byPayer.has(payer)) byPayer.set(payer, [])
      byPayer.get(payer)!.push(f)
    }

    for (const [payer, findings] of byPayer) {
      doc.addPage()
      doc.fontSize(16).font('Helvetica-Bold').text(`Appeal Letters — ${payer}`)
      doc.moveDown(0.5)
      divider()

      for (const f of findings) {
        if (doc.y > doc.page.height - 150) doc.addPage()
        const letterContent = getAppealLetterContent(f, opts)
        doc.fontSize(10).font('Courier').text(letterContent, { lineGap: 2 })
        doc.moveDown(1)
        divider()
      }
    }

    // ── Checklist Page ─────────────────────────────────────────────────────
    doc.addPage()
    doc.fontSize(18).font('Helvetica-Bold').text('Appeal Submission Checklist')
    doc.moveDown(0.5)
    divider()

    const checklistSections = [
      {
        category: 'For All Appeals',
        items: [
          'Copy of the original claim (CMS-1500 or UB-04)',
          'Copy of the EOB/ERA showing the denial or underpayment',
          'Completed appeal letter (see letters section)',
          'Provider NPI and Tax ID verification',
        ],
      },
      {
        category: 'For Underpayment Appeals',
        items: [
          'Copy of contracted fee schedule (relevant section)',
          'Calculation showing expected vs. actual payment',
          'Any prior correspondence about this claim',
        ],
      },
      {
        category: 'For Medical Necessity Appeals',
        items: [
          'Clinical notes for date of service',
          'Letter of medical necessity from treating provider',
          'Relevant diagnostic test results',
          'Applicable clinical guidelines or literature',
        ],
      },
      {
        category: 'For Timely Filing Appeals',
        items: [
          'Proof of original submission (clearinghouse confirmation)',
          'Date-stamped copy of original claim',
          'Any prior payer correspondence',
        ],
      },
      {
        category: 'For Bundling / Modifier Appeals',
        items: [
          'Operative notes showing distinct procedures',
          'Documentation of separate anatomical sites',
          'Modifier justification documentation',
        ],
      },
    ]

    for (const section of checklistSections) {
      if (doc.y > doc.page.height - 100) doc.addPage()
      doc.fontSize(11).font('Helvetica-Bold').text(section.category)
      doc.moveDown(0.2)
      doc.fontSize(9).font('Helvetica')
      for (const item of section.items) {
        doc.text(`[ ]  ${item}`, { indent: 15 })
      }
      doc.moveDown(0.5)
    }

    // ── Evidence Appendix ──────────────────────────────────────────────────
    doc.addPage()
    doc.fontSize(18).font('Helvetica-Bold').text('Evidence Appendix')
    doc.moveDown(0.3)
    doc.fontSize(9).font('Helvetica').fillColor('#555555')
      .text('This appendix contains non-PHI evidence references only. No patient identifiers are included.')
    doc.fillColor('#000000')
    doc.moveDown(0.5)
    divider()

    for (const f of opts.findings) {
      if (doc.y > doc.page.height - 120) doc.addPage()
      doc.fontSize(11).font('Helvetica-Bold')
        .text(`${f.procedure_code || 'N/A'} — ${f.finding_type}`)
      doc.moveDown(0.2)
      doc.fontSize(8).font('Helvetica')

      // Math trace
      if (f.billed_amount != null || f.allowed_amount != null) {
        doc.text(
          `Math: Billed=$${(f.billed_amount || 0).toFixed(2)}  Allowed=$${(f.allowed_amount || 0).toFixed(2)}  Paid=$${(f.paid_amount || 0).toFixed(2)}  PR=$${(f.patient_responsibility || 0).toFixed(2)}  Underpayment=$${(f.underpayment_amount || 0).toFixed(2)}`
        )
      }

      // CARC/RARC descriptions
      if (f.carc_codes && f.carc_codes.length > 0) {
        for (const code of f.carc_codes) {
          const desc = getCarcDescription(code)
          doc.text(`CARC ${code}: ${desc || 'Description not available'}  [source: WPC]`)
        }
      }
      if (f.rarc_codes && f.rarc_codes.length > 0) {
        for (const code of f.rarc_codes) {
          const desc = getRarcDescription(code)
          doc.text(`RARC ${code}: ${desc || 'Description not available'}  [source: WPC]`)
        }
      }

      // Evidence source refs
      const evidence = f.evidence as Record<string, unknown>
      const source = evidence?.source as Record<string, unknown>
      if (source?.claim_id) doc.text(`Claim reference: ${source.claim_id}`)
      if (source?.segment_indices) doc.text(`Segment indices: ${JSON.stringify(source.segment_indices)}`)

      doc.moveDown(0.5)
      divider()
    }

    // ── Page footers ───────────────────────────────────────────────────────
    const range = doc.bufferedPageRange()
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i)
      const pageNum = i - range.start + 1
      const total = range.count
      doc.fontSize(7).fillColor('#999999')
        .text(
          `${opts.accountName}  —  Appeal Packet  —  Page ${pageNum} of ${total}  —  Generated by Revenue Recovery Engine`,
          50,
          doc.page.height - 30,
          { align: 'center', width: W }
        )
      doc.fillColor('#000000')
    }

    doc.end()
  })
}
