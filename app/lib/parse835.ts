// Minimal 835 ERA parser — extracts service lines and computes revenue leak findings.
// Handles standard ~ segment terminator, * element separator.

export type Adjustment = { group: string; code: string; amount: number }

export type ServiceLine = {
  procedureCode: string
  billed: number
  paid: number
  allowed: number
  patientResponsibility: number
  adjustments: Adjustment[]
}

export type ClaimData = {
  claimId: string
  payer: string
  serviceLines: ServiceLine[]
}

export type Finding = {
  finding_type: string
  amount: number
  confidence: 'High' | 'Med' | 'Low'
  rationale: string
  procedure_code: string
  payer: string
}

function segments(ediText: string): string[][] {
  return ediText
    .split(/~[\r\n]*/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => s.split('*'))
}

export function parse835(ediText: string): { claims: ClaimData[]; payer: string } {
  const segs = segments(ediText)
  let payer = 'Unknown Payer'
  const claims: ClaimData[] = []
  let currentClaim: ClaimData | null = null
  let currentLine: ServiceLine | null = null

  const pushLine = () => {
    if (currentLine && currentClaim) {
      // Fill allowed from CO adjustments if AMT*B6 absent
      if (currentLine.allowed === 0) {
        const coTotal = currentLine.adjustments
          .filter(a => a.group === 'CO')
          .reduce((s, a) => s + a.amount, 0)
        currentLine.allowed = Math.max(0, currentLine.billed - coTotal)
      }
      currentClaim.serviceLines.push(currentLine)
      currentLine = null
    }
  }

  for (const seg of segs) {
    const id = seg[0]

    if (id === 'N1' && seg[1] === 'PR') {
      payer = seg[2] || 'Unknown Payer'
    }

    if (id === 'CLP') {
      pushLine()
      currentClaim = { claimId: seg[1] || '', payer, serviceLines: [] }
      claims.push(currentClaim)
    }

    if (id === 'SVC' && currentClaim) {
      pushLine()
      // SVC01 may be "HC:99213", "HC>99213", or plain "99213"
      const raw = seg[1] || ''
      const procedureCode = raw.replace(/^[A-Z]{2}[:|>]/, '').split(/[:|>]/)[0]
      currentLine = {
        procedureCode,
        billed: parseFloat(seg[2]) || 0,
        paid: parseFloat(seg[3]) || 0,
        allowed: 0,
        patientResponsibility: 0,
        adjustments: [],
      }
    }

    if (id === 'CAS' && currentLine) {
      const group = seg[1] || ''
      // Up to 6 code/amount pairs starting at index 2
      for (let i = 2; i + 1 < seg.length; i += 3) {
        const code = seg[i]
        const amount = parseFloat(seg[i + 1]) || 0
        if (code && amount) {
          currentLine.adjustments.push({ group, code, amount })
          if (group === 'PR') currentLine.patientResponsibility += amount
        }
      }
    }

    if (id === 'AMT' && seg[1] === 'B6' && currentLine) {
      currentLine.allowed = parseFloat(seg[2]) || 0
    }
  }

  pushLine()
  return { claims, payer }
}

export function computeFindings(claims: ClaimData[]): Finding[] {
  const findings: Finding[] = []

  for (const claim of claims) {
    for (const line of claim.serviceLines) {
      const { procedureCode, billed, paid, allowed, patientResponsibility, adjustments } = line
      const hasAllFields = billed > 0 && allowed > 0

      // 1. Underpaid vs allowed
      const expectedPayer = allowed - patientResponsibility
      const underpayment = Math.round((expectedPayer - paid) * 100) / 100
      if (underpayment > 0.01 && hasAllFields) {
        findings.push({
          finding_type: 'Underpaid vs allowed',
          amount: underpayment,
          confidence: 'High',
          rationale:
            `${claim.payer} paid $${paid.toFixed(2)} but allowed $${allowed.toFixed(2)}` +
            (patientResponsibility > 0
              ? ` minus patient responsibility $${patientResponsibility.toFixed(2)}`
              : '') +
            ` = expected payer payment $${expectedPayer.toFixed(2)}. Delta: $${underpayment.toFixed(2)}.`,
          procedure_code: procedureCode,
          payer: claim.payer,
        })
      }

      // 2. CO-45 contractual mismatch (payer over-reduced)
      const co45 = adjustments
        .filter(a => a.group === 'CO' && a.code === '45')
        .reduce((s, a) => s + a.amount, 0)
      if (co45 > 0 && allowed > 0) {
        const impliedAllowed = Math.round((billed - co45) * 100) / 100
        const mismatch = Math.round(Math.abs(impliedAllowed - allowed) * 100) / 100
        if (mismatch > 0.01) {
          findings.push({
            finding_type: 'CO-45 contractual mismatch',
            amount: mismatch,
            confidence: 'Med',
            rationale:
              `CO-45 adjustment of $${co45.toFixed(2)} implies allowed = $${impliedAllowed.toFixed(2)},` +
              ` but ERA reports allowed = $${allowed.toFixed(2)}. Mismatch: $${mismatch.toFixed(2)}.`,
            procedure_code: procedureCode,
            payer: claim.payer,
          })
        }
      }
    }
  }

  return findings
}
