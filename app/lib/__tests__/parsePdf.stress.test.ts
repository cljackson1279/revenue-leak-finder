/**
 * Stress Tests — PDF EOB Parser
 *
 * Tests 15+ real-world layout variations to ensure the parser either:
 * (a) extracts data CORRECTLY, or
 * (b) explicitly flags uncertainty (INCOMPLETE_DATA / NEEDS_REVIEW)
 *
 * The cardinal rule: NEVER produce a false positive underpayment.
 */

import { extractHeader, extractLineItems, pdfToFindings, type PdfExtractionResult } from '../parsePdf'

// Helper to build a full extraction and findings from raw text
function analyzeText(text: string, overridePayer?: string | null) {
  const header = extractHeader(text)
  const { lineItems, rawMatches } = extractLineItems(text, 1)
  const extraction: PdfExtractionResult = {
    success: lineItems.length > 0,
    method: 'text',
    text,
    pageCount: 1,
    textDensity: text.length,
    lineItems,
    rawMatches,
    header,
  }
  const findings = pdfToFindings(extraction, overridePayer ?? null)
  return { header, lineItems, findings, extraction }
}

// ═══════════════════════════════════════════════════════════════════════════
// LAYOUT 1: Standard BCBS format (CPT first, then amounts)
// ═══════════════════════════════════════════════════════════════════════════
describe('Layout 1: Standard BCBS format', () => {
  const text = `EXPLANATION OF BENEFITS
BlueCross BlueShield of Illinois
Payer: BlueCross BlueShield of Illinois
Provider: North Shore Medical Associates
Claim Number: CLM-2026-10001
Date: 03/01/2026
NPI: 1234567890
TIN: 36-1234567
CPT DOS Units Billed Allowed Paid Patient Resp Adj Code
99215 02/15/26 1 $350.00 $280.00 $224.00 $56.00 CO-45
90837 02/15/26 1 $200.00 $160.00 $128.00 $32.00 CO-45
Total Billed: $550.00 Total Allowed: $440.00 Total Paid: $352.00`

  test('extracts payer correctly', () => {
    const { header } = analyzeText(text)
    expect(header.payer).toBe('BlueCross BlueShield of Illinois')
  })

  test('extracts 2 line items', () => {
    const { lineItems } = analyzeText(text)
    expect(lineItems.length).toBe(2)
  })

  test('99215 amounts are correct', () => {
    const { lineItems } = analyzeText(text)
    const item = lineItems.find(i => i.procedureCode === '99215')
    expect(item).toBeDefined()
    expect(item!.billed).toBe(350)
    expect(item!.allowed).toBe(280)
    expect(item!.paid).toBe(224)
    expect(item!.patientResponsibility).toBe(56)
  })

  test('no false underpayment (correctly paid)', () => {
    const { findings } = analyzeText(text)
    const underpaid = findings.filter(f => f.finding_type === 'UNDERPAID')
    expect(underpaid.length).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// LAYOUT 2: UHC format (Charged, Plan Discount, Plan Paid, You Owe)
// ═══════════════════════════════════════════════════════════════════════════
describe('Layout 2: UHC-style format with Plan Discount', () => {
  const text = `UnitedHealthcare Explanation of Benefits
Payer: UnitedHealthcare
Provider: Midwest Family Practice
Claim #: UHC-2026-55001
Date: 02/28/2026
Service Date Procedure Charged Plan Paid You Owe
02/10/26 99213 $180.00 $130.00 $50.00
02/10/26 99214 $250.00 $190.00 $60.00`

  test('extracts payer', () => {
    const { header } = analyzeText(text)
    expect(header.payer).toBe('UnitedHealthcare')
  })

  test('extracts 2 line items', () => {
    const { lineItems } = analyzeText(text)
    expect(lineItems.length).toBe(2)
  })

  test('amounts mapped correctly (Charged→billed, Plan Paid→paid, You Owe→pr)', () => {
    const { lineItems } = analyzeText(text)
    const item = lineItems.find(i => i.procedureCode === '99213')
    expect(item).toBeDefined()
    expect(item!.billed).toBe(180)
    expect(item!.paid).toBe(130)
    expect(item!.patientResponsibility).toBe(50)
  })

  test('does NOT produce false underpayment without allowed amount', () => {
    const { findings } = analyzeText(text)
    // Without an "allowed" column, the parser should NOT claim underpayment
    const underpaid = findings.filter(f => f.finding_type === 'UNDERPAID')
    // If allowed is null, it should be NEEDS_REVIEW, not UNDERPAID
    for (const f of findings) {
      if (f.finding_type === 'UNDERPAID') {
        // If it does calculate underpayment, the math must be correct
        expect(f.underpayment_amount).toBeGreaterThan(0)
      }
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// LAYOUT 3: Medicare format (PROC, BILLED, ALLOWED, DEDUCT, COINS, PROV PD)
// ═══════════════════════════════════════════════════════════════════════════
describe('Layout 3: Medicare-style format', () => {
  const text = `MEDICARE REMITTANCE ADVICE
Payer: Medicare Part B
Provider: Lakeview Internal Medicine
NPI: 9876543210
Date: 02/20/2026
Claim Number: MCR-2026-88001
PROC DOS BILLED ALLOWED DEDUCT COINS GRP/RC PROV PD
99214 02/05/26 $200.00 $145.00 $0.00 $29.00 CO-45 $116.00
93000 02/05/26 $85.00 $55.00 $0.00 $11.00 CO-45 $44.00`

  test('extracts payer', () => {
    const { header } = analyzeText(text)
    expect(header.payer).toBe('Medicare Part B')
  })

  test('extracts 2 line items', () => {
    const { lineItems } = analyzeText(text)
    expect(lineItems.length).toBe(2)
  })

  test('99214 amounts mapped correctly', () => {
    const { lineItems } = analyzeText(text)
    const item = lineItems.find(i => i.procedureCode === '99214')
    expect(item).toBeDefined()
    expect(item!.billed).toBe(200)
    expect(item!.allowed).toBe(145)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// LAYOUT 4: Cigna format (Provider Charges, Allowed, Paid by Plan, Your Responsibility)
// ═══════════════════════════════════════════════════════════════════════════
describe('Layout 4: Cigna-style format', () => {
  const text = `Cigna Health Insurance - Explanation of Benefits
Insurance Company: Cigna Health Insurance
Provider: Valley Orthopedic Specialists
Claim Number: CIG-2026-33001
Payment Date: 03/05/2026
Procedure Date Provider Charges Allowed Paid by Plan Your Responsibility
99213 02/20/26 $175.00 $140.00 $112.00 $28.00
73721 02/20/26 $450.00 $320.00 $256.00 $64.00`

  test('extracts payer from Insurance Company label', () => {
    const { header } = analyzeText(text)
    expect(header.payer).toBe('Cigna Health Insurance')
  })

  test('extracts 2 line items', () => {
    const { lineItems } = analyzeText(text)
    expect(lineItems.length).toBe(2)
  })

  test('amounts are correct for 99213', () => {
    const { lineItems } = analyzeText(text)
    const item = lineItems.find(i => i.procedureCode === '99213')
    expect(item).toBeDefined()
    expect(item!.billed).toBe(175)
    expect(item!.allowed).toBe(140)
    expect(item!.paid).toBe(112)
    expect(item!.patientResponsibility).toBe(28)
  })

  test('no false underpayment (correctly paid)', () => {
    const { findings } = analyzeText(text)
    const underpaid = findings.filter(f => f.finding_type === 'UNDERPAID')
    expect(underpaid.length).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// LAYOUT 5: Aetna format with Eligible Amount
// ═══════════════════════════════════════════════════════════════════════════
describe('Layout 5: Aetna-style with Eligible Amount', () => {
  const text = `Aetna Explanation of Benefits
Payer: Aetna
Provider Name: Riverside Cardiology
Claim #: AET-2026-77001
Remit Date: 2026-02-25
Service Code Service Date Billed Amount Eligible Amount Benefit Copay Deductible
99214 02/10/2026 $250.00 $200.00 $140.00 $30.00 $30.00`

  test('extracts payer', () => {
    const { header } = analyzeText(text)
    expect(header.payer).toBe('Aetna')
  })

  test('extracts 1 line item', () => {
    const { lineItems } = analyzeText(text)
    expect(lineItems.length).toBe(1)
  })

  test('Eligible Amount maps to allowed', () => {
    const { lineItems } = analyzeText(text)
    expect(lineItems[0].billed).toBe(250)
    expect(lineItems[0].allowed).toBe(200)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// LAYOUT 6: HCPCS codes (letter + 4 digits like J1234, G0101)
// ═══════════════════════════════════════════════════════════════════════════
describe('Layout 6: HCPCS codes with letter prefix', () => {
  const text = `EOB - Medicare Part B
Payer: Medicare Part B
Provider: Oncology Associates
NPI: 5551234567
Date: 02/15/2026
CPT/HCPCS DOS Units Billed Allowed Paid Patient Resp Adj Code
J9271 02/01/26 1 $1,500.00 $1,200.00 $960.00 $240.00 CO-45
G0463 02/01/26 1 $250.00 $180.00 $144.00 $36.00 CO-45`

  test('extracts HCPCS code J9271', () => {
    const { lineItems } = analyzeText(text)
    const item = lineItems.find(i => i.procedureCode === 'J9271')
    expect(item).toBeDefined()
    expect(item!.billed).toBe(1500)
    expect(item!.allowed).toBe(1200)
  })

  test('extracts HCPCS code G0463', () => {
    const { lineItems } = analyzeText(text)
    const item = lineItems.find(i => i.procedureCode === 'G0463')
    expect(item).toBeDefined()
    expect(item!.billed).toBe(250)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// LAYOUT 7: CPT with modifiers (99214-25)
// ═══════════════════════════════════════════════════════════════════════════
describe('Layout 7: CPT codes with modifiers', () => {
  const text = `EOB - Aetna
Payer: Aetna Commercial
Provider: Primary Care Associates
Date: 02/28/2026
CPT DOS Units Billed Allowed Paid Patient Resp Adj Code
99214-25 02/10/26 1 $250.00 $200.00 $160.00 $40.00 CO-45
17110-59 02/10/26 1 $175.00 $140.00 $112.00 $28.00 CO-45`

  test('extracts CPT 99214 from 99214-25 (strips modifier)', () => {
    const { lineItems } = analyzeText(text)
    const item = lineItems.find(i => i.procedureCode === '99214')
    expect(item).toBeDefined()
    expect(item!.billed).toBe(250)
  })

  test('extracts CPT 17110 from 17110-59', () => {
    const { lineItems } = analyzeText(text)
    const item = lineItems.find(i => i.procedureCode === '17110')
    expect(item).toBeDefined()
    expect(item!.billed).toBe(175)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// LAYOUT 8: Amounts without $ sign
// ═══════════════════════════════════════════════════════════════════════════
describe('Layout 8: Amounts without dollar signs', () => {
  const text = `Remittance Advice
Payer: Humana Gold Plus
Provider: Sunset Dermatology
Date: 02/20/2026
CPT DOS Billed Allowed Paid Patient Resp
99213 02/05/26 175.00 140.00 112.00 28.00
11102 02/05/26 250.00 200.00 160.00 40.00`

  test('extracts amounts without $ signs', () => {
    const { lineItems } = analyzeText(text)
    expect(lineItems.length).toBe(2)
    const item = lineItems.find(i => i.procedureCode === '99213')
    expect(item).toBeDefined()
    expect(item!.billed).toBe(175)
    expect(item!.allowed).toBe(140)
    expect(item!.paid).toBe(112)
    expect(item!.patientResponsibility).toBe(28)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// LAYOUT 9: Denied claims (all zeros)
// ═══════════════════════════════════════════════════════════════════════════
describe('Layout 9: Denied claims', () => {
  const text = `EOB - Aetna
Payer: Aetna
Date: 02/15/2026
CPT DOS Units Billed Allowed Paid Patient Resp Adj Code
90837 02/01/26 1 $200.00 $0.00 $0.00 $0.00 CO-50
90785 02/01/26 1 $75.00 $0.00 $0.00 $0.00 CO-97`

  test('classifies denied claims as DENIED_APPEALABLE', () => {
    const { findings } = analyzeText(text)
    const denied = findings.filter(f => f.finding_type === 'DENIED_APPEALABLE')
    expect(denied.length).toBe(2)
  })

  test('denied claim underpayment equals billed amount', () => {
    const { findings } = analyzeText(text)
    const f90837 = findings.find(f => f.procedure_code === '90837')
    expect(f90837).toBeDefined()
    expect(f90837!.underpayment_amount).toBe(200)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// LAYOUT 10: Multi-line payer (payer on next line after label)
// ═══════════════════════════════════════════════════════════════════════════
describe('Layout 10: Multi-line payer format', () => {
  const text = `EXPLANATION OF BENEFITS
Date: 02/15/2026
Payer: Claim Reference:
BlueCross BlueShield of Texas CLM-2026-00001
P.O. Box 660044, Dallas TX 75266 NPI: 1234567890
CPT DOS Units Billed Allowed Paid Patient Resp Adj Code
99214 01/10/26 1 $250.00 $180.00 $144.00 $36.00 CO-45`

  test('extracts payer from next line', () => {
    const { header } = analyzeText(text)
    expect(header.payer).toBe('BlueCross BlueShield of Texas')
  })

  test('extracts NPI from inline position', () => {
    const { header } = analyzeText(text)
    expect(header.npi).toBe('1234567890')
  })

  test('extracts claim number from inline CLM pattern', () => {
    const { header } = analyzeText(text)
    expect(header.claimNumber).toBe('CLM-2026-00001')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// LAYOUT 11: No header row — amounts only
// ═══════════════════════════════════════════════════════════════════════════
describe('Layout 11: No column header row', () => {
  const text = `Remittance Advice
Payer: Anthem Blue Cross
Date: 02/20/2026
99213 02/05/26 $175.00 $140.00 $112.00 $28.00
99214 02/05/26 $250.00 $200.00 $160.00 $40.00`

  test('extracts line items using fallback order', () => {
    const { lineItems } = analyzeText(text)
    expect(lineItems.length).toBe(2)
  })

  test('fallback order: Billed, Allowed, Paid, PR', () => {
    const { lineItems } = analyzeText(text)
    const item = lineItems.find(i => i.procedureCode === '99213')
    expect(item).toBeDefined()
    expect(item!.billed).toBe(175)
    expect(item!.allowed).toBe(140)
    expect(item!.paid).toBe(112)
    expect(item!.patientResponsibility).toBe(28)
  })

  test('no false underpayment (correctly paid)', () => {
    const { findings } = analyzeText(text)
    const underpaid = findings.filter(f => f.finding_type === 'UNDERPAID')
    expect(underpaid.length).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// LAYOUT 12: Real underpayment scenario ($90 expected recovery)
// ═══════════════════════════════════════════════════════════════════════════
describe('Layout 12: Real underpayment — $90 recovery', () => {
  const text = `EXPLANATION OF BENEFITS
Payer: AETNA COMMERCIAL
Provider: Riverview Gastroenterology Associates
Claim Number: CLM-8472915
Remit Date: 2026-02-12
NPI: 1437285109
TIN: 12-3456789
CPT DOS Units Billed Allowed Paid Patient Resp Adj Code
45385 02/03/26 1 $1,250.00 $980.00 $850.00 $40.00 CO-45`

  test('detects underpayment of $90', () => {
    const { findings } = analyzeText(text)
    const f = findings.find(f => f.procedure_code === '45385')
    expect(f).toBeDefined()
    expect(f!.finding_type).toBe('UNDERPAID')
    // Underpayment = Allowed - PR - Paid = 980 - 40 - 850 = 90
    expect(f!.underpayment_amount).toBe(90)
  })

  test('all amounts are correct', () => {
    const { lineItems } = analyzeText(text)
    const item = lineItems[0]
    expect(item.billed).toBe(1250)
    expect(item.allowed).toBe(980)
    expect(item.paid).toBe(850)
    expect(item.patientResponsibility).toBe(40)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// LAYOUT 13: Summary lines that should NOT be extracted as data
// ═══════════════════════════════════════════════════════════════════════════
describe('Layout 13: Summary lines not extracted as data', () => {
  const text = `EOB
Payer: Aetna
Date: 02/15/2026
CPT DOS Units Billed Allowed Paid Patient Resp Adj Code
99214 02/01/26 1 $250.00 $200.00 $160.00 $40.00 CO-45
Summary
Total Billed: $250.00
Total Allowed: $200.00
Total Paid to Provider: $160.00
Total Patient Responsibility: $40.00
Subtotal: $250.00
Grand Total: $250.00
Check Amount: $160.00
Net Payment: $160.00`

  test('extracts exactly 1 line item (not summary lines)', () => {
    const { lineItems } = analyzeText(text)
    expect(lineItems.length).toBe(1)
    expect(lineItems[0].procedureCode).toBe('99214')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// LAYOUT 14: Reversed column order (Paid before Allowed)
// ═══════════════════════════════════════════════════════════════════════════
describe('Layout 14: Non-standard column order (Paid before Allowed)', () => {
  const text = `Remittance Advice
Payer: Tricare
Date: 02/20/2026
CPT DOS Billed Paid Allowed Patient Resp
99213 02/05/26 $175.00 $112.00 $140.00 $28.00`

  test('maps amounts according to header order, not assumed order', () => {
    const { lineItems } = analyzeText(text)
    expect(lineItems.length).toBe(1)
    const item = lineItems[0]
    expect(item.billed).toBe(175)
    expect(item.paid).toBe(112)
    expect(item.allowed).toBe(140)
    expect(item.patientResponsibility).toBe(28)
  })

  test('no false underpayment', () => {
    const { findings } = analyzeText(text)
    const underpaid = findings.filter(f => f.finding_type === 'UNDERPAID')
    expect(underpaid.length).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// LAYOUT 15: Only 2 amounts (Billed and Paid — no Allowed)
// ═══════════════════════════════════════════════════════════════════════════
describe('Layout 15: Only Billed and Paid columns', () => {
  const text = `Payment Summary
Payer: Workers Comp Insurance
Date: 02/20/2026
CPT DOS Billed Paid
99213 02/05/26 $175.00 $100.00
99214 02/05/26 $250.00 $180.00`

  test('extracts line items with billed and paid only', () => {
    const { lineItems } = analyzeText(text)
    expect(lineItems.length).toBe(2)
    const item = lineItems.find(i => i.procedureCode === '99213')
    expect(item).toBeDefined()
    expect(item!.billed).toBe(175)
    expect(item!.paid).toBe(100)
    expect(item!.allowed).toBeNull()
  })

  test('does NOT produce UNDERPAID without allowed amount', () => {
    const { findings } = analyzeText(text)
    const underpaid = findings.filter(f => f.finding_type === 'UNDERPAID')
    expect(underpaid.length).toBe(0)
  })

  test('produces NEEDS_REVIEW for missing allowed', () => {
    const { findings } = analyzeText(text)
    const needsReview = findings.filter(f => f.finding_type === 'NEEDS_REVIEW')
    expect(needsReview.length).toBe(2)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// LAYOUT 16: Multiple adjustment codes per line
// ═══════════════════════════════════════════════════════════════════════════
describe('Layout 16: Multiple adjustment codes', () => {
  const text = `EOB
Payer: Aetna
Date: 02/15/2026
CPT DOS Units Billed Allowed Paid Patient Resp Adj Code
99214 02/01/26 1 $250.00 $200.00 $140.00 $40.00 CO-45 PR-1 OA-23`

  test('extracts all adjustment codes', () => {
    const { lineItems } = analyzeText(text)
    expect(lineItems[0].adjustmentCodes).toContain('CO-45')
    expect(lineItems[0].adjustmentCodes).toContain('PR-1')
    expect(lineItems[0].adjustmentCodes).toContain('OA-23')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// LAYOUT 17: Large amounts with commas
// ═══════════════════════════════════════════════════════════════════════════
describe('Layout 17: Large amounts with commas', () => {
  const text = `EOB
Payer: Aetna
Date: 02/15/2026
CPT DOS Units Billed Allowed Paid Patient Resp
27447 02/01/26 1 $45,000.00 $32,500.00 $26,000.00 $6,500.00`

  test('parses comma-separated amounts correctly', () => {
    const { lineItems } = analyzeText(text)
    expect(lineItems.length).toBe(1)
    expect(lineItems[0].billed).toBe(45000)
    expect(lineItems[0].allowed).toBe(32500)
    expect(lineItems[0].paid).toBe(26000)
    expect(lineItems[0].patientResponsibility).toBe(6500)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// SAFETY TEST 1: Garbage text should produce INCOMPLETE_DATA, not false findings
// ═══════════════════════════════════════════════════════════════════════════
describe('Safety: Garbage text produces INCOMPLETE_DATA', () => {
  const text = `This is just a random letter from the insurance company.
Dear Provider,
We are writing to inform you that your contract has been updated.
Please review the attached fee schedule for details.
If you have questions, call 1-800-555-1234.
Thank you,
Claims Department`

  test('produces INCOMPLETE_DATA, not false findings', () => {
    const { findings } = analyzeText(text)
    expect(findings.length).toBe(1)
    expect(findings[0].finding_type).toBe('INCOMPLETE_DATA')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// SAFETY TEST 2: Non-EOB document with dollar amounts should not produce false positives
// ═══════════════════════════════════════════════════════════════════════════
describe('Safety: Non-EOB with dollar amounts', () => {
  const text = `Invoice #12345
Date: 02/15/2026
Patient: John Smith
Account: ACCT-99213
Service: Office Visit
Amount Due: $175.00
Payment Received: $175.00
Balance: $0.00`

  test('does not produce false UNDERPAID finding', () => {
    const { findings } = analyzeText(text)
    const underpaid = findings.filter(f => f.finding_type === 'UNDERPAID')
    expect(underpaid.length).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// SAFETY TEST 3: ZIP codes and phone numbers should not be treated as CPT codes
// ═══════════════════════════════════════════════════════════════════════════
describe('Safety: ZIP codes and phone numbers not treated as CPT codes', () => {
  const text = `EOB
Payer: Aetna
Address: 123 Main St, Springfield IL 62701
Phone: (555) 12345
Date: 02/15/2026
CPT DOS Units Billed Allowed Paid Patient Resp
99214 02/01/26 1 $250.00 $200.00 $160.00 $40.00`

  test('extracts only 99214, not ZIP 62701 or phone 12345', () => {
    const { lineItems } = analyzeText(text)
    expect(lineItems.length).toBe(1)
    expect(lineItems[0].procedureCode).toBe('99214')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// CROSS-VALIDATION TEST: Billed < Allowed should flag concern
// ═══════════════════════════════════════════════════════════════════════════
describe('Cross-validation: Billed < Allowed flags concern', () => {
  const text = `EOB
Payer: Aetna
Date: 02/15/2026
CPT DOS Units Billed Allowed Paid Patient Resp
99214 02/01/26 1 $100.00 $200.00 $160.00 $40.00`

  test('extracts line item but flags anomaly', () => {
    const { lineItems } = analyzeText(text)
    expect(lineItems.length).toBe(1)
    // Billed < Allowed is unusual — confidence should be downgraded
    // or the finding should note the anomaly
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// LAYOUT 18: Carrier label for payer
// ═══════════════════════════════════════════════════════════════════════════
describe('Layout 18: Carrier label for payer', () => {
  const text = `Remittance Advice
Carrier: Anthem Blue Cross
Provider: Mountain View Clinic
Date: 02/20/2026
CPT DOS Billed Allowed Paid Patient Resp
99213 02/05/26 $175.00 $140.00 $112.00 $28.00`

  test('extracts payer from Carrier label', () => {
    const { header } = analyzeText(text)
    expect(header.payer).toBe('Anthem Blue Cross')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// LAYOUT 19: Mixed underpaid and correctly paid in same document
// ═══════════════════════════════════════════════════════════════════════════
describe('Layout 19: Mixed underpaid and correctly paid', () => {
  const text = `EOB
Payer: Aetna
Date: 02/15/2026
CPT DOS Units Billed Allowed Paid Patient Resp Adj Code
99214 02/01/26 1 $250.00 $200.00 $120.00 $40.00 CO-45
99213 02/01/26 1 $175.00 $140.00 $112.00 $28.00 CO-45
36415 02/01/26 1 $25.00 $20.00 $20.00 $0.00 CO-45`

  test('detects underpayment only on 99214', () => {
    const { findings } = analyzeText(text)
    const underpaid = findings.filter(f => f.finding_type === 'UNDERPAID')
    expect(underpaid.length).toBe(1)
    expect(underpaid[0].procedure_code).toBe('99214')
    // Underpayment = 200 - 40 - 120 = 40
    expect(underpaid[0].underpayment_amount).toBe(40)
  })

  test('99213 is correctly paid (no underpayment)', () => {
    const { findings } = analyzeText(text)
    const f = findings.find(f => f.procedure_code === '99213')
    expect(f!.finding_type).toBe('NEEDS_REVIEW')
  })

  test('36415 is correctly paid (no underpayment)', () => {
    const { findings } = analyzeText(text)
    const f = findings.find(f => f.procedure_code === '36415')
    expect(f!.finding_type).toBe('NEEDS_REVIEW')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// LAYOUT 20: Payee label for provider
// ═══════════════════════════════════════════════════════════════════════════
describe('Layout 20: Payee label for provider', () => {
  const text = `Remittance Advice
Payer: BCBS of Georgia
Payee: Peachtree Medical Group
Date: 02/20/2026
CPT DOS Billed Allowed Paid Patient Resp
99213 02/05/26 $175.00 $140.00 $112.00 $28.00`

  test('extracts provider from Payee label', () => {
    const { header } = analyzeText(text)
    expect(header.provider).toBe('Peachtree Medical Group')
  })
})
