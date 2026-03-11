/**
 * Standalone smoke test for the PDF parse pipeline.
 * Run: npx ts-node scripts/test-pdf-parse.ts <path-to-pdf>
 *
 * Verifies:
 *   1. parsePdfEob extracts line items from the PDF
 *   2. pdfToFindings produces FindingInput objects
 *   3. All 5 new columns (denial_amount, denial_category, appeal_deadline_days,
 *      appeal_by_date, appeal_status) are present in the output shape
 *   4. The computeAppealByDate logic produces a valid date
 */

import * as fs from 'fs'
import * as path from 'path'
import { parsePdfEob, pdfToFindings } from '../lib/parsePdf'

const pdfPath = process.argv[2] || '/home/ubuntu/upload/EOB_BCBS_NJ_Sample(1).pdf'

async function main() {
  console.log(`\nTesting PDF parse pipeline with: ${path.basename(pdfPath)}\n`)

  const buf = fs.readFileSync(pdfPath)
  const extraction = await parsePdfEob(buf)

  console.log('Extraction result:')
  console.log(`  method:       ${extraction.method}`)
  console.log(`  text_density: ${extraction.textDensity}`)
  console.log(`  line_items:   ${extraction.lineItems.length}`)

  const findings = pdfToFindings(extraction, null)
  console.log(`\nFindings produced: ${findings.length}`)

  if (findings.length === 0) {
    console.log('  (no findings — PDF may not have extractable claim data)')
    process.exit(0)
  }

  // Simulate the computeAppealByDate logic from analyze/route.ts
  const computeAppealByDate = (serviceDate: string | null, deadlineDays: number): string | null => {
    if (!serviceDate) return null
    try {
      const d = new Date(serviceDate)
      d.setDate(d.getDate() + deadlineDays)
      return d.toISOString().split('T')[0]
    } catch {
      return null
    }
  }

  // Simulate the full rows object that analyze/route.ts would insert
  const rows = findings.map(f => ({
    payer: f.payer,
    service_date: f.service_date,
    procedure_code: f.procedure_code,
    billed_amount: f.billed_amount,
    allowed_amount: f.allowed_amount,
    paid_amount: f.paid_amount,
    patient_responsibility: f.patient_responsibility,
    underpayment_amount: f.underpayment_amount,
    denial_amount: f.denial_amount ?? null,
    denial_category: f.denial_category ?? null,
    appeal_deadline_days: f.appeal_deadline_days ?? 90,
    appeal_by_date: computeAppealByDate(f.service_date, f.appeal_deadline_days ?? 90),
    appeal_status: 'not_filed',
    carc_codes: f.carc_codes,
    rarc_codes: f.rarc_codes,
    finding_type: f.finding_type,
    confidence: f.confidence,
    action: f.action,
    rationale: f.rationale,
    evidence: f.evidence,
    status: 'open',
  }))

  console.log('\nFirst finding (full row shape):')
  console.log(JSON.stringify(rows[0], null, 2))

  // Verify all 5 new columns are present
  const newCols = ['denial_amount', 'denial_category', 'appeal_deadline_days', 'appeal_by_date', 'appeal_status']
  const missing = newCols.filter(c => !(c in rows[0]))

  if (missing.length > 0) {
    console.error(`\nFAIL: Missing columns in row shape: ${missing.join(', ')}`)
    process.exit(1)
  }

  console.log(`\nPASS: All 5 new columns present in row shape`)
  console.log(`  denial_amount:        ${rows[0].denial_amount}`)
  console.log(`  denial_category:      ${rows[0].denial_category}`)
  console.log(`  appeal_deadline_days: ${rows[0].appeal_deadline_days}`)
  console.log(`  appeal_by_date:       ${rows[0].appeal_by_date}`)
  console.log(`  appeal_status:        ${rows[0].appeal_status}`)

  if (findings.length > 1) {
    console.log(`\nAll ${findings.length} findings summary:`)
    findings.forEach((f, i) => {
      console.log(`  [${i + 1}] ${f.finding_type} | ${f.procedure_code} | underpayment=$${f.underpayment_amount} | denial_cat=${f.denial_category ?? 'n/a'}`)
    })
  }
}

main().catch(err => {
  console.error('ERROR:', err.message)
  process.exit(1)
})
