import { extractHeader, extractLineItems, pdfToFindings, extractPdfText, parsePdfEob } from '../parsePdf'
import * as fs from 'fs'
import * as path from 'path'

// ─── Test with the exact text extracted from the user's uploaded PDF ─────────

const SAMPLE_EOB_TEXT = `Sample Remittance Advice / EOB Test Document
Fictitious test data for software QA only - not a real patient, payer, or claim.
Provider Riverview Gastroenterology Associates
TIN 12-3456789
NPI 1437285109
Payer AETNA COMMERCIAL
Remit Date 2026-02-12
Claim Number CLM-8472915
Claim / Service Detail
Patient Account DOS CPT/HCPCS Units Billed Allowed Paid Patient Resp. Adjustment Code
ACCT-220981 2026-02-03 45385 1 $1,250.00 $980.00 $710.00 $40.00 CO-45 / PR-1
Adjustment Summary
This test document intentionally includes standard remittance fields such as billed amount, allowed amount,
paid amount, patient responsibility, and adjustment codes. It does not include any proposed recovery or
expected underpayment amount so your system can calculate variance on its own.
Remark Codes N20 - Service not payable under provider's contract terms as billed
Internal Note Use this file to validate automated underpayment detection and appeal generation logic.`

describe('PDF Parser — Header Extraction', () => {
  const header = extractHeader(SAMPLE_EOB_TEXT)

  test('extracts payer', () => {
    expect(header.payer).toBe('AETNA COMMERCIAL')
  })

  test('extracts provider', () => {
    expect(header.provider).toBe('Riverview Gastroenterology Associates')
  })

  test('extracts claim number', () => {
    expect(header.claimNumber).toBe('CLM-8472915')
  })

  test('extracts remit date', () => {
    expect(header.remitDate).toBe('2026-02-12')
  })

  test('extracts TIN', () => {
    expect(header.tin).toBe('12-3456789')
  })

  test('extracts NPI', () => {
    expect(header.npi).toBe('1437285109')
  })

  test('extracts patient account', () => {
    expect(header.patientAccount).toContain('220981')
  })
})

describe('PDF Parser — Line Item Extraction', () => {
  const { lineItems, rawMatches } = extractLineItems(SAMPLE_EOB_TEXT, 1)

  test('extracts exactly 1 line item', () => {
    expect(lineItems.length).toBe(1)
  })

  test('extracts procedure code 45385', () => {
    expect(lineItems[0].procedureCode).toBe('45385')
  })

  test('extracts billed amount $1,250.00', () => {
    expect(lineItems[0].billed).toBe(1250.00)
  })

  test('extracts allowed amount $980.00', () => {
    expect(lineItems[0].allowed).toBe(980.00)
  })

  test('extracts paid amount $710.00', () => {
    expect(lineItems[0].paid).toBe(710.00)
  })

  test('extracts patient responsibility $40.00', () => {
    expect(lineItems[0].patientResponsibility).toBe(40.00)
  })

  test('extracts adjustment codes CO-45 and PR-1', () => {
    expect(lineItems[0].adjustmentCodes).toContain('CO-45')
    expect(lineItems[0].adjustmentCodes).toContain('PR-1')
  })

  test('has High confidence (all 4 amounts present)', () => {
    expect(lineItems[0].matchConfidence).toBe('High')
  })

  test('has raw matches for evidence', () => {
    expect(rawMatches.length).toBeGreaterThan(0)
  })
})

describe('PDF Parser — Underpayment Calculation', () => {
  const header = extractHeader(SAMPLE_EOB_TEXT)
  const { lineItems } = extractLineItems(SAMPLE_EOB_TEXT, 1)
  const extraction = {
    success: lineItems.length > 0,
    method: 'text' as const,
    text: SAMPLE_EOB_TEXT,
    pageCount: 1,
    textDensity: SAMPLE_EOB_TEXT.length,
    lineItems,
    rawMatches: [],
    header,
  }
  const findings = pdfToFindings(extraction, null)

  test('produces exactly 1 finding', () => {
    expect(findings.length).toBe(1)
  })

  test('finding type is UNDERPAID', () => {
    expect(findings[0].finding_type).toBe('UNDERPAID')
  })

  test('payer is AETNA COMMERCIAL (from header)', () => {
    expect(findings[0].payer).toBe('AETNA COMMERCIAL')
  })

  test('procedure code is 45385', () => {
    expect(findings[0].procedure_code).toBe('45385')
  })

  test('underpayment is $230.00 (980 - 40 - 710)', () => {
    expect(findings[0].underpayment_amount).toBe(230.00)
  })

  test('billed amount is $1,250.00', () => {
    expect(findings[0].billed_amount).toBe(1250.00)
  })

  test('allowed amount is $980.00', () => {
    expect(findings[0].allowed_amount).toBe(980.00)
  })

  test('paid amount is $710.00', () => {
    expect(findings[0].paid_amount).toBe(710.00)
  })

  test('patient responsibility is $40.00', () => {
    expect(findings[0].patient_responsibility).toBe(40.00)
  })

  test('confidence is High or Medium', () => {
    expect(['High', 'Medium']).toContain(findings[0].confidence)
  })

  test('evidence includes math trace', () => {
    const ev = findings[0].evidence as Record<string, unknown>
    expect(ev).toHaveProperty('math')
    const math = ev.math as Record<string, unknown>
    expect(math.underpayment).toBe(230.00)
    expect(math.formula).toContain('Underpayment')
  })
})

// ─── Multi-line-item PDF ─────────────────────────────────────────────────────

const MULTI_LINE_TEXT = `SAMPLE EOB - NOT A REAL DOCUMENT
Payer AETNA COMMERCIAL
Provider Sunshine Medical Group
Claim Number CLM-2026-TEST-003
Remit Date 2026-01-20
Patient Account DOS CPT Units Billed Allowed Paid Patient Resp. Adj Code
ACCT-30301 2026-01-05 99214 1 $1,250.00 $980.00 $710.00 $40.00 CO-45
ACCT-30302 2026-01-05 99213 1 $850.00 $640.00 $540.00 $30.00 CO-45
ACCT-30303 2026-01-05 36415 1 $175.00 $120.00 $120.00 $0.00
Total Billed: $2,275.00 Total Allowed: $1,740.00 Total Paid: $1,370.00 Total Patient Resp: $70.00`

describe('PDF Parser — Multi-line-item document', () => {
  test('extracts 3 line items', () => {
    const { lineItems } = extractLineItems(MULTI_LINE_TEXT, 1)
    expect(lineItems.length).toBe(3)
  })

  test('99214: billed=$1250, allowed=$980, paid=$710, PR=$40', () => {
    const { lineItems } = extractLineItems(MULTI_LINE_TEXT, 1)
    const item = lineItems.find(i => i.procedureCode === '99214')
    expect(item).toBeDefined()
    expect(item!.billed).toBe(1250.00)
    expect(item!.allowed).toBe(980.00)
    expect(item!.paid).toBe(710.00)
    expect(item!.patientResponsibility).toBe(40.00)
  })

  test('99214 underpayment = $230 (980 - 40 - 710)', () => {
    const extraction = {
      success: true,
      method: 'text' as const,
      text: MULTI_LINE_TEXT,
      pageCount: 1,
      textDensity: 500,
      lineItems: extractLineItems(MULTI_LINE_TEXT, 1).lineItems,
      rawMatches: [],
      header: extractHeader(MULTI_LINE_TEXT),
    }
    const findings = pdfToFindings(extraction, null)
    const f = findings.find(f => f.procedure_code === '99214')
    expect(f).toBeDefined()
    expect(f!.finding_type).toBe('UNDERPAID')
    expect(f!.underpayment_amount).toBe(230.00)
  })

  test('99213 underpayment = $70 (640 - 30 - 540)', () => {
    const extraction = {
      success: true,
      method: 'text' as const,
      text: MULTI_LINE_TEXT,
      pageCount: 1,
      textDensity: 500,
      lineItems: extractLineItems(MULTI_LINE_TEXT, 1).lineItems,
      rawMatches: [],
      header: extractHeader(MULTI_LINE_TEXT),
    }
    const findings = pdfToFindings(extraction, null)
    const f = findings.find(f => f.procedure_code === '99213')
    expect(f).toBeDefined()
    expect(f!.finding_type).toBe('UNDERPAID')
    expect(f!.underpayment_amount).toBe(70.00)
  })

  test('36415 is correctly paid (no underpayment)', () => {
    const extraction = {
      success: true,
      method: 'text' as const,
      text: MULTI_LINE_TEXT,
      pageCount: 1,
      textDensity: 500,
      lineItems: extractLineItems(MULTI_LINE_TEXT, 1).lineItems,
      rawMatches: [],
      header: extractHeader(MULTI_LINE_TEXT),
    }
    const findings = pdfToFindings(extraction, null)
    const f = findings.find(f => f.procedure_code === '36415')
    expect(f).toBeDefined()
    expect(f!.finding_type).toBe('NEEDS_REVIEW')
  })

  test('total potential recovery = $300', () => {
    const extraction = {
      success: true,
      method: 'text' as const,
      text: MULTI_LINE_TEXT,
      pageCount: 1,
      textDensity: 500,
      lineItems: extractLineItems(MULTI_LINE_TEXT, 1).lineItems,
      rawMatches: [],
      header: extractHeader(MULTI_LINE_TEXT),
    }
    const findings = pdfToFindings(extraction, null)
    const total = findings
      .filter(f => f.underpayment_amount !== null)
      .reduce((sum, f) => sum + (f.underpayment_amount || 0), 0)
    expect(total).toBe(300.00)
  })
})

describe('PDF Parser — INCOMPLETE_DATA for unstructured text', () => {
  test('produces INCOMPLETE_DATA when no line items extracted', () => {
    const extraction = {
      success: false,
      method: 'text' as const,
      text: 'Some random text without any structured data',
      pageCount: 1,
      textDensity: 50,
      lineItems: [] as any[],
      rawMatches: [],
      header: extractHeader('Some random text'),
    }
    const findings = pdfToFindings(extraction, null)
    expect(findings.length).toBe(1)
    expect(findings[0].finding_type).toBe('INCOMPLETE_DATA')
  })
})

describe('PDF Parser — Full pipeline with real PDF file', () => {
  const pdfPath = path.join(__dirname, '../../fixtures/pdf/sample_eob1.pdf')
  const pdfExists = fs.existsSync(pdfPath)

  if (pdfExists) {
    test('extracts text from sample_eob1.pdf', async () => {
      const buffer = fs.readFileSync(pdfPath)
      const result = await parsePdfEob(buffer)
      expect(result.text.length).toBeGreaterThan(50)
      expect(result.method).toBe('text')
    })
  } else {
    test.skip('sample_eob1.pdf fixture not found', () => {})
  }
})
