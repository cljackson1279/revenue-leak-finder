/**
 * Golden tests for the 835 parser and finding computation engine.
 *
 * Run: npx jest lib/__tests__/parse835.test.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { parse835, computeFindings } from '../parse835'

describe('parse835', () => {
  describe('sample1.edi — BCBS with underpayments', () => {
    const edi = fs.readFileSync(
      path.join(__dirname, '../../fixtures/835/sample1.edi'),
      'utf-8'
    )
    const result = parse835(edi)

    test('parses payer and payee', () => {
      expect(result.payer).toBe('BLUE CROSS BLUE SHIELD')
      expect(result.payee).toBe('SAMPLE MEDICAL PRACTICE')
    })

    test('parses check amount', () => {
      expect(result.checkAmount).toBe(345.00)
    })

    test('parses trace number', () => {
      expect(result.traceNumber).toBe('BCBS20260101001')
    })

    test('parses correct number of claims', () => {
      expect(result.claims).toHaveLength(2)
    })

    test('first claim has correct claim ID', () => {
      expect(result.claims[0].claimId).toBe('CLAIM-2026-001')
    })

    test('first claim has 2 service lines', () => {
      expect(result.claims[0].serviceLines).toHaveLength(2)
    })

    test('first service line: 99214 billed=200, paid=145, allowed=175', () => {
      const line = result.claims[0].serviceLines[0]
      expect(line.procedureCode).toBe('99214')
      expect(line.billed).toBe(200.00)
      expect(line.paid).toBe(145.00)
      expect(line.allowed).toBe(175.00)
    })

    test('second service line: 99213 billed=150, paid=100, allowed=110, PR=10', () => {
      const line = result.claims[0].serviceLines[1]
      expect(line.procedureCode).toBe('99213')
      expect(line.billed).toBe(150.00)
      expect(line.paid).toBe(100.00)
      expect(line.allowed).toBe(110.00)
      expect(line.patientResponsibility).toBe(10.00)
    })

    test('second claim: 99215 billed=300, paid=200, allowed=200', () => {
      const line = result.claims[1].serviceLines[0]
      expect(line.procedureCode).toBe('99215')
      expect(line.billed).toBe(300.00)
      expect(line.paid).toBe(200.00)
      expect(line.allowed).toBe(200.00)
    })
  })

  describe('sample2.edi — Aetna with patient responsibility', () => {
    const edi = fs.readFileSync(
      path.join(__dirname, '../../fixtures/835/sample2.edi'),
      'utf-8'
    )
    const result = parse835(edi)

    test('parses payer', () => {
      expect(result.payer).toBe('AETNA HEALTH INSURANCE')
    })

    test('parses 1 claim', () => {
      expect(result.claims).toHaveLength(1)
    })

    test('first line: 90837 billed=180, paid=95, allowed=130, PR=35', () => {
      const line = result.claims[0].serviceLines[0]
      expect(line.procedureCode).toBe('90837')
      expect(line.billed).toBe(180.00)
      expect(line.paid).toBe(95.00)
      expect(line.allowed).toBe(130.00)
      expect(line.patientResponsibility).toBe(35.00)
    })

    test('second line: 90834 billed=120, paid=60, allowed=90', () => {
      const line = result.claims[0].serviceLines[1]
      expect(line.procedureCode).toBe('90834')
      expect(line.billed).toBe(120.00)
      expect(line.paid).toBe(60.00)
      expect(line.allowed).toBe(90.00)
    })
  })

  describe('sample3_denials.edi — UHC with denials', () => {
    const edi = fs.readFileSync(
      path.join(__dirname, '../../fixtures/835/sample3_denials.edi'),
      'utf-8'
    )
    const result = parse835(edi)

    test('parses payer', () => {
      expect(result.payer).toBe('UNITED HEALTHCARE')
    })

    test('parses 3 claims', () => {
      expect(result.claims).toHaveLength(3)
    })

    test('first claim denied (CARC 50): paid=0', () => {
      const line = result.claims[0].serviceLines[0]
      expect(line.procedureCode).toBe('99215')
      expect(line.paid).toBe(0)
      expect(line.adjustments.some(a => a.code === '50')).toBe(true)
    })

    test('second claim denied (CARC 29): timely filing', () => {
      const line = result.claims[1].serviceLines[0]
      expect(line.adjustments.some(a => a.code === '29')).toBe(true)
    })

    test('third claim has bundled denial (CARC 97)', () => {
      const line = result.claims[2].serviceLines[1]
      expect(line.adjustments.some(a => a.code === '97')).toBe(true)
    })
  })
})

describe('computeFindings', () => {
  describe('sample1.edi — underpayment detection', () => {
    const edi = fs.readFileSync(
      path.join(__dirname, '../../fixtures/835/sample1.edi'),
      'utf-8'
    )
    const result = parse835(edi)
    const findings = computeFindings(result.claims)

    test('detects underpayment on 99214', () => {
      const f = findings.find(
        f => f.procedure_code === '99214' && f.finding_type === 'UNDERPAID'
      )
      expect(f).toBeDefined()
      expect(f!.underpayment_amount).toBe(30.00) // 175 - 0 - 145 = 30
    })

    test('99214 underpayment has High confidence', () => {
      const f = findings.find(
        f => f.procedure_code === '99214' && f.finding_type === 'UNDERPAID'
      )
      expect(f!.confidence).toBe('High')
    })

    test('99214 evidence includes math trace', () => {
      const f = findings.find(
        f => f.procedure_code === '99214' && f.finding_type === 'UNDERPAID'
      )
      const math = (f!.evidence as Record<string, unknown>).math as Record<string, number>
      expect(math.expected_payer_payment).toBe(175.00)
      expect(math.underpayment).toBe(30.00)
    })

    test('99213 underpayment is $0 (100 = 110 - 10)', () => {
      // 99213: allowed=110, PR=10, paid=100 => expected=100, underpayment=0
      const f = findings.find(
        f => f.procedure_code === '99213' && f.finding_type === 'UNDERPAID'
      )
      expect(f).toBeUndefined() // No underpayment
    })
  })

  describe('sample2.edi — Aetna underpayment with PR', () => {
    const edi = fs.readFileSync(
      path.join(__dirname, '../../fixtures/835/sample2.edi'),
      'utf-8'
    )
    const result = parse835(edi)
    const findings = computeFindings(result.claims)

    test('detects underpayment on 90834', () => {
      const f = findings.find(
        f => f.procedure_code === '90834' && f.finding_type === 'UNDERPAID'
      )
      expect(f).toBeDefined()
      // 90834: allowed=90, PR=0, paid=60 => underpayment=30
      expect(f!.underpayment_amount).toBe(30.00)
    })
  })

  describe('sample3_denials.edi — denial classification', () => {
    const edi = fs.readFileSync(
      path.join(__dirname, '../../fixtures/835/sample3_denials.edi'),
      'utf-8'
    )
    const result = parse835(edi)
    const findings = computeFindings(result.claims)

    test('CARC 50 classified as DENIED_APPEALABLE', () => {
      const f = findings.find(
        f => f.carc_codes.includes('50') && f.finding_type === 'DENIED_APPEALABLE'
      )
      expect(f).toBeDefined()
    })

    test('CARC 29 classified as DENIED_APPEALABLE (timely filing)', () => {
      const f = findings.find(
        f => f.carc_codes.includes('29') && f.finding_type === 'DENIED_APPEALABLE'
      )
      expect(f).toBeDefined()
    })

    test('CARC 97 classified as DENIED_APPEALABLE (bundled)', () => {
      const f = findings.find(
        f => f.carc_codes.includes('97') && f.finding_type === 'DENIED_APPEALABLE'
      )
      expect(f).toBeDefined()
    })

    test('no findings have null payer', () => {
      for (const f of findings) {
        expect(f.payer).toBeTruthy()
      }
    })

    test('all findings have rationale', () => {
      for (const f of findings) {
        expect(f.rationale).toBeTruthy()
        expect(f.rationale.length).toBeGreaterThan(10)
      }
    })

    test('all findings have action', () => {
      for (const f of findings) {
        expect(f.action).toBeTruthy()
        expect(f.action.length).toBeGreaterThan(10)
      }
    })
  })
})

describe('deterministic output', () => {
  test('same input produces same output', () => {
    const edi = fs.readFileSync(
      path.join(__dirname, '../../fixtures/835/sample1.edi'),
      'utf-8'
    )

    const result1 = parse835(edi)
    const findings1 = computeFindings(result1.claims)

    const result2 = parse835(edi)
    const findings2 = computeFindings(result2.claims)

    expect(findings1.length).toBe(findings2.length)
    for (let i = 0; i < findings1.length; i++) {
      expect(findings1[i].finding_type).toBe(findings2[i].finding_type)
      expect(findings1[i].underpayment_amount).toBe(findings2[i].underpayment_amount)
      expect(findings1[i].procedure_code).toBe(findings2[i].procedure_code)
    }
  })
})
