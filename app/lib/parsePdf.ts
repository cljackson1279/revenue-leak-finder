/**
 * PDF EOB Parser — Deterministic text extraction with OCR stub
 *
 * Strategy:
 * 1. Extract text from PDF using pdf-parse
 * 2. If text density is low (scanned PDF), mark as needing OCR
 * 3. Apply deterministic regex patterns to extract line items
 * 4. If extraction fails, return INCOMPLETE_DATA findings
 *
 * Never hallucinate fields. Never guess amounts.
 */

import type { FindingInput } from './parse835'

// ─── Types ──────────────────────────────────────────────────────────────────

export type PdfExtractionResult = {
  success: boolean
  method: 'text' | 'ocr_stub' | 'none'
  text: string
  pageCount: number
  textDensity: number  // chars per page
  lineItems: PdfLineItem[]
  rawMatches: PdfMatch[]
}

export type PdfLineItem = {
  procedureCode: string
  serviceDate: string | null
  billed: number | null
  allowed: number | null
  paid: number | null
  patientResponsibility: number | null
  page: number
  matchConfidence: 'High' | 'Medium' | 'Low'
}

export type PdfMatch = {
  pattern: string
  value: string
  page: number
  position: number
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MIN_TEXT_DENSITY = 50  // chars per page threshold for "has text"

// Regex patterns for deterministic extraction
const CPT_HCPCS_PATTERN = /\b(\d{5})\b/g
const DOS_PATTERN = /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/g
const AMOUNT_PATTERN = /\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2}))\b/g

// More specific line item pattern: tries to match a row with CPT, date, and amounts
const LINE_ITEM_PATTERN = /(\d{5})\s+.*?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}).*?\$?\s*(\d{1,3}(?:,\d{3})*\.\d{2})(?:.*?\$?\s*(\d{1,3}(?:,\d{3})*\.\d{2}))?(?:.*?\$?\s*(\d{1,3}(?:,\d{3})*\.\d{2}))?/g

// ─── Text extraction ───────────────────────────────────────────────────────

export async function extractPdfText(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  try {
    // pdf-parse needs to be imported dynamically to avoid issues with Next.js bundling
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse')
    const data = await pdfParse(buffer)
    return {
      text: data.text || '',
      pageCount: data.numpages || 1,
    }
  } catch (error) {
    console.error('[parsePdf] Text extraction failed:', error instanceof Error ? error.message : 'unknown')
    return { text: '', pageCount: 0 }
  }
}

// ─── OCR stub ───────────────────────────────────────────────────────────────

/**
 * OCR fallback — currently a stub.
 * When implemented, would use Tesseract or a cloud OCR service.
 * Feature-flagged: set ENABLE_OCR=true to activate.
 */
export async function ocrFallback(_buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  const ocrEnabled = process.env.ENABLE_OCR === 'true'

  if (!ocrEnabled) {
    return { text: '', pageCount: 0 }
  }

  // TODO: Implement Tesseract or cloud OCR integration
  // For now, return empty result
  console.log('[parsePdf] OCR fallback called but not yet implemented')
  return { text: '', pageCount: 0 }
}

// ─── Deterministic line item extraction ─────────────────────────────────────

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

function parseDateToISO(dateStr: string): string | null {
  // Handle MM/DD/YYYY, MM-DD-YYYY, MM/DD/YY
  const parts = dateStr.split(/[\/\-]/)
  if (parts.length !== 3) return null

  let [month, day, year] = parts
  if (year.length === 2) {
    year = parseInt(year) > 50 ? `19${year}` : `20${year}`
  }

  const m = month.padStart(2, '0')
  const d = day.padStart(2, '0')
  return `${year}-${m}-${d}`
}

export function extractLineItems(text: string, pageCount: number): { lineItems: PdfLineItem[]; rawMatches: PdfMatch[] } {
  const lineItems: PdfLineItem[] = []
  const rawMatches: PdfMatch[] = []

  // Split text by pages (approximate — pdf-parse separates with \n\n or form feeds)
  const pages = text.split(/\f/).length > 1 ? text.split(/\f/) : [text]

  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    const pageText = pages[pageIdx]
    const pageNum = pageIdx + 1

    // Try structured line item pattern first
    let match: RegExpExecArray | null
    const linePattern = new RegExp(LINE_ITEM_PATTERN.source, 'g')

    while ((match = linePattern.exec(pageText)) !== null) {
      const procedureCode = match[1]
      const dateStr = match[2]
      const amount1 = match[3]
      const amount2 = match[4]
      const amount3 = match[5]

      rawMatches.push({
        pattern: 'LINE_ITEM',
        value: match[0].substring(0, 200),
        page: pageNum,
        position: match.index,
      })

      lineItems.push({
        procedureCode,
        serviceDate: parseDateToISO(dateStr),
        billed: parseAmount(amount1),
        allowed: amount2 ? parseAmount(amount2) : null,
        paid: amount3 ? parseAmount(amount3) : null,
        patientResponsibility: null,
        page: pageNum,
        matchConfidence: amount2 && amount3 ? 'Medium' : 'Low',
      })
    }

    // Collect individual pattern matches for evidence
    const cptPattern = new RegExp(CPT_HCPCS_PATTERN.source, 'g')
    while ((match = cptPattern.exec(pageText)) !== null) {
      rawMatches.push({
        pattern: 'CPT_HCPCS',
        value: match[1],
        page: pageNum,
        position: match.index,
      })
    }

    const dosPattern = new RegExp(DOS_PATTERN.source, 'g')
    while ((match = dosPattern.exec(pageText)) !== null) {
      rawMatches.push({
        pattern: 'DATE_OF_SERVICE',
        value: match[1],
        page: pageNum,
        position: match.index,
      })
    }
  }

  return { lineItems, rawMatches }
}

// ─── Main PDF parsing pipeline ──────────────────────────────────────────────

export async function parsePdfEob(buffer: Buffer): Promise<PdfExtractionResult> {
  // Step 1: Text extraction
  let { text, pageCount } = await extractPdfText(buffer)
  let method: PdfExtractionResult['method'] = 'text'

  const textDensity = pageCount > 0 ? text.length / pageCount : 0

  // Step 2: If low text density, try OCR fallback
  if (textDensity < MIN_TEXT_DENSITY) {
    const ocrResult = await ocrFallback(buffer)
    if (ocrResult.text.length > text.length) {
      text = ocrResult.text
      pageCount = ocrResult.pageCount || pageCount
      method = 'ocr_stub'
    } else {
      method = 'none'
    }
  }

  // Step 3: Extract line items deterministically
  const { lineItems, rawMatches } = extractLineItems(text, pageCount)

  return {
    success: lineItems.length > 0,
    method,
    text: text.substring(0, 10000), // Truncate for storage (no PHI in evidence)
    pageCount,
    textDensity,
    lineItems,
    rawMatches,
  }
}

// ─── Convert PDF extraction to findings ─────────────────────────────────────

export function pdfToFindings(
  extraction: PdfExtractionResult,
  payer: string | null
): FindingInput[] {
  const findings: FindingInput[] = []

  if (!extraction.success || extraction.lineItems.length === 0) {
    // No structured data extracted — create INCOMPLETE_DATA finding
    findings.push({
      finding_type: 'INCOMPLETE_DATA',
      confidence: 'Low',
      payer: payer || 'Unknown (PDF)',
      service_date: null,
      procedure_code: null,
      billed_amount: null,
      allowed_amount: null,
      paid_amount: null,
      patient_responsibility: null,
      underpayment_amount: null,
      carc_codes: [],
      rarc_codes: [],
      action: 'Could not extract structured line items from this PDF EOB. Steps: (1) Verify the PDF is a valid EOB document. (2) If scanned, enable OCR processing. (3) Manually enter key data or upload the corresponding 835 ERA file for full analysis.',
      rationale: `PDF extraction method: ${extraction.method}. Text density: ${extraction.textDensity.toFixed(0)} chars/page. ${extraction.rawMatches.length} pattern matches found but insufficient for structured extraction. Page count: ${extraction.pageCount}.`,
      evidence: {
        extraction: {
          method: extraction.method,
          text_density: extraction.textDensity,
          page_count: extraction.pageCount,
          pattern_matches: extraction.rawMatches.length,
          match_summary: extraction.rawMatches.slice(0, 20).map(m => ({
            pattern: m.pattern,
            page: m.page,
          })),
        },
      },
    })
    return findings
  }

  // Process extracted line items
  for (const item of extraction.lineItems) {
    const hasAmounts = item.billed !== null && item.allowed !== null && item.paid !== null

    if (hasAmounts && item.billed! > 0 && item.allowed! > 0) {
      const pr = item.patientResponsibility || 0
      const expectedPayer = item.allowed! - pr
      const underpayment = Math.round((expectedPayer - item.paid!) * 100) / 100

      if (underpayment > 0.01) {
        findings.push({
          finding_type: 'UNDERPAID',
          confidence: 'Medium', // Lower confidence from PDF vs 835
          payer: payer || 'Unknown (PDF)',
          service_date: item.serviceDate,
          procedure_code: item.procedureCode,
          billed_amount: item.billed,
          allowed_amount: item.allowed,
          paid_amount: item.paid,
          patient_responsibility: pr,
          underpayment_amount: underpayment,
          carc_codes: [],
          rarc_codes: [],
          action: `Potential underpayment of $${underpayment.toFixed(2)} detected from PDF EOB. Verify amounts against 835 ERA or payer portal before filing appeal. PDF extraction confidence: ${item.matchConfidence}.`,
          rationale: `PDF extraction found: Billed $${item.billed!.toFixed(2)}, Allowed $${item.allowed!.toFixed(2)}, Paid $${item.paid!.toFixed(2)}. Expected payer payment: $${expectedPayer.toFixed(2)}. Underpayment: $${underpayment.toFixed(2)}. Source: page ${item.page}.`,
          evidence: {
            extraction: {
              method: 'pdf_text',
              page: item.page,
              match_confidence: item.matchConfidence,
            },
            math: {
              billed: item.billed,
              allowed: item.allowed,
              paid: item.paid,
              patient_responsibility: pr,
              expected_payer_payment: expectedPayer,
              underpayment,
              formula: 'Underpayment = Allowed - PatientResponsibility - Paid',
            },
          },
        })
      } else {
        // No underpayment but we have data — still useful for records
        findings.push({
          finding_type: 'NEEDS_REVIEW',
          confidence: 'Low',
          payer: payer || 'Unknown (PDF)',
          service_date: item.serviceDate,
          procedure_code: item.procedureCode,
          billed_amount: item.billed,
          allowed_amount: item.allowed,
          paid_amount: item.paid,
          patient_responsibility: pr,
          underpayment_amount: null,
          carc_codes: [],
          rarc_codes: [],
          action: 'Line item extracted from PDF EOB. No underpayment detected but verify amounts against 835 ERA for complete analysis.',
          rationale: `PDF extraction found line item for ${item.procedureCode} on page ${item.page}. Amounts appear consistent. Recommend cross-referencing with 835 ERA data.`,
          evidence: {
            extraction: { method: 'pdf_text', page: item.page, match_confidence: item.matchConfidence },
            math: { billed: item.billed, allowed: item.allowed, paid: item.paid },
          },
        })
      }
    } else {
      // Partial data extracted
      findings.push({
        finding_type: 'INCOMPLETE_DATA',
        confidence: 'Low',
        payer: payer || 'Unknown (PDF)',
        service_date: item.serviceDate,
        procedure_code: item.procedureCode,
        billed_amount: item.billed,
        allowed_amount: item.allowed,
        paid_amount: item.paid,
        patient_responsibility: item.patientResponsibility,
        underpayment_amount: null,
        carc_codes: [],
        rarc_codes: [],
        action: 'Partial data extracted from PDF EOB. Missing amounts prevent full analysis. Upload the corresponding 835 ERA file or manually verify and enter missing amounts.',
        rationale: `Extracted procedure code ${item.procedureCode} from page ${item.page} but could not determine all required amounts. Billed: ${item.billed !== null ? '$' + item.billed.toFixed(2) : 'missing'}, Allowed: ${item.allowed !== null ? '$' + item.allowed.toFixed(2) : 'missing'}, Paid: ${item.paid !== null ? '$' + item.paid.toFixed(2) : 'missing'}.`,
        evidence: {
          extraction: { method: 'pdf_text', page: item.page, match_confidence: item.matchConfidence },
        },
      })
    }
  }

  return findings
}
