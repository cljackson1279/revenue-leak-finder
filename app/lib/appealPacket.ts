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
 * Uses jsPDF for server-side PDF generation (Vercel-compatible).
 */

import { jsPDF } from 'jspdf'
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

// ─── Template variable substitution ─────────────────────────────────────────

function fillTemplate(template: string, vars: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || 'N/A')
  }
  return result
}

// ─── Appeal letter templates (inline for Vercel compatibility) ──────────────

function getAppealLetterContent(finding: Finding, opts: AppealPacketOptions): string {
  const evidence = finding.evidence as Record<string, unknown>
  const math = (evidence?.math || {}) as Record<string, number>

  const vars: Record<string, string> = {
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    practice_name: opts.accountName,
    payer: finding.payer || 'Unknown Payer',
    claim_id: ((evidence?.source as Record<string, unknown>)?.claim_id as string) || 'See attached',
    service_date: finding.service_date || 'N/A',
    procedure_code: finding.procedure_code || 'N/A',
    billed_amount: finding.billed_amount?.toFixed(2) || 'N/A',
    allowed_amount: finding.allowed_amount?.toFixed(2) || 'N/A',
    paid_amount: finding.paid_amount?.toFixed(2) || 'N/A',
    patient_responsibility: finding.patient_responsibility?.toFixed(2) || '0.00',
    underpayment_amount: finding.underpayment_amount?.toFixed(2) || 'N/A',
    expected_payer_payment: math.expected_payer_payment?.toFixed(2) || 'N/A',
    carc_codes: finding.carc_codes?.join(', ') || 'N/A',
    rarc_codes: finding.rarc_codes?.join(', ') || 'N/A',
    rationale: finding.rationale,
    contact_name: opts.contactName || 'Billing Department',
    contact_phone: opts.contactPhone || '',
    contact_email: opts.contactEmail || '',
  }

  // Select template based on finding type
  let letter = ''
  switch (finding.finding_type) {
    case 'UNDERPAID':
      letter = `APPEAL FOR UNDERPAYMENT\n\nClaim: ${vars.claim_id}\nDate of Service: ${vars.service_date}\nProcedure: ${vars.procedure_code}\n\nDear Claims Review Department,\n\nWe are formally appealing the underpayment on this claim.\n\nBilled: $${vars.billed_amount} | Allowed: $${vars.allowed_amount} | Paid: $${vars.paid_amount}\nPatient Responsibility: $${vars.patient_responsibility}\nUnderpayment: $${vars.underpayment_amount}\n\n${vars.rationale}\n\nWe request that the underpayment of $${vars.underpayment_amount} be reviewed and remitted.\n\nSincerely,\n${vars.contact_name}\n${vars.practice_name}`
      break
    case 'DENIED_APPEALABLE':
      letter = `APPEAL FOR DENIED CLAIM\n\nClaim: ${vars.claim_id}\nDate of Service: ${vars.service_date}\nProcedure: ${vars.procedure_code}\nCARC: ${vars.carc_codes}\n\nDear Claims Review Department,\n\nWe are formally appealing the denial of this claim.\n\n${vars.rationale}\n\nWe request that this claim be reviewed and reprocessed for payment.\n\nSincerely,\n${vars.contact_name}\n${vars.practice_name}`
      break
    default:
      letter = `REQUEST FOR RECONSIDERATION\n\nClaim: ${vars.claim_id}\nDate of Service: ${vars.service_date}\nProcedure: ${vars.procedure_code}\n\nDear Claims Review Department,\n\nWe are requesting reconsideration of this claim.\n\n${vars.rationale}\n\nAction: ${finding.action}\n\nSincerely,\n${vars.contact_name}\n${vars.practice_name}`
  }

  return letter
}

// ─── PDF Generation ─────────────────────────────────────────────────────────

export function generateAppealPacketPdf(opts: AppealPacketOptions): Buffer {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - 2 * margin
  let y = margin

  const addPageIfNeeded = (neededSpace: number) => {
    if (y + neededSpace > pageHeight - margin) {
      doc.addPage()
      y = margin
    }
  }

  const addHeader = (text: string) => {
    addPageIfNeeded(15)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(text, margin, y)
    y += 10
  }

  const addSubheader = (text: string) => {
    addPageIfNeeded(12)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(text, margin, y)
    y += 7
  }

  const addText = (text: string, fontSize = 10) => {
    doc.setFontSize(fontSize)
    doc.setFont('helvetica', 'normal')
    const lines = doc.splitTextToSize(text, contentWidth)
    for (const line of lines) {
      addPageIfNeeded(6)
      doc.text(line, margin, y)
      y += 5
    }
    y += 2
  }

  const addLine = () => {
    addPageIfNeeded(5)
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, y, pageWidth - margin, y)
    y += 5
  }

  // ── Page 1: Cover ──
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('Appeal Packet', margin, y + 10)
  y += 20

  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text(opts.accountName, margin, y)
  y += 8

  doc.setFontSize(10)
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin, y)
  y += 6

  if (opts.dateRange) {
    doc.text(`Date Range: ${opts.dateRange.start} to ${opts.dateRange.end}`, margin, y)
    y += 6
  }

  doc.text(`Upload(s): ${opts.uploadIds.length}`, margin, y)
  y += 6

  doc.text(`Total Findings: ${opts.findings.length}`, margin, y)
  y += 12

  addLine()

  // Summary stats
  const underpaid = opts.findings.filter(f => f.finding_type === 'UNDERPAID')
  const appealable = opts.findings.filter(f => f.finding_type === 'DENIED_APPEALABLE')
  const needsReview = opts.findings.filter(f => f.finding_type === 'NEEDS_REVIEW')
  const incomplete = opts.findings.filter(f => f.finding_type === 'INCOMPLETE_DATA')

  const totalRecovery = opts.findings
    .filter(f => f.underpayment_amount && f.underpayment_amount > 0)
    .reduce((sum, f) => sum + (f.underpayment_amount || 0), 0)

  addSubheader('Summary')
  addText(`Total Potential Recovery: $${totalRecovery.toFixed(2)}`)
  addText(`Underpaid Claims: ${underpaid.length} ($${underpaid.reduce((s, f) => s + (f.underpayment_amount || 0), 0).toFixed(2)})`)
  addText(`Appealable Denials: ${appealable.length}`)
  addText(`Needs Review: ${needsReview.length}`)
  addText(`Incomplete Data: ${incomplete.length}`)
  y += 5

  // Top 5 findings
  const top5 = [...opts.findings]
    .sort((a, b) => (b.underpayment_amount || 0) - (a.underpayment_amount || 0))
    .slice(0, 5)

  if (top5.length > 0) {
    addSubheader('Top Findings')
    for (const f of top5) {
      addText(
        `${f.procedure_code || 'N/A'} | ${f.payer || 'Unknown'} | ${f.finding_type} | $${(f.underpayment_amount || 0).toFixed(2)} | ${f.confidence}`,
        9
      )
    }
  }

  // ── Page 2+: Summary Table ──
  doc.addPage()
  y = margin
  addHeader('Findings Summary')
  addLine()

  // Table header
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  const cols = [margin, margin + 25, margin + 55, margin + 85, margin + 115, margin + 140]
  doc.text('Procedure', cols[0], y)
  doc.text('Payer', cols[1], y)
  doc.text('Type', cols[2], y)
  doc.text('Amount', cols[3], y)
  doc.text('Confidence', cols[4], y)
  doc.text('Status', cols[5], y)
  y += 5
  addLine()

  doc.setFont('helvetica', 'normal')
  for (const f of opts.findings) {
    addPageIfNeeded(8)
    doc.text(f.procedure_code || 'N/A', cols[0], y)
    doc.text((f.payer || 'Unknown').substring(0, 15), cols[1], y)
    doc.text(f.finding_type.substring(0, 15), cols[2], y)
    doc.text(`$${(f.underpayment_amount || 0).toFixed(2)}`, cols[3], y)
    doc.text(f.confidence, cols[4], y)
    doc.text(f.status, cols[5], y)
    y += 5
  }

  // ── Letters Section ──
  // Group by payer
  const byPayer = new Map<string, Finding[]>()
  for (const f of opts.findings.filter(f => f.finding_type === 'UNDERPAID' || f.finding_type === 'DENIED_APPEALABLE')) {
    const payer = f.payer || 'Unknown'
    if (!byPayer.has(payer)) byPayer.set(payer, [])
    byPayer.get(payer)!.push(f)
  }

  for (const [payer, findings] of byPayer) {
    doc.addPage()
    y = margin
    addHeader(`Appeal Letters — ${payer}`)
    addLine()

    for (const f of findings) {
      const letterContent = getAppealLetterContent(f, opts)
      addText(letterContent, 9)
      y += 5
      addLine()
    }
  }

  // ── Checklist Page ──
  doc.addPage()
  y = margin
  addHeader('Appeal Submission Checklist')
  addLine()

  const checklistItems = [
    { category: 'For All Appeals', items: [
      'Copy of the original claim (CMS-1500 or UB-04)',
      'Copy of the EOB/ERA showing the denial or underpayment',
      'Completed appeal letter (see letters section)',
      'Provider NPI and Tax ID verification',
    ]},
    { category: 'For Underpayment Appeals', items: [
      'Copy of contracted fee schedule (relevant section)',
      'Calculation showing expected vs. actual payment',
      'Any prior correspondence about this claim',
    ]},
    { category: 'For Medical Necessity Appeals', items: [
      'Clinical notes for date of service',
      'Letter of medical necessity from treating provider',
      'Relevant diagnostic test results',
      'Applicable clinical guidelines or literature',
    ]},
    { category: 'For Timely Filing Appeals', items: [
      'Proof of original submission (clearinghouse confirmation)',
      'Date-stamped copy of original claim',
      'Any prior payer correspondence',
    ]},
    { category: 'For Bundling/Modifier Appeals', items: [
      'Operative notes showing distinct procedures',
      'Documentation of separate anatomical sites',
      'Modifier justification documentation',
    ]},
  ]

  for (const section of checklistItems) {
    addSubheader(section.category)
    for (const item of section.items) {
      addText(`[ ] ${item}`, 9)
    }
    y += 3
  }

  // ── Evidence Appendix ──
  doc.addPage()
  y = margin
  addHeader('Evidence Appendix')
  addText('Note: This appendix contains non-PHI evidence references only.', 9)
  addLine()

  for (const f of opts.findings) {
    addPageIfNeeded(30)
    addSubheader(`${f.procedure_code || 'N/A'} — ${f.finding_type}`)

    // Math trace
    if (f.billed_amount || f.allowed_amount || f.paid_amount) {
      addText(`Math: Billed=$${(f.billed_amount || 0).toFixed(2)}, Allowed=$${(f.allowed_amount || 0).toFixed(2)}, Paid=$${(f.paid_amount || 0).toFixed(2)}, PR=$${(f.patient_responsibility || 0).toFixed(2)}, Underpayment=$${(f.underpayment_amount || 0).toFixed(2)}`, 8)
    }

    // CARC/RARC descriptions
    if (f.carc_codes && f.carc_codes.length > 0) {
      for (const code of f.carc_codes) {
        const desc = getCarcDescription(code)
        addText(`CARC ${code}: ${desc || 'Description not available'} [source: WPC]`, 8)
      }
    }
    if (f.rarc_codes && f.rarc_codes.length > 0) {
      for (const code of f.rarc_codes) {
        const desc = getRarcDescription(code)
        addText(`RARC ${code}: ${desc || 'Description not available'} [source: WPC]`, 8)
      }
    }

    // Evidence references
    const evidence = f.evidence as Record<string, unknown>
    const source = evidence?.source as Record<string, unknown>
    if (source?.segment_indices) {
      addText(`Segment indices: ${JSON.stringify(source.segment_indices)}`, 8)
    }
    if (source?.claim_id) {
      addText(`Claim reference: ${source.claim_id}`, 8)
    }

    y += 3
    addLine()
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(150, 150, 150)
    doc.text(
      `${opts.accountName} — Appeal Packet — Page ${i} of ${totalPages}`,
      margin,
      pageHeight - 10
    )
    doc.text(
      'Generated by Revenue Recovery Engine',
      pageWidth - margin - 60,
      pageHeight - 10
    )
    doc.setTextColor(0, 0, 0)
  }

  // Return as Buffer
  const arrayBuffer = doc.output('arraybuffer')
  return Buffer.from(arrayBuffer)
}
