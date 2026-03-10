#!/usr/bin/env npx tsx
/**
 * Fetch CARC and RARC code lists from authoritative sources.
 * Writes to app/data/carc.json, app/data/rarc.json, app/data/code_list_meta.json
 *
 * Sources:
 * - CARC: https://www.wpc-edi.com/reference/codelists/healthcare/claim-adjustment-reason-codes/
 * - RARC: https://www.wpc-edi.com/reference/codelists/healthcare/remittance-advice-remark-codes/
 *
 * Usage: npx tsx scripts/fetch-code-lists.ts
 */

import * as fs from 'fs'
import * as path from 'path'

const DATA_DIR = path.join(__dirname, '..', 'data')

const CARC_URL = 'https://www.wpc-edi.com/reference/codelists/healthcare/claim-adjustment-reason-codes/'
const RARC_URL = 'https://www.wpc-edi.com/reference/codelists/healthcare/remittance-advice-remark-codes/'

type CodeEntry = {
  code: string
  description: string
  effective?: string
  terminated?: string
}

type CodeMap = Record<string, CodeEntry>

async function fetchAndParse(url: string, label: string): Promise<CodeMap> {
  console.log(`[fetch-code-lists] Fetching ${label} from ${url}...`)

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RevenueRecoveryEngine/1.0 (code-list-sync)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    })

    if (!response.ok) {
      console.error(`[fetch-code-lists] HTTP ${response.status} for ${label}`)
      return {}
    }

    const html = await response.text()
    const codes: CodeMap = {}

    // Parse HTML table rows for code entries
    // WPC tables typically have: Code | Description | Effective Date | Termination Date
    const tableRowPattern = /<tr[^>]*>\s*<td[^>]*>\s*(\d+)\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>(?:\s*<td[^>]*>([\s\S]*?)<\/td>)?(?:\s*<td[^>]*>([\s\S]*?)<\/td>)?/gi

    let match: RegExpExecArray | null
    while ((match = tableRowPattern.exec(html)) !== null) {
      const code = match[1].trim()
      const description = match[2]
        .replace(/<[^>]+>/g, '')  // Strip HTML tags
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim()

      const effective = match[3]?.replace(/<[^>]+>/g, '').trim() || undefined
      const terminated = match[4]?.replace(/<[^>]+>/g, '').trim() || undefined

      if (code && description) {
        codes[code] = { code, description, effective, terminated }
      }
    }

    console.log(`[fetch-code-lists] Parsed ${Object.keys(codes).length} ${label} codes`)
    return codes
  } catch (error) {
    console.error(`[fetch-code-lists] Error fetching ${label}:`, error instanceof Error ? error.message : 'unknown')
    return {}
  }
}

async function main() {
  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }

  const carc = await fetchAndParse(CARC_URL, 'CARC')
  const rarc = await fetchAndParse(RARC_URL, 'RARC')

  // Write CARC
  const carcPath = path.join(DATA_DIR, 'carc.json')
  fs.writeFileSync(carcPath, JSON.stringify(carc, null, 2))
  console.log(`[fetch-code-lists] Wrote ${carcPath}`)

  // Write RARC
  const rarcPath = path.join(DATA_DIR, 'rarc.json')
  fs.writeFileSync(rarcPath, JSON.stringify(rarc, null, 2))
  console.log(`[fetch-code-lists] Wrote ${rarcPath}`)

  // Write metadata
  const metaPath = path.join(DATA_DIR, 'code_list_meta.json')
  fs.writeFileSync(
    metaPath,
    JSON.stringify(
      {
        last_fetched: new Date().toISOString(),
        carc_count: Object.keys(carc).length,
        rarc_count: Object.keys(rarc).length,
        sources: {
          carc: CARC_URL,
          rarc: RARC_URL,
        },
      },
      null,
      2
    )
  )
  console.log(`[fetch-code-lists] Wrote ${metaPath}`)

  // If both empty, create placeholder files
  if (Object.keys(carc).length === 0) {
    console.warn('[fetch-code-lists] CARC list is empty — using built-in fallback')
    fs.writeFileSync(carcPath, JSON.stringify(BUILTIN_CARC, null, 2))
  }
  if (Object.keys(rarc).length === 0) {
    console.warn('[fetch-code-lists] RARC list is empty — using built-in fallback')
    fs.writeFileSync(rarcPath, JSON.stringify(BUILTIN_RARC, null, 2))
  }
}

// ─── Built-in fallback for common codes ─────────────────────────────────────

const BUILTIN_CARC: CodeMap = {
  '1': { code: '1', description: 'Deductible Amount' },
  '2': { code: '2', description: 'Coinsurance Amount' },
  '3': { code: '3', description: 'Co-payment Amount' },
  '4': { code: '4', description: 'The procedure code is inconsistent with the modifier used or a required modifier is missing.' },
  '5': { code: '5', description: 'The procedure code/bill type is inconsistent with the place of service.' },
  '6': { code: '6', description: 'The procedure/revenue code is inconsistent with the patient\'s age.' },
  '9': { code: '9', description: 'The diagnosis is inconsistent with the patient\'s age.' },
  '11': { code: '11', description: 'The diagnosis is inconsistent with the procedure.' },
  '16': { code: '16', description: 'Claim/service lacks information or has submission/billing error(s).' },
  '18': { code: '18', description: 'Exact duplicate claim/service.' },
  '22': { code: '22', description: 'This care may be covered by another payer per coordination of benefits.' },
  '23': { code: '23', description: 'The impact of prior payer(s) adjudication including payments and/or adjustments.' },
  '24': { code: '24', description: 'Charges are covered under a capitation agreement/managed care plan.' },
  '26': { code: '26', description: 'Expenses incurred prior to coverage.' },
  '27': { code: '27', description: 'Expenses incurred after coverage terminated.' },
  '29': { code: '29', description: 'The time limit for filing has expired.' },
  '31': { code: '31', description: 'Patient cannot be identified as our insured.' },
  '32': { code: '32', description: 'Our records indicate that this dependent is not an eligible dependent as defined.' },
  '33': { code: '33', description: 'Insured has no dependent coverage.' },
  '34': { code: '34', description: 'Insured has no coverage for newborns.' },
  '35': { code: '35', description: 'Lifetime benefit maximum has been reached.' },
  '39': { code: '39', description: 'Services denied at the time authorization/pre-certification was requested.' },
  '40': { code: '40', description: 'Charges do not meet qualifications for emergent/urgent care.' },
  '45': { code: '45', description: 'Charge exceeds fee schedule/maximum allowable or contracted/legislated fee arrangement.' },
  '49': { code: '49', description: 'This is a non-covered service because it is a routine/preventive exam or a diagnostic/screening procedure done in conjunction with a routine/preventive exam.' },
  '50': { code: '50', description: 'These are non-covered services because this is not deemed a \'medical necessity\' by the payer.' },
  '51': { code: '51', description: 'These are non-covered services because this is a pre-existing condition.' },
  '55': { code: '55', description: 'Procedure/treatment/drug is deemed experimental/investigational by the payer.' },
  '56': { code: '56', description: 'Procedure/treatment has not been deemed \'proven to be effective\' by the payer.' },
  '58': { code: '58', description: 'Treatment was deemed by the payer to have been rendered in an inappropriate or invalid place of service.' },
  '59': { code: '59', description: 'Processed based on multiple or concurrent procedure rules.' },
  '96': { code: '96', description: 'Non-covered charge(s). At least one Remark Code must be provided.' },
  '97': { code: '97', description: 'The benefit for this service is included in the payment/allowance for another service/procedure that has already been adjudicated.' },
  '107': { code: '107', description: 'The related or qualifying claim/service was not identified on this claim.' },
  '109': { code: '109', description: 'Claim/service not covered by this payer/contractor. You must send the claim/service to the correct payer/contractor.' },
  '119': { code: '119', description: 'Benefit maximum for this time period or occurrence has been reached.' },
  '125': { code: '125', description: 'Submission/billing error(s). At least one Remark Code must be provided.' },
  '146': { code: '146', description: 'Diagnosis was invalid for the date(s) of service reported.' },
  '167': { code: '167', description: 'This (these) diagnosis(es) is (are) not covered.' },
  '170': { code: '170', description: 'Payment is denied when performed/billed by this type of provider.' },
  '197': { code: '197', description: 'Precertification/authorization/notification/pre-treatment absent.' },
  '204': { code: '204', description: 'This service/equipment/drug is not covered under the patient\'s current benefit plan.' },
  '242': { code: '242', description: 'Services not provided by network/primary care providers.' },
  '253': { code: '253', description: 'Sequestration - Loss in Federal Spending.' },
}

const BUILTIN_RARC: CodeMap = {
  'M1': { code: 'M1', description: 'X-ray not taken within the past 12 months or near enough to the start of treatment.' },
  'M2': { code: 'M2', description: 'Not paid separately when the patient is an inpatient.' },
  'M15': { code: 'M15', description: 'Separately billed services/tests have been bundled as they are considered components of the same procedure.' },
  'M20': { code: 'M20', description: 'Missing/incomplete/invalid HCPCS.' },
  'M79': { code: 'M79', description: 'Missing/incomplete/invalid charge amount.' },
  'N1': { code: 'N1', description: 'You may appeal this decision.' },
  'N2': { code: 'N2', description: 'This allowance has been made in accordance with the most appropriate level of care.' },
  'N4': { code: 'N4', description: 'Missing/Incomplete/Invalid prior Insurance Carrier(s) EOB.' },
  'N19': { code: 'N19', description: 'Procedure code incidental to primary procedure.' },
  'N20': { code: 'N20', description: 'Service not separately priced or included in the allowance for another service or procedure.' },
  'N30': { code: 'N30', description: 'Patient ineligible for this service.' },
  'N115': { code: 'N115', description: 'This decision was based on a National Coverage Determination (NCD).' },
  'N386': { code: 'N386', description: 'This decision was based on a Local Coverage Determination (LCD).' },
  'N432': { code: 'N432', description: 'Alert: Adjustment based on the sequestration of funds as mandated by law.' },
}

main().catch(console.error)
