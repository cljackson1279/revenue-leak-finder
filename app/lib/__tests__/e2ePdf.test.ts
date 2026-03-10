import { parsePdfEob, pdfToFindings } from '../parsePdf'
import * as fs from 'fs'
import * as path from 'path'

describe('E2E PDF parsing — sample_eob1.pdf', () => {
  const pdfPath = path.join(__dirname, '../../fixtures/pdf/sample_eob1.pdf')
  
  if (!fs.existsSync(pdfPath)) {
    test.skip('sample_eob1.pdf not found', () => {})
    return
  }

  let extraction: Awaited<ReturnType<typeof parsePdfEob>>
  let findings: ReturnType<typeof pdfToFindings>

  beforeAll(async () => {
    const buffer = fs.readFileSync(pdfPath)
    extraction = await parsePdfEob(buffer)
    findings = pdfToFindings(extraction, null)
  })

  test('extracts text successfully', () => {
    expect(extraction.text.length).toBeGreaterThan(50)
    expect(extraction.method).toBe('text')
  })

  test('extracts line items', () => {
    console.log('sample_eob1 line items:', JSON.stringify(extraction.lineItems, null, 2))
    expect(extraction.lineItems.length).toBeGreaterThan(0)
  })

  test('extracts header info', () => {
    console.log('sample_eob1 header:', JSON.stringify(extraction.header, null, 2))
  })

  test('produces findings', () => {
    console.log('sample_eob1 findings:', JSON.stringify(findings.map(f => ({
      type: f.finding_type,
      code: f.procedure_code,
      billed: f.billed_amount,
      allowed: f.allowed_amount,
      paid: f.paid_amount,
      pr: f.patient_responsibility,
      underpayment: f.underpayment_amount,
      payer: f.payer,
    })), null, 2))
    expect(findings.length).toBeGreaterThan(0)
  })
})

describe('E2E PDF parsing — sample_eob2.pdf', () => {
  const pdfPath = path.join(__dirname, '../../fixtures/pdf/sample_eob2.pdf')
  
  if (!fs.existsSync(pdfPath)) {
    test.skip('sample_eob2.pdf not found', () => {})
    return
  }

  let extraction: Awaited<ReturnType<typeof parsePdfEob>>
  let findings: ReturnType<typeof pdfToFindings>

  beforeAll(async () => {
    const buffer = fs.readFileSync(pdfPath)
    extraction = await parsePdfEob(buffer)
    findings = pdfToFindings(extraction, null)
  })

  test('extracts text successfully', () => {
    expect(extraction.text.length).toBeGreaterThan(50)
    expect(extraction.method).toBe('text')
  })

  test('extracts line items', () => {
    console.log('sample_eob2 line items:', JSON.stringify(extraction.lineItems, null, 2))
    expect(extraction.lineItems.length).toBeGreaterThan(0)
  })

  test('extracts header info', () => {
    console.log('sample_eob2 header:', JSON.stringify(extraction.header, null, 2))
  })

  test('produces findings', () => {
    console.log('sample_eob2 findings:', JSON.stringify(findings.map(f => ({
      type: f.finding_type,
      code: f.procedure_code,
      billed: f.billed_amount,
      allowed: f.allowed_amount,
      paid: f.paid_amount,
      pr: f.patient_responsibility,
      underpayment: f.underpayment_amount,
      payer: f.payer,
    })), null, 2))
    expect(findings.length).toBeGreaterThan(0)
  })
})

describe('E2E PDF parsing — sample_medical_underpayment_test_03_no_recovery.pdf', () => {
  const pdfPath = '/home/ubuntu/upload/sample_medical_underpayment_test_03_no_recovery.pdf'
  
  if (!fs.existsSync(pdfPath)) {
    test.skip('sample_medical_underpayment_test_03_no_recovery.pdf not found', () => {})
    return
  }

  let extraction: Awaited<ReturnType<typeof parsePdfEob>>
  let findings: ReturnType<typeof pdfToFindings>

  beforeAll(async () => {
    const buffer = fs.readFileSync(pdfPath)
    extraction = await parsePdfEob(buffer)
    findings = pdfToFindings(extraction, null)
  })

  test('extracts text successfully', () => {
    expect(extraction.text.length).toBeGreaterThan(50)
    expect(extraction.method).toBe('text')
  })

  test('extracts line items', () => {
    console.log('test_03 line items:', JSON.stringify(extraction.lineItems, null, 2))
    expect(extraction.lineItems.length).toBeGreaterThan(0)
  })

  test('extracts payer info', () => {
    console.log('test_03 header:', JSON.stringify(extraction.header, null, 2))
    // Should extract AETNA COMMERCIAL as payer
    expect(extraction.header.payer).toBeTruthy()
  })

  test('produces underpayment findings', () => {
    console.log('test_03 findings:', JSON.stringify(findings.map(f => ({
      type: f.finding_type,
      code: f.procedure_code,
      billed: f.billed_amount,
      allowed: f.allowed_amount,
      paid: f.paid_amount,
      pr: f.patient_responsibility,
      underpayment: f.underpayment_amount,
      payer: f.payer,
    })), null, 2))
    
    const underpaid = findings.filter(f => f.finding_type === 'UNDERPAID')
    expect(underpaid.length).toBeGreaterThan(0)
  })
})
