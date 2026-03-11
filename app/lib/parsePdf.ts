/**
 * PDF EOB Parser — Deterministic text extraction with multi-format support
 *
 * Strategy:
 * 1. Extract text from PDF using pdf-parse v2 (PDFParse class)
 * 2. If text density is low (scanned PDF), mark as needing OCR
 * 3. Extract header fields (payer, provider, dates, claim number) — line-by-line
 * 4. Extract line items using multiple strategies:
 *    a. Table-row detection with position-aware column mapping
 *    b. Fallback: positional amount extraction (Billed, Allowed, Paid, PR)
 * 5. Compute underpayment from extracted amounts
 *
 * Never hallucinate fields. Never guess amounts.
 */

import type { FindingInput } from './parse835'
import { carcToDenialCategory } from './carcCategories'

// ─── Types ──────────────────────────────────────────────────────────────────

export type PdfExtractionResult = {
  success: boolean
  method: 'text' | 'ocr_stub' | 'none'
  text: string
  pageCount: number
  textDensity: number
  lineItems: PdfLineItem[]
  rawMatches: PdfMatch[]
  header: PdfHeader
}

export type PdfHeader = {
  payer: string | null
  provider: string | null
  claimNumber: string | null
  remitDate: string | null
  patientAccount: string | null
  tin: string | null
  npi: string | null
}

export type PdfLineItem = {
  procedureCode: string
  serviceDate: string | null
  billed: number | null
  allowed: number | null
  paid: number | null
  patientResponsibility: number | null
  adjustmentCodes: string[]
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

// ─── Text extraction ───────────────────────────────────────────────────────

export async function extractPdfText(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  // ── Strategy 1: unpdf (serverless-safe, no filesystem font dependencies) ──
  // unpdf returns text as an array of page strings (one per page), each with \n line breaks.
  // We join pages with \n\n to preserve line structure for the parser.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { extractText } = require('unpdf')
    const uint8 = new Uint8Array(buffer)
    const result = await extractText(uint8)  // do NOT use mergePages:true — it strips newlines
    const pageCount = result.totalPages || 1

    let fullText = ''
    if (Array.isArray(result.text)) {
      // Each element is a page's text string with embedded newlines
      fullText = result.text.join('\n\n').trim()
    } else if (typeof result.text === 'string') {
      fullText = result.text.trim()
    }

    if (fullText.length > 20) {
      console.log('[parsePdf] unpdf extraction succeeded:', fullText.length, 'chars,', pageCount, 'pages')
      return { text: fullText, pageCount }
    }
    console.warn('[parsePdf] unpdf returned empty text, trying fallback')
  } catch (error) {
    console.error('[parsePdf] unpdf extraction failed:', error instanceof Error ? error.message : 'unknown')
  }

  // ── Strategy 2: pdf-parse v2 (PDFParse class API) ──
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParseModule = require('pdf-parse')
    const PDFParse = pdfParseModule.PDFParse || pdfParseModule.default || pdfParseModule

    if (typeof PDFParse === 'function') {
      const uint8 = new Uint8Array(buffer)
      const parser = new PDFParse(uint8, { verbosity: 0 })
      const result = await parser.getText()

      let fullText = ''
      let pageCount = 1

      if (result && result.pages && Array.isArray(result.pages)) {
        pageCount = result.pages.length || 1
        fullText = result.pages.map((p: { text?: string }) => p.text || '').join('\n\n')
        if (!fullText.trim() && result.text) fullText = result.text
      } else if (typeof result === 'string') {
        fullText = result
      } else if (result && result.text) {
        fullText = result.text
        pageCount = result.numpages || result.pageCount || result.total || 1
      }

      if (!fullText.trim() && result && typeof result.text === 'string') {
        fullText = result.text
        pageCount = result.total || result.pages?.length || 1
      }

      if (fullText.trim().length > 20) {
        console.log('[parsePdf] pdf-parse v2 extraction succeeded:', fullText.length, 'chars')
        return { text: fullText, pageCount }
      }
    }
  } catch (error) {
    console.error('[parsePdf] pdf-parse v2 extraction failed:', error instanceof Error ? error.message : 'unknown')
  }

  // ── Strategy 3: pdf-parse legacy (v1 function API) ──
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse')
    if (typeof pdfParse === 'function') {
      const data = await pdfParse(buffer)
      if (data.text && data.text.trim().length > 20) {
        console.log('[parsePdf] pdf-parse legacy extraction succeeded:', data.text.length, 'chars')
        return { text: data.text, pageCount: data.numpages || 1 }
      }
    }
  } catch (error) {
    console.error('[parsePdf] pdf-parse legacy extraction failed:', error instanceof Error ? error.message : 'unknown')
  }

  console.error('[parsePdf] all extraction strategies failed — returning empty text')
  return { text: '', pageCount: 0 }
}

// ─── OCR stub ───────────────────────────────────────────────────────────────

export async function ocrFallback(_buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  const ocrEnabled = process.env.ENABLE_OCR === 'true'
  if (!ocrEnabled) return { text: '', pageCount: 0 }
  console.log('[parsePdf] OCR fallback called but not yet implemented')
  return { text: '', pageCount: 0 }
}

// ─── Amount parsing ────────────────────────────────────────────────────────

function parseAmount(raw: string): number | null {
  if (!raw) return null
  const cleaned = raw.replace(/[$,\s]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : Math.round(num * 100) / 100
}

function parseDateToISO(dateStr: string): string | null {
  if (!dateStr) return null

  // Handle YYYY-MM-DD (already ISO)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr

  // Handle MM/DD/YYYY, MM-DD-YYYY, MM/DD/YY
  const parts = dateStr.split(/[\/\-]/)
  if (parts.length !== 3) return null

  let [month, day, year] = parts
  if (year.length === 2) {
    year = parseInt(year) > 50 ? `19${year}` : `20${year}`
  }

  // If first part looks like a 4-digit year, it's YYYY-MM-DD
  if (month.length === 4) {
    return `${month}-${day.padStart(2, '0')}-${year.padStart(2, '0')}`
  }

  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

// ─── Header extraction (line-by-line for precision) ─────────────────────────

/**
 * Checks if a line looks like a table column header (contains multiple
 * amount-related keywords). These lines should be skipped for field extraction.
 */
function isColumnHeaderLine(line: string): boolean {
  const lower = line.toLowerCase()
  const amountKeywords = ['billed', 'allowed', 'paid', 'charge', 'payment', 'units', 'cpt', 'hcpcs', 'dos']
  const matchCount = amountKeywords.filter(kw => lower.includes(kw)).length
  return matchCount >= 3
}

export function extractHeader(text: string): PdfHeader {
  const header: PdfHeader = {
    payer: null,
    provider: null,
    claimNumber: null,
    remitDate: null,
    patientAccount: null,
    tin: null,
    npi: null,
  }

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)

  /**
   * Helper: given a label line index, return the value.
   * Handles two formats:
   *   A) "Label: Value"  — value is on the same line after the colon/dash
   *   B) "Label"         — value is on the very next non-empty line
   * Returns null if the next line looks like another label or a data row.
   */
  function getFieldValue(lineIdx: number, labelRegex: RegExp): string | null {
    const line = lines[lineIdx]
    const m = line.match(labelRegex)
    if (!m) return null

    // Case A: value is on the same line
    if (m[1] && m[1].trim().length > 0) {
      const val = m[1].trim()
      // If it looks like another label, fall through to Case B
      if (!/^(?:Claim|Reference|Date|ID|#|Number|Patient|Provider|Payer|Insurance|Plan|Carrier|Remit|TIN|NPI)\b/i.test(val) && !val.endsWith(':')) {
        return val
      }
    }

    // Case B: value is on the next line
    for (let j = lineIdx + 1; j < Math.min(lineIdx + 3, lines.length); j++) {
      const nextLine = lines[j].trim()
      if (!nextLine) continue
      // Skip if next line is itself a label (single word ending in colon, or known label)
      if (/^(?:Provider|Payer|Patient|Claim|Date|Remit|TIN|NPI|Insurance|Plan|Carrier|Account|Member|Group)\s*(?:Number|Name|#|No\.?|Date)?\s*:?$/i.test(nextLine)) continue
      // Skip column header rows and dollar-amount data rows
      if (isColumnHeaderLine(nextLine)) continue
      if (/\$\s*\d/.test(nextLine)) continue
      return nextLine
    }
    return null
  }

  // Track which lines have been used for DOS so we don't double-extract
  let dosLineIdx = -1

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx]
    // Skip column header lines and data rows with dollar amounts
    if (isColumnHeaderLine(line)) continue
    if (/\$\s*\d/.test(line)) continue

    // ── Payer ──
    if (!header.payer) {
      // Handles all formats:
      //   "Payer AETNA COMMERCIAL"   (no colon, value on same line)
      //   "Payer: AETNA COMMERCIAL"  (colon, value on same line)
      //   "Payer"                    (label alone, value on next line)
      if (/^(?:Payer|Insurance\s*(?:Company|Name|Plan)?|Plan\s*Name|Carrier)\b/i.test(line)) {
        let val = getFieldValue(lineIdx, /^(?:Payer|Insurance\s*(?:Company|Name|Plan)?|Plan\s*Name|Carrier)\s*[:\-]?\s*(.*)/i)
        if (val && val.length > 1) {
          // Strip trailing claim numbers, NPI, address suffixes that may appear on the same line
          // e.g. "BlueCross BlueShield of Texas CLM-2026-00001" → "BlueCross BlueShield of Texas"
          val = val
            .replace(/\s+(?:CLM|CLAIM|REF|REFERENCE|CONTROL|ICN|DCN)[\-:\s]\S+.*/i, '')  // trailing claim ref
            .replace(/\s+NPI[:\s]\d{10}.*/i, '')                                           // trailing NPI
            .replace(/\s+(?:P\.?O\.?\s*Box|\d{1,5}\s+\w+\s+(?:St|Ave|Blvd|Dr|Rd|Ln|Way)).*/i, '') // trailing address
            .replace(/\s+\d{5}(?:-\d{4})?\s*$/, '')                                        // trailing ZIP code
            .trim()
          if (val.length > 1) {
            header.payer = val
            continue
          }
        }
      }
    }

    // ── Provider ──
    if (!header.provider) {
      // Handles all formats:
      //   "Provider Riverview Associates"  (no colon)
      //   "Provider: Riverview Associates" (colon)
      //   "Provider"                       (label alone, value on next line)
      if (/^(?:Provider|Rendering\s*Provider|Payee)\b/i.test(line)) {
        const val = getFieldValue(lineIdx, /^(?:Provider|Rendering\s*Provider|Payee)\s*(?:Name)?\s*[:\-]?\s*(.*)/i)
        if (val && val.length > 1) {
          header.provider = val
          continue
        }
      }
    }

    // ── Claim Number ──
    if (!header.claimNumber) {
      // Label-then-value (same line or next line)
      if (/^(?:Claim\s*(?:Number|#|No\.?)|ICN)\s*[:\-]?/i.test(line)) {
        const val = getFieldValue(lineIdx, /^(?:Claim\s*(?:Number|#|No\.?)|ICN)\s*[:\-]?\s*(.*)/i)
        if (val && val.trim().length > 1) {
          header.claimNumber = val.trim()
          continue
        }
      }
      // Inline CLM-XXXXX or UHC-XXXXX pattern anywhere in the line
      const clmMatch = line.match(/\b((?:CLM|UHC|ICN|CLM|REF)-[\w\-]+)/i)
      if (clmMatch) {
        header.claimNumber = clmMatch[1].trim()
      }
    }

    // ── Date of Service (capture into remitDate if not already set — used as service_date fallback) ──
    if (!header.remitDate && dosLineIdx === -1) {
      if (/^(?:Date\s*of\s*Service|DOS|Service\s*Date)\s*[:\-]?\s*$/i.test(line) ||
          /^(?:Date\s*of\s*Service|DOS|Service\s*Date)\s*[:\-]\s*.+/i.test(line)) {
        const val = getFieldValue(lineIdx, /^(?:Date\s*of\s*Service|DOS|Service\s*Date)\s*[:\-]?\s*(.*)/i)
        if (val) {
          const dateMatch = val.match(/\b(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/)
          if (dateMatch) {
            header.remitDate = parseDateToISO(dateMatch[1])
            dosLineIdx = lineIdx
            continue
          }
        }
      }
    }

    // ── Remit Date ──
    if (!header.remitDate) {
      // Same-line format: "Remit Date: 2026-02-28"
      const m = line.match(/^(?:Remit\s*(?:Date|Dt)?|Payment\s*Date|Check\s*Date)\s*[:\-]?\s*(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i)
      if (m && m[1]) {
        header.remitDate = parseDateToISO(m[1])
        continue
      }
      // Label-only line: "Remit Date" then date on next line
      if (/^(?:Remit\s*(?:Date|Dt)?|Payment\s*Date|Check\s*Date)\s*[:\-]?\s*$/i.test(line)) {
        const val = getFieldValue(lineIdx, /^(?:Remit\s*(?:Date|Dt)?|Payment\s*Date|Check\s*Date)\s*[:\-]?\s*(.*)/i)
        if (val) {
          const dateMatch = val.match(/\b(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/)
          if (dateMatch) {
            header.remitDate = parseDateToISO(dateMatch[1])
            continue
          }
        }
      }
    }

    // ── TIN ──
    if (!header.tin) {
      // Line-start match
      const m = line.match(/^TIN\s*[:\-]?\s*(\d{2}[\-:]?\d{7})/i)
      if (m && m[1]) {
        header.tin = m[1].trim()
        continue
      }
    }

    // ── NPI ──
    if (!header.npi) {
      // Match NPI anywhere in the line (not just at start)
      const m = line.match(/\bNPI\s*[:\-]?\s*(\d{10})\b/i)
      if (m && m[1]) {
        header.npi = m[1].trim()
        continue
      }
    }
  }

  // ── Patient Account — extract from data rows (not header rows) ──
  // Look for ACCT-XXXXXX or PAT-XXXXXX pattern (uppercase prefix required)
  const acctMatch = text.match(/\b((?:ACCT|PAT)-[\w\-]+)/)
  if (acctMatch) {
    header.patientAccount = acctMatch[1].trim()
  } else {
    // Try to find it in a labeled line
    for (const line of lines) {
      if (isColumnHeaderLine(line)) continue
      if (/\$\s*\d/.test(line)) continue
      const m = line.match(/^(?:Patient\s*)?Account\s*(?:Number|#|No\.?)?\s*[:\-]?\s*([\w\-]+)/i)
      if (m && m[1] && m[1].trim().length > 2) {
        header.patientAccount = m[1].trim()
        break
      }
    }
  }

  return header
}

// ─── Line item extraction (multi-strategy) ─────────────────────────────────

/**
 * Detects if a line is a table column header row.
 * Requires at least 3 of the billing keywords
 * AND the line must NOT contain dollar amounts (which would make it a data row).
 */
function isTableHeaderRow(line: string): boolean {
  const lower = line.toLowerCase()
  // Must not contain actual dollar amounts
  if (/\$\s*\d/.test(line)) return false
  if (/\d{1,3}(?:,\d{3})*\.\d{2}/.test(line)) return false

  const keywords = [
    'billed', 'charge', 'submitted', 'provider charges',
    'allowed', 'eligible', 'approved', 'allowable', 'fee schedule', 'contracted',
    'paid', 'payment', 'net', 'benefit', 'plan paid', 'prov pd',
    'patient', 'resp', 'copay', 'deduct', 'coinsur', 'you owe', 'your share', 'member resp',
    'cpt', 'hcpcs', 'procedure', 'proc', 'service',
    'units', 'dos', 'date',
    'adjustment', 'remark', 'adj',
  ]
  const matchCount = keywords.filter(kw => lower.includes(kw)).length
  return matchCount >= 3
}

/**
 * Parse the ordered list of amount-type column fields from a header row.
 * Returns only the amount fields (billed, allowed, paid, pr) in the order they appear.
 */
function parseAmountFieldOrder(headerLine: string): string[] {
  const lower = headerLine.toLowerCase()
  
  // Find position of each amount-related keyword
  const fieldPositions: { type: string; pos: number }[] = []
  
  const patterns: { regex: RegExp; type: string }[] = [
    // Billed / Charged / Submitted
    { regex: /\bbilled\b/i, type: 'billed' },
    { regex: /\bcharge[ds]?\b/i, type: 'billed' },
    { regex: /\bsubmitted\b/i, type: 'billed' },
    { regex: /\bamount\s*billed\b/i, type: 'billed' },
    { regex: /\bprovider\s*charges\b/i, type: 'billed' },
    // Allowed / Eligible / Approved / Fee Schedule / Contracted
    { regex: /\ballowed\b/i, type: 'allowed' },
    { regex: /\beligible\b/i, type: 'allowed' },
    { regex: /\bapproved\b/i, type: 'allowed' },
    { regex: /\bfee\s*schedule\b/i, type: 'allowed' },
    { regex: /\bcontracted\b/i, type: 'allowed' },
    { regex: /\ballowable\b/i, type: 'allowed' },
    // Patient Responsibility (must come before Paid to avoid "Paid by Plan" matching paid first)
    { regex: /patient\s*resp(?:onsibility)?\.?/i, type: 'pr' },
    { regex: /\bpt\.?\s*resp(?:onsibility)?\.?/i, type: 'pr' },  // "Pt Resp." abbreviation
    { regex: /member\s*resp(?:onsibility)?\.?/i, type: 'pr' },
    { regex: /your\s*resp(?:onsibility)?/i, type: 'pr' },
    { regex: /you\s*owe/i, type: 'pr' },
    { regex: /your\s*share/i, type: 'pr' },
    { regex: /\bcopay\b/i, type: 'pr' },
    { regex: /\bdeduct(?:ible)?\b/i, type: 'pr' },
    { regex: /\bcoinsur(?:ance)?\b/i, type: 'pr' },
    // Paid / Payment / Plan Paid / Benefit / Provider Paid
    { regex: /\bpaid\s*by\s*plan\b/i, type: 'paid' },
    { regex: /\bplan\s*paid\b/i, type: 'paid' },
    { regex: /\binsurance\s*paid\b/i, type: 'paid' },
    { regex: /\bprov(?:ider)?\s*p(?:ai)?d\b/i, type: 'paid' },
    { regex: /\bbenefit\b/i, type: 'paid' },
    { regex: /\bpaid\b/i, type: 'paid' },
    { regex: /\bpayment\b/i, type: 'paid' },
    { regex: /\bnet\b/i, type: 'paid' },
  ]
  
  const usedTypes = new Set<string>()
  
  for (const { regex, type } of patterns) {
    if (usedTypes.has(type)) continue
    const m = lower.match(regex)
    if (m && m.index !== undefined) {
      fieldPositions.push({ type, pos: m.index })
      usedTypes.add(type)
    }
  }
  
  // Sort by position and return just the types in order
  fieldPositions.sort((a, b) => a.pos - b.pos)
  return fieldPositions.map(f => f.type)
}

/**
 * Check if a header row has a CPT/HCPCS column.
 */
function headerHasCptColumn(headerLine: string): boolean {
  return /\b(?:cpt|hcpcs|procedure)\b/i.test(headerLine)
}

/**
 * Check if a header row has an account column.
 */
function headerHasAccountColumn(headerLine: string): boolean {
  return /\b(?:patient\s*account|account)\b/i.test(headerLine)
}

function extractTableRows(text: string): PdfLineItem[] {
  const items: PdfLineItem[] = []
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)

  // Find the table header row
  let headerLineIdx = -1
  let amountFieldOrder: string[] = []
  let hasCptColumn = false
  let hasAccountColumn = false

  for (let i = 0; i < lines.length; i++) {
    if (isTableHeaderRow(lines[i])) {
      headerLineIdx = i
      amountFieldOrder = parseAmountFieldOrder(lines[i])
      hasCptColumn = headerHasCptColumn(lines[i])
      hasAccountColumn = headerHasAccountColumn(lines[i])
      break
    }
  }

  // Scan for data rows (lines with dollar amounts after the header)
  const startLine = headerLineIdx >= 0 ? headerLineIdx + 1 : 0

  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i]

    // Skip if this looks like another header row or a section title
    if (isTableHeaderRow(line)) continue

    // Skip summary/total lines — comprehensive patterns
    if (/^total\b/i.test(line)) continue
    if (/^subtotal\b/i.test(line)) continue
    if (/^grand\s*total\b/i.test(line)) continue
    if (/\btotal\s+(billed|allowed|paid|patient|charge|amount)/i.test(line)) continue
    if (/\b(check|net\s*payment|net\s*paid|amount\s*paid)\s*[:$]/i.test(line)) continue
    if (/^(summary|remark|note|internal|adjustment\s*summary)/i.test(line)) continue
    if (/^(check|payment|remittance)\s*(amount|total|number|#|no)/i.test(line)) continue

    // A data row must contain dollar amounts
    const amountRegex = /\$?\s*(\d{1,3}(?:,\d{3})*\.\d{2})\b/g
    const amountValues: number[] = []
    let amtMatch: RegExpExecArray | null
    while ((amtMatch = amountRegex.exec(line)) !== null) {
      const val = parseAmount(amtMatch[1])
      if (val !== null) {
        amountValues.push(val)
      }
    }

    if (amountValues.length === 0) continue

    // ── Extract procedure code (CPT, HCPCS, or CPT with modifier) ──
    let procedureCode: string | null = null

    // Strategy 1: HCPCS codes (letter + 4 digits, e.g., J9271, G0463)
    const hcpcsMatch = line.match(/\b([A-Z]\d{4})\b/)
    if (hcpcsMatch) {
      procedureCode = hcpcsMatch[1]
    }

    // Strategy 2: CPT codes with modifiers (e.g., 99214-25 → extract 99214)
    if (!procedureCode) {
      const cptModMatch = line.match(/\b(\d{5})-\d{1,2}\b/)
      if (cptModMatch) {
        const code = cptModMatch[1]
        const pos = cptModMatch.index!
        const before = line.substring(Math.max(0, pos - 10), pos)
        if (!/(?:ACCT|PAT|CLM|ID|#)[\-:\s]*$/i.test(before)) {
          procedureCode = code
        }
      }
    }

    // Strategy 3: Plain 5-digit CPT codes
    if (!procedureCode) {
      const allFiveDigit = [...line.matchAll(/\b(\d{5})\b/g)]
      for (const match of allFiveDigit) {
        const code = match[1]
        const pos = match.index!
        // Skip if preceded by ACCT-, PAT-, CLM-, or similar account prefixes
        const before = line.substring(Math.max(0, pos - 10), pos)
        if (/(?:ACCT|PAT|CLM|ID|#)[\-:\s]*$/i.test(before)) continue
        // Skip if it looks like part of a date (e.g., 20260)
        if (/\d{4}-\d{2}-\d{2}/.test(line.substring(Math.max(0, pos - 5), pos + 10))) continue
        // If header has both account and CPT columns, skip account-embedded numbers
        if (hasAccountColumn && hasCptColumn) {
          const tokenBefore = line.substring(Math.max(0, pos - 15), pos)
          if (/[A-Z]{2,}[\-:]/i.test(tokenBefore)) continue
        }
        procedureCode = code
        break
      }
    }

    if (!procedureCode) continue

    // ── Extract date ──
    const dateMatch = line.match(/\b(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/)
    const serviceDate = dateMatch ? parseDateToISO(dateMatch[1]) : null

    // ── Extract adjustment codes ──
    const adjCodes: string[] = []
    const adjMatch = line.match(/\b(CO-\d+|PR-\d+|OA-\d+|PI-\d+)\b/gi)
    if (adjMatch) adjCodes.push(...adjMatch.map(c => c.toUpperCase()))

    // ── Map amounts to fields using ORDER-BASED mapping ──
    // The key insight: amounts appear in the same order as the header columns.
    // We use the sequential order from the header, not character positions.
    let billed: number | null = null
    let allowed: number | null = null
    let paid: number | null = null
    let patientResp: number | null = null

    if (amountFieldOrder.length >= 2 && amountValues.length >= 2) {
      // Map amounts sequentially to the header column order
      for (let j = 0; j < Math.min(amountValues.length, amountFieldOrder.length); j++) {
        switch (amountFieldOrder[j]) {
          case 'billed': billed = amountValues[j]; break
          case 'allowed': allowed = amountValues[j]; break
          case 'paid': paid = amountValues[j]; break
          case 'pr': patientResp = amountValues[j]; break
        }
      }
    } else {
      // No header detected — fallback: assume standard order Billed, Allowed, Paid, PatientResp
      if (amountValues.length >= 4) {
        billed = amountValues[0]
        allowed = amountValues[1]
        paid = amountValues[2]
        patientResp = amountValues[3]
      } else if (amountValues.length === 3) {
        billed = amountValues[0]
        allowed = amountValues[1]
        paid = amountValues[2]
      } else if (amountValues.length === 2) {
        billed = amountValues[0]
        paid = amountValues[1]
      } else if (amountValues.length === 1) {
        billed = amountValues[0]
      }
    }

    // ── Cross-validation sanity checks ──
    // These checks prevent false positives from column misalignment.
    // If amounts fail sanity checks, downgrade confidence rather than
    // reporting wrong numbers.
    let sanityOk = true

    if (billed !== null && allowed !== null) {
      // Allowed should typically be <= Billed (payer contracts don't pay more than billed)
      // Exception: some payers show allowed > billed for bundled services, so we only
      // flag when allowed is dramatically higher (> 2x billed)
      if (allowed > billed * 2) {
        sanityOk = false
      }
    }

    if (allowed !== null && paid !== null) {
      // Paid should typically be <= Allowed
      if (paid > allowed * 1.01) { // 1% tolerance for rounding
        sanityOk = false
      }
    }

    if (billed !== null && paid !== null) {
      // Paid should never exceed Billed
      if (paid > billed * 1.01) {
        sanityOk = false
      }
    }

    if (patientResp !== null && allowed !== null) {
      // Patient responsibility should not exceed allowed amount
      if (patientResp > allowed * 1.01) {
        sanityOk = false
      }
    }

    if (paid !== null && patientResp !== null && allowed !== null) {
      // Paid + Patient Resp should approximately equal Allowed
      // (with some tolerance for adjustment amounts)
      const totalAccountedFor = paid + patientResp
      if (totalAccountedFor > allowed * 1.5) {
        sanityOk = false
      }
    }

    // Determine confidence based on how many fields we extracted AND sanity checks
    let matchConfidence: 'High' | 'Medium' | 'Low' = 'Low'
    if (billed !== null && allowed !== null && paid !== null && patientResp !== null) {
      matchConfidence = sanityOk ? 'High' : 'Low'
    } else if (billed !== null && allowed !== null && paid !== null) {
      matchConfidence = sanityOk ? 'Medium' : 'Low'
    } else if (billed !== null && paid !== null) {
      matchConfidence = sanityOk ? 'Medium' : 'Low'
    }

    // If sanity checks failed, clear the amounts that are likely misaligned
    // This prevents false underpayment calculations
    if (!sanityOk) {
      // Keep billed (usually reliable as the first amount) but clear others
      // so the finding becomes NEEDS_REVIEW instead of a false UNDERPAID
      allowed = null
      paid = null
      patientResp = null
      matchConfidence = 'Low'
    }

    items.push({
      procedureCode,
      serviceDate,
      billed,
      allowed,
      paid,
      patientResponsibility: patientResp,
      adjustmentCodes: adjCodes,
      page: 1,
      matchConfidence,
    })
  }

  return items
}

// ─── Full extraction pipeline ──────────────────────────────────────────────

export function extractLineItems(text: string, pageCount: number): { lineItems: PdfLineItem[]; rawMatches: PdfMatch[] } {
  const rawMatches: PdfMatch[] = []

  // Strategy 1: Table-row extraction (most reliable)
  const lineItems = extractTableRows(text)

  // Collect evidence of what we found
  const cptRegex = /\b(\d{5})\b/g
  let m: RegExpExecArray | null
  while ((m = cptRegex.exec(text)) !== null) {
    rawMatches.push({ pattern: 'CPT_HCPCS', value: m[1], page: 1, position: m.index })
  }

  const amtRegex = /\$\s*(\d{1,3}(?:,\d{3})*\.\d{2})/g
  while ((m = amtRegex.exec(text)) !== null) {
    rawMatches.push({ pattern: 'AMOUNT', value: m[1], page: 1, position: m.index })
  }

  const dateRegex = /\b(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/g
  while ((m = dateRegex.exec(text)) !== null) {
    rawMatches.push({ pattern: 'DATE', value: m[1], page: 1, position: m.index })
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

  // Step 3: Extract header fields
  const header = extractHeader(text)

  // Step 4: Extract line items deterministically
  const { lineItems, rawMatches } = extractLineItems(text, pageCount)

  return {
    success: lineItems.length > 0,
    method,
    text: text.substring(0, 10000),
    pageCount,
    textDensity,
    lineItems,
    rawMatches,
    header,
  }
}

// ─── Convert PDF extraction to findings ─────────────────────────────────────

export function pdfToFindings(
  extraction: PdfExtractionResult,
  payer: string | null
): FindingInput[] {
  const findings: FindingInput[] = []

  // Use payer from header if not provided by caller
  const effectivePayer = payer || extraction.header.payer || 'Unknown (PDF)'

  if (!extraction.success || extraction.lineItems.length === 0) {
    // No structured data extracted — create INCOMPLETE_DATA finding
    findings.push({
      finding_type: 'INCOMPLETE_DATA',
      confidence: 'Low',
      payer: effectivePayer,
      service_date: extraction.header.remitDate || null,
      procedure_code: null,
      billed_amount: null,
      allowed_amount: null,
      paid_amount: null,
      patient_responsibility: null,
      underpayment_amount: null,
      denial_amount: null,
      denial_category: null,
      appeal_deadline_days: null,
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
          header: extraction.header,
        },
      },
    })
    return findings
  }

  // Process extracted line items
  for (const item of extraction.lineItems) {
    const hasAmounts = item.billed !== null && item.allowed !== null && item.paid !== null

    // Detect denials: billed > 0 but allowed = 0 and paid = 0
    const isDenial = hasAmounts && item.billed! > 0 && item.allowed === 0 && item.paid === 0

    if (isDenial) {
      // Extract CARC codes from adjustment codes
      const carcCodes = item.adjustmentCodes
        .filter(c => c.startsWith('CO-') || c.startsWith('OA-') || c.startsWith('PI-'))
        .map(c => c.split('-')[1])
      const rarcCodes = item.adjustmentCodes
        .filter(c => c.startsWith('PR-'))
        .map(c => c.split('-')[1])

      // Determine denial type based on CARC codes
      const denialCarcMap: Record<string, string> = {
        '50': 'medical necessity', '29': 'timely filing', '97': 'bundling',
        '96': 'non-covered service', '4': 'modifier required', '16': 'missing information',
        '18': 'duplicate claim', '27': 'expenses not covered',
      }
      const denialReasons = carcCodes
        .filter(c => denialCarcMap[c])
        .map(c => `${denialCarcMap[c]} (CARC ${c})`)
      const reasonText = denialReasons.length > 0
        ? `Denial reason: ${denialReasons.join(', ')}.`
        : 'Review adjustment codes for denial reason.'

      // Map CARC codes to denial category using the canonical shared mapping.
      // carcToDenialCategory is the single source of truth — no inline maps here.
      const primaryCarc = carcCodes[0] || ''
      const denialCat = carcToDenialCategory(primaryCarc)
      const deadlineDays = denialCat === 'timely_filing' ? 180 : 90
      findings.push({
        finding_type: 'DENIED_APPEALABLE',
        confidence: item.matchConfidence === 'High' ? 'High' : 'Medium',
        payer: effectivePayer,
        service_date: item.serviceDate || extraction.header.remitDate,
        procedure_code: item.procedureCode,
        billed_amount: item.billed,
        allowed_amount: item.allowed,
        paid_amount: item.paid,
        patient_responsibility: item.patientResponsibility || 0,
        underpayment_amount: null, // Not set for denials — amount unknown until reprocessed
        denial_amount: item.billed, // Billed amount at risk, tracked separately
        denial_category: denialCat,
        appeal_deadline_days: deadlineDays,
        carc_codes: carcCodes,
        rarc_codes: rarcCodes,
        action: `Claim denied: $${item.billed!.toFixed(2)} billed, $0.00 paid. ${reasonText} File appeal with supporting clinical documentation within the payer's appeal deadline.`,
        rationale: `PDF EOB analysis: CPT ${item.procedureCode} was denied. Billed $${item.billed!.toFixed(2)}, Allowed $0.00, Paid $0.00. ${reasonText} Claim: ${extraction.header.claimNumber || 'N/A'}.`,
        evidence: {
          extraction: {
            method: 'pdf_text',
            page: item.page,
            match_confidence: item.matchConfidence,
            claim_number: extraction.header.claimNumber,
            patient_account: extraction.header.patientAccount,
            adjustment_codes: item.adjustmentCodes,
          },
          math: {
            billed: item.billed,
            allowed: 0,
            paid: 0,
            denial: true,
          },
        },
      })
    } else if (hasAmounts && item.billed! > 0 && item.allowed! > 0) {
      const pr = item.patientResponsibility || 0
      const expectedPayer = item.allowed! - pr
      const underpayment = Math.round((expectedPayer - item.paid!) * 100) / 100

      // Extract CARC codes from adjustment codes (e.g., CO-45 -> 45)
      const carcCodes = item.adjustmentCodes
        .filter(c => c.startsWith('CO-') || c.startsWith('OA-') || c.startsWith('PI-'))
        .map(c => c.split('-')[1])
      const rarcCodes = item.adjustmentCodes
        .filter(c => c.startsWith('PR-'))
        .map(c => c.split('-')[1])

      if (underpayment > 0.01) {
        findings.push({
          finding_type: 'UNDERPAID',
          confidence: item.matchConfidence === 'High' ? 'High' : 'Medium',
          payer: effectivePayer,
          service_date: item.serviceDate || extraction.header.remitDate,
          procedure_code: item.procedureCode,
          billed_amount: item.billed,
          allowed_amount: item.allowed,
          paid_amount: item.paid,
          patient_responsibility: pr,
          underpayment_amount: underpayment,
          denial_amount: null,
          denial_category: null,
          appeal_deadline_days: 90,
          carc_codes: carcCodes,
          rarc_codes: rarcCodes,
          action: `Potential underpayment of $${underpayment.toFixed(2)} detected. Allowed amount ($${item.allowed!.toFixed(2)}) minus patient responsibility ($${pr.toFixed(2)}) equals expected payer payment of $${expectedPayer.toFixed(2)}, but only $${item.paid!.toFixed(2)} was paid. File appeal for the $${underpayment.toFixed(2)} difference.`,
          rationale: `PDF EOB analysis: Billed $${item.billed!.toFixed(2)}, Allowed $${item.allowed!.toFixed(2)}, Paid $${item.paid!.toFixed(2)}, Patient Resp $${pr.toFixed(2)}. Underpayment = Allowed - Patient Resp - Paid = $${item.allowed!.toFixed(2)} - $${pr.toFixed(2)} - $${item.paid!.toFixed(2)} = $${underpayment.toFixed(2)}. Claim: ${extraction.header.claimNumber || 'N/A'}. Extraction confidence: ${item.matchConfidence}.`,
          evidence: {
            extraction: {
              method: 'pdf_text',
              page: item.page,
              match_confidence: item.matchConfidence,
              claim_number: extraction.header.claimNumber,
              patient_account: extraction.header.patientAccount,
              adjustment_codes: item.adjustmentCodes,
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
        findings.push({
          finding_type: 'NEEDS_REVIEW',
          confidence: 'Low',
          payer: effectivePayer,
          service_date: item.serviceDate || extraction.header.remitDate,
          procedure_code: item.procedureCode,
          billed_amount: item.billed,
          allowed_amount: item.allowed,
          paid_amount: item.paid,
          patient_responsibility: pr,
          underpayment_amount: null,
          denial_amount: null,
          denial_category: null,
          appeal_deadline_days: 90,
          carc_codes: carcCodes,
          rarc_codes: rarcCodes,
          action: 'Line item extracted from PDF EOB. No underpayment detected. Verify amounts against 835 ERA for complete analysis.',
          rationale: `PDF extraction found line item for ${item.procedureCode}. Amounts appear correctly paid: Allowed $${item.allowed!.toFixed(2)} - Patient Resp $${pr.toFixed(2)} = Expected $${expectedPayer.toFixed(2)}, Paid $${item.paid!.toFixed(2)}.`,
          evidence: {
            extraction: { method: 'pdf_text', page: item.page, match_confidence: item.matchConfidence },
            math: { billed: item.billed, allowed: item.allowed, paid: item.paid, patient_responsibility: pr },
          },
        })
      }
    } else if (item.billed !== null && item.paid !== null && item.allowed === null) {
      // We have billed and paid but no allowed — flag as needs review
      const gap = Math.round((item.billed - item.paid) * 100) / 100
      findings.push({
        finding_type: 'NEEDS_REVIEW',
        confidence: 'Low',
        payer: effectivePayer,
        service_date: item.serviceDate || extraction.header.remitDate,
        procedure_code: item.procedureCode,
        billed_amount: item.billed,
        allowed_amount: null,
        paid_amount: item.paid,
        patient_responsibility: item.patientResponsibility,
        underpayment_amount: null,
        denial_amount: null,
        denial_category: null,
        appeal_deadline_days: 90,
        carc_codes: [],
        rarc_codes: [],
        action: `Billed $${item.billed.toFixed(2)} but only $${item.paid.toFixed(2)} paid (gap: $${gap.toFixed(2)}). Allowed amount not found in PDF — verify against contract or 835 ERA to determine if underpayment exists.`,
        rationale: `Could not determine allowed amount from PDF. Billed: $${item.billed.toFixed(2)}, Paid: $${item.paid.toFixed(2)}. Without allowed amount, cannot compute underpayment with certainty.`,
        evidence: {
          extraction: { method: 'pdf_text', page: item.page, match_confidence: item.matchConfidence },
        },
      })
    } else {
      // Partial data
      findings.push({
        finding_type: 'INCOMPLETE_DATA',
        confidence: 'Low',
        payer: effectivePayer,
        service_date: item.serviceDate || extraction.header.remitDate,
        procedure_code: item.procedureCode,
        billed_amount: item.billed,
        allowed_amount: item.allowed,
        paid_amount: item.paid,
        patient_responsibility: item.patientResponsibility,
        underpayment_amount: null,
        denial_amount: null,
        denial_category: null,
        appeal_deadline_days: 90,
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
