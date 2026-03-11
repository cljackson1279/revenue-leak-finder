/**
 * Deterministic 835 ERA Parser
 *
 * Parses ISA/GS/ST envelopes, BPR, TRN, N1/NM1, CLP, SVC, DTM, CAS, AMT, REF segments.
 * Preserves segment indices for evidence. No PHI stored in output.
 * Output: normalized Claim[] and ServiceLine[] objects.
 */

import { carcToDenialCategory as _carcToDenialCategory, DenialCategory as _DenialCategory, CARC_CATEGORY_MAP } from './carcCategories'

// ─── Types ──────────────────────────────────────────────────────────────────

export type Adjustment = {
  group: string    // CO, PR, OA, CR, PI
  code: string     // CARC code
  amount: number
  quantity?: number
  segmentIndex: number
}

export type ServiceLine = {
  procedureCode: string
  billed: number
  paid: number
  allowed: number
  patientResponsibility: number
  adjustments: Adjustment[]
  serviceDate: string | null   // YYYYMMDD from DTM*472
  segmentIndices: number[]     // all segment indices for this line
  carcCodes: string[]
  rarcCodes: string[]
}

export type ClaimData = {
  claimId: string
  claimStatus: string
  totalCharged: number
  totalPaid: number
  patientResponsibility: number
  payer: string
  payee: string
  traceNumber: string
  checkDate: string | null
  serviceLines: ServiceLine[]
  segmentIndices: number[]
  refIds: Record<string, string>   // REF qualifier -> value
}

export type ParsedERA = {
  claims: ClaimData[]
  payer: string
  payee: string
  checkAmount: number
  checkDate: string | null
  traceNumber: string
  transactionCount: number
}

// ─── Segment splitter ───────────────────────────────────────────────────────

function splitSegments(ediText: string): { tag: string; elements: string[]; index: number }[] {
  // Detect segment terminator: usually ~ but could be \n
  const trimmed = ediText.trim()

  // Split by ~ followed by optional whitespace/newlines
  const rawSegments = trimmed
    .split(/~[\s]*/)
    .map(s => s.trim())
    .filter(s => s.length > 0)

  return rawSegments.map((raw, index) => {
    const elements = raw.split('*')
    return { tag: elements[0], elements, index }
  })
}

// ─── PHI-safe segment tags (we never store NM1*QC patient data) ─────────

const PHI_SEGMENT_TAGS = new Set(['NM1']) // We'll filter by qualifier

// ─── Main parser ────────────────────────────────────────────────────────────

export function parse835(ediText: string): ParsedERA {
  const segments = splitSegments(ediText)

  let payer = 'Unknown Payer'
  let payee = 'Unknown Payee'
  let checkAmount = 0
  let checkDate: string | null = null
  let traceNumber = ''
  let transactionCount = 0

  const claims: ClaimData[] = []
  let currentClaim: ClaimData | null = null
  let currentLine: ServiceLine | null = null

  const pushLine = () => {
    if (currentLine && currentClaim) {
      // Compute allowed from CO adjustments if AMT*B6 was not present
      if (currentLine.allowed === 0 && currentLine.billed > 0) {
        const coTotal = currentLine.adjustments
          .filter(a => a.group === 'CO')
          .reduce((s, a) => s + a.amount, 0)
        currentLine.allowed = Math.max(0, currentLine.billed - coTotal)
      }

      // Compute patient responsibility from PR adjustments
      currentLine.patientResponsibility = currentLine.adjustments
        .filter(a => a.group === 'PR')
        .reduce((s, a) => s + a.amount, 0)

      // Collect CARC codes
      currentLine.carcCodes = [
        ...new Set(currentLine.adjustments.map(a => a.code).filter(Boolean)),
      ]

      currentClaim.serviceLines.push(currentLine)
      currentLine = null
    }
  }

  for (const seg of segments) {
    const { tag, elements: el, index } = seg

    // ── ISA envelope ──
    // (We skip ISA parsing for now; it's envelope metadata)

    // ── BPR: check/payment info ──
    if (tag === 'BPR') {
      checkAmount = parseFloat(el[2]) || 0
      // BPR*I*amount*C*ACH*...*date (element 16)
      if (el[16]) checkDate = el[16]
    }

    // ── TRN: trace/reference number ──
    if (tag === 'TRN') {
      traceNumber = el[2] || ''
    }

    // ── DTM at header level (check date) ──
    if (tag === 'DTM' && el[1] === '405' && !currentClaim) {
      checkDate = el[2] || checkDate
    }

    // ── N1: payer (PR) / payee (PE) ──
    if (tag === 'N1') {
      if (el[1] === 'PR') payer = el[2] || 'Unknown Payer'
      if (el[1] === 'PE') payee = el[2] || 'Unknown Payee'
    }

    // ── ST: transaction set ──
    if (tag === 'ST') {
      transactionCount++
    }

    // ── CLP: claim level ──
    if (tag === 'CLP') {
      pushLine() // flush previous service line

      currentClaim = {
        claimId: el[1] || '',
        claimStatus: el[2] || '',
        totalCharged: parseFloat(el[3]) || 0,
        totalPaid: parseFloat(el[4]) || 0,
        patientResponsibility: parseFloat(el[5]) || 0,
        payer,
        payee,
        traceNumber,
        checkDate,
        serviceLines: [],
        segmentIndices: [index],
        refIds: {},
      }
      claims.push(currentClaim)
    }

    // ── NM1: we only store payer/payee names, skip patient (QC) for PHI ──
    if (tag === 'NM1' && currentClaim) {
      currentClaim.segmentIndices.push(index)
      // Do NOT store QC (patient) data — PHI protection
    }

    // ── REF: reference identifiers at claim level ──
    if (tag === 'REF' && currentClaim && !currentLine) {
      const qualifier = el[1] || ''
      const value = el[2] || ''
      if (qualifier && value) {
        currentClaim.refIds[qualifier] = value
      }
      currentClaim.segmentIndices.push(index)
    }

    // ── SVC: service line ──
    if (tag === 'SVC' && currentClaim) {
      pushLine() // flush previous service line

      // SVC01 may be "HC:99213", "HC>99213", or composite
      const raw = el[1] || ''
      const procedureCode = raw.replace(/^[A-Z]{2}[:|>]/, '').split(/[:|>]/)[0]

      currentLine = {
        procedureCode,
        billed: parseFloat(el[2]) || 0,
        paid: parseFloat(el[3]) || 0,
        allowed: 0,
        patientResponsibility: 0,
        adjustments: [],
        serviceDate: null,
        segmentIndices: [index],
        carcCodes: [],
        rarcCodes: [],
      }
    }

    // ── DTM at service line level ──
    if (tag === 'DTM' && currentLine) {
      if (el[1] === '472') {
        currentLine.serviceDate = el[2] || null
      }
      currentLine.segmentIndices.push(index)
    }

    // ── CAS: adjustments ──
    if (tag === 'CAS' && currentLine) {
      const group = el[1] || ''
      // Up to 6 code/amount/quantity triplets starting at element 2
      for (let i = 2; i < el.length; i += 3) {
        const code = el[i]
        const amount = parseFloat(el[i + 1]) || 0
        const quantity = el[i + 2] ? parseInt(el[i + 2]) : undefined
        if (code) {
          currentLine.adjustments.push({ group, code, amount, quantity, segmentIndex: index })
        }
      }
      currentLine.segmentIndices.push(index)
    }

    // ── AMT: allowed amount (B6) ──
    if (tag === 'AMT' && currentLine) {
      if (el[1] === 'B6') {
        currentLine.allowed = parseFloat(el[2]) || 0
      }
      currentLine.segmentIndices.push(index)
    }

    // ── REF at service line level ──
    if (tag === 'REF' && currentLine) {
      currentLine.segmentIndices.push(index)
    }
  }

  // Flush last service line
  pushLine()

  return {
    claims,
    payer,
    payee,
    checkAmount,
    checkDate,
    traceNumber,
    transactionCount,
  }
}

// ─── Finding computation engine ─────────────────────────────────────────────

// DenialCategory is defined in carcCategories.ts — the single source of truth.
// Re-exported here for backward compatibility with existing imports.
export type DenialCategory = _DenialCategory

export type AppealStatus =
  | 'not_filed'
  | 'filed'
  | 'won'
  | 'lost'
  | 'resubmitted'

export type FindingInput = {
  finding_type: 'UNDERPAID' | 'DENIED_APPEALABLE' | 'DENIED_NON_APPEALABLE' | 'NEEDS_REVIEW' | 'INCOMPLETE_DATA'
  confidence: 'High' | 'Medium' | 'Low'
  payer: string | null
  service_date: string | null
  procedure_code: string | null
  billed_amount: number | null
  allowed_amount: number | null
  paid_amount: number | null
  patient_responsibility: number | null
  /** Net Recoverable from Payer = Allowed - Paid - PatientResponsibility. Null for denied claims (unknown until reprocessed). */
  underpayment_amount: number | null
  /** For denied claims: the billed amount at risk. Separate from underpayment_amount to avoid inflating recovery totals. */
  denial_amount: number | null
  denial_category: DenialCategory | null
  appeal_deadline_days: number | null
  carc_codes: string[]
  rarc_codes: string[]
  action: string
  rationale: string
  evidence: Record<string, unknown>
}

/**
 * Load appeal rules for determining appealability of CARC codes.
 * Returns the rules object or empty defaults.
 */
let appealRulesCache: Record<string, unknown> | null = null

export function loadAppealRules(): Record<string, { appealable: boolean; template: string; description: string }> {
  if (appealRulesCache) return appealRulesCache as Record<string, { appealable: boolean; template: string; description: string }>
  try {
    // Dynamic import at build time won't work in edge; use require for Node
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rules = require('../data/appeal_rules.json')
    appealRulesCache = rules
    return rules
  } catch {
    return {}
  }
}

/**
 * Determine if a CARC code indicates a denial vs. adjustment.
 */
const DENIAL_CARCS = new Set([
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12',
  '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '26', '27',
  '29', '31', '32', '33', '34', '35', '39', '40',
  '49', '50', '51', '55', '56', '58', '59',
  '96', '97', '107', '109', '119', '125',
  '146', '147', '148', '149', '150', '151', '152',
  '167', '170', '171', '172', '173', '174',
  '181', '182', '183', '184', '185', '186', '187', '188', '189',
  '190', '191', '192', '193', '194', '195', '196', '197',
  '198', '199', '200', '201', '202', '203', '204',
  '205', '206', '207', '208', '209', '210', '211', '212',
  '213', '214', '215', '216', '217', '218', '219', '220',
  '221', '222', '223', '224', '225', '226', '227',
  '228', '229', '230', '231', '232', '233', '234', '235', '236',
  '237', '238', '239', '240', '241', '242',
  '243', '244', '245', '246', '247', '248', '249', '250',
  '251', '252', '253', '254', '255', '256', '257', '258', '259', '260',
  '261', '262', '263', '264',
])

/**
 * Map a CARC code to a denial category.
 * Delegates to the canonical shared mapping in carcCategories.ts.
 * That module is the single source of truth — edit it, not this function.
 */
export const carcToDenialCategory = _carcToDenialCategory

/**
 * Compute findings from parsed 835 claims.
 * Deterministic: no LLM, no guessing.
 */
export function computeFindings(claims: ClaimData[]): FindingInput[] {
  const findings: FindingInput[] = []
  const rules = loadAppealRules()

  for (const claim of claims) {
    for (const line of claim.serviceLines) {
      const {
        procedureCode, billed, paid, allowed, patientResponsibility,
        adjustments, serviceDate, segmentIndices, carcCodes,
      } = line

      // Parse service date to ISO format
      let serviceDateISO: string | null = null
      if (serviceDate && serviceDate.length === 8) {
        serviceDateISO = `${serviceDate.slice(0, 4)}-${serviceDate.slice(4, 6)}-${serviceDate.slice(6, 8)}`
      }

      // Detect full denial: paid=0 with CO denial CARC codes
      const coAdjustmentsAll = adjustments.filter(a => a.group === 'CO')
      const hasDenialCarc = coAdjustmentsAll.some(a => DENIAL_CARCS.has(a.code) && a.amount > 0)
      const isFullDenial = paid === 0 && hasDenialCarc && billed > 0
      // Also handle bundled/denied lines where allowed=0 but CO denial CARC covers the full amount
      const isDenialAdjustment = hasDenialCarc && billed > 0 && allowed === 0

      const hasAllFields = (billed > 0 && allowed > 0) || isFullDenial || isDenialAdjustment

      // Build evidence object (no PHI)
      const baseEvidence = {
        math: {
          billed,
          allowed,
          paid,
          patient_responsibility: patientResponsibility,
        },
        source: {
          segment_indices: segmentIndices,
          claim_id: claim.claimId,
          trace_number: claim.traceNumber,
        },
        codes: {
          carc_codes: carcCodes,
          adjustments: adjustments.map(a => ({
            group: a.group,
            code: a.code,
            amount: a.amount,
          })),
        },
      }

      // ── 1. Check for incomplete data ──
      if (!hasAllFields) {
        findings.push({
          finding_type: 'INCOMPLETE_DATA',
          confidence: 'Low',
          payer: claim.payer,
          service_date: serviceDateISO,
          procedure_code: procedureCode || null,
          billed_amount: billed || null,
          allowed_amount: allowed || null,
          paid_amount: paid || null,
          patient_responsibility: patientResponsibility || null,
          underpayment_amount: null,
          denial_amount: null,
          denial_category: null,
          appeal_deadline_days: 90,
          carc_codes: carcCodes,
          rarc_codes: line.rarcCodes,
          action: 'Verify allowed amount and fee schedule reference; request EOB detail from payer; confirm patient responsibility breakdown.',
          rationale: `Missing required fields for deterministic analysis. Billed: $${billed.toFixed(2)}, Allowed: $${allowed.toFixed(2)}, Paid: $${paid.toFixed(2)}. Cannot compute underpayment without complete data.`,
          evidence: baseEvidence,
        })
        continue
      }

      // ── 2. Underpayment check ──
      const expectedPayer = allowed - patientResponsibility
      const underpayment = Math.round((expectedPayer - paid) * 100) / 100

      if (underpayment > 0.01) {
        findings.push({
          finding_type: 'UNDERPAID',
          confidence: 'High',
          payer: claim.payer,
          service_date: serviceDateISO,
          procedure_code: procedureCode,
          billed_amount: billed,
          allowed_amount: allowed,
          paid_amount: paid,
          patient_responsibility: patientResponsibility,
          underpayment_amount: underpayment,
          denial_amount: null,
          denial_category: null,
          appeal_deadline_days: 90,
          carc_codes: carcCodes,
          rarc_codes: line.rarcCodes,
          action: `File underpayment appeal with ${claim.payer}. Reference claim ${claim.claimId}, trace ${claim.traceNumber}. Expected payer payment: $${expectedPayer.toFixed(2)}, received: $${paid.toFixed(2)}. Underpayment: $${underpayment.toFixed(2)}.`,
          rationale: `${claim.payer} paid $${paid.toFixed(2)} but allowed $${allowed.toFixed(2)}` +
            (patientResponsibility > 0 ? ` minus patient responsibility $${patientResponsibility.toFixed(2)}` : '') +
            ` = expected payer payment $${expectedPayer.toFixed(2)}. Delta: $${underpayment.toFixed(2)}.`,
          evidence: {
            ...baseEvidence,
            math: {
              ...baseEvidence.math,
              expected_payer_payment: expectedPayer,
              underpayment,
              formula: 'Net Recoverable from Payer = Allowed - PatientResponsibility - Paid',
            },
          },
        })
      }

      // ── 3. Denial / adjustment analysis ──
      // Check CO adjustments for denial CARCs
      const coAdjustments = adjustments.filter(a => a.group === 'CO')
      for (const adj of coAdjustments) {
        if (DENIAL_CARCS.has(adj.code) && adj.amount > 0) {
          // Check appeal rules
          const rule = rules[adj.code]
          let findingType: FindingInput['finding_type'] = 'NEEDS_REVIEW'
          let action = `Review CARC ${adj.code} adjustment of $${adj.amount.toFixed(2)}. Determine if appeal is warranted based on contract terms and clinical documentation.`

          if (rule) {
            if (rule.appealable) {
              findingType = 'DENIED_APPEALABLE'
              action = `Appeal CARC ${adj.code} (${rule.description}). Use template: ${rule.template}. Amount: $${adj.amount.toFixed(2)}.`
            } else {
              findingType = 'DENIED_NON_APPEALABLE'
              action = `CARC ${adj.code} (${rule.description}) is typically non-appealable. Review contract terms to confirm. Amount: $${adj.amount.toFixed(2)}.`
            }
          }

          // Don't duplicate if we already flagged underpayment for same line
          const alreadyFlagged = findings.some(
            f => f.procedure_code === procedureCode &&
              f.service_date === serviceDateISO &&
              f.finding_type === 'UNDERPAID'
          )

          if (!alreadyFlagged || findingType !== 'NEEDS_REVIEW') {
            // For denials: underpayment_amount stays null (unknown until reprocessed).
            // denial_amount holds the billed amount at risk, kept separate to avoid inflating recovery totals.
            const isDenialFinding = findingType === 'DENIED_APPEALABLE' || findingType === 'DENIED_NON_APPEALABLE'
            const denialCategory = isDenialFinding ? carcToDenialCategory(adj.code) : null
            // Appeal deadline: 90 days default; timely filing denials get 180 days
            const deadlineDays = denialCategory === 'timely_filing' ? 180 : 90
            findings.push({
              finding_type: findingType,
              confidence: rule ? 'Medium' : 'Low',
              payer: claim.payer,
              service_date: serviceDateISO,
              procedure_code: procedureCode,
              billed_amount: billed,
              allowed_amount: allowed,
              paid_amount: paid,
              patient_responsibility: patientResponsibility,
              underpayment_amount: null, // Not set for denials — amount unknown until reprocessed
              denial_amount: isDenialFinding ? adj.amount : null,
              denial_category: denialCategory,
              appeal_deadline_days: deadlineDays,
              carc_codes: [adj.code],
              rarc_codes: line.rarcCodes,
              action,
              rationale: `CO adjustment with CARC ${adj.code} for $${adj.amount.toFixed(2)} on procedure ${procedureCode}. ${rule ? rule.description : 'Review adjustment reason and determine next steps.'}`,
              evidence: {
                ...baseEvidence,
                denial: {
                  group_code: 'CO',
                  carc: adj.code,
                  amount: adj.amount,
                  rule_applied: rule ? { template: rule.template, appealable: rule.appealable } : null,
                },
              },
            })
          }
        }
      }

      // ── 4. OA (Other Adjustment) review ──
      const oaAdjustments = adjustments.filter(a => a.group === 'OA' && a.amount > 0)
      for (const adj of oaAdjustments) {
        findings.push({
          finding_type: 'NEEDS_REVIEW',
          confidence: 'Low',
          payer: claim.payer,
          service_date: serviceDateISO,
          procedure_code: procedureCode,
          billed_amount: billed,
          allowed_amount: allowed,
          paid_amount: paid,
          patient_responsibility: patientResponsibility,
          underpayment_amount: adj.amount,
          denial_amount: null,
          denial_category: null,
          appeal_deadline_days: 90,
          carc_codes: [adj.code],
          rarc_codes: line.rarcCodes,
          action: `Review OA adjustment CARC ${adj.code} for $${adj.amount.toFixed(2)}. Determine if this is a valid other-payer adjustment or if it should be appealed.`,
          rationale: `Other Adjustment (OA) with CARC ${adj.code} for $${adj.amount.toFixed(2)} on procedure ${procedureCode}. OA adjustments may indicate coordination of benefits issues or other payer responsibility.`,
          evidence: {
            ...baseEvidence,
            adjustment: { group_code: 'OA', carc: adj.code, amount: adj.amount },
          },
        })
      }
    }
  }

  return findings
}
