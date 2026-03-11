/**
 * Canonical CARC-to-denial-category mapping.
 *
 * SINGLE SOURCE OF TRUTH — used by both parse835.ts and parsePdf.ts.
 *
 * Design rules:
 *  1. Every CARC code appears in exactly ONE category.
 *  2. The map is a plain Record<string, DenialCategory> — no if-else chains,
 *     no array searches — so lookup is O(1) and there is no precedence ambiguity.
 *  3. Any code not listed here returns 'other'.
 *  4. Category assignments follow the official CMS CARC descriptions.
 *
 * To add or move a code: edit this file only. Both parsers will pick up the change
 * automatically. Never duplicate a code across categories.
 *
 * Last reviewed: 2026-03-11
 */

export type DenialCategory =
  | 'medical_necessity'
  | 'timely_filing'
  | 'bundling'
  | 'missing_info'
  | 'authorization'
  | 'not_covered'
  | 'duplicate_claim'
  | 'other'

/**
 * Canonical CARC → DenialCategory map.
 * Each code appears exactly once. No duplicates.
 */
export const CARC_CATEGORY_MAP: Record<string, DenialCategory> = {
  // ── medical_necessity ──────────────────────────────────────────────────────
  // Service not medically necessary / not reasonable / not covered for diagnosis
  '39':  'medical_necessity', // Services not covered when performed by this type of provider
  '50':  'medical_necessity', // These are non-covered services because this is not deemed a medical necessity
  '55':  'medical_necessity', // Procedure/treatment is deemed experimental/investigational
  '56':  'medical_necessity', // Procedure/treatment has not been deemed proven to be effective
  '57':  'medical_necessity', // Payment adjusted because the procedure/service is not consistent with the patient's age
  '151': 'medical_necessity', // Payment adjusted because the payer deems the information submitted does not support this level of service
  '167': 'medical_necessity', // This (these) diagnosis(es) is (are) not covered

  // ── timely_filing ──────────────────────────────────────────────────────────
  '29':  'timely_filing',     // The time limit for filing has expired

  // ── bundling ───────────────────────────────────────────────────────────────
  // Included in another service / unbundling / mutually exclusive
  '59':  'bundling',          // Processed based on multiple surgery rules or concurrent care
  '97':  'bundling',          // The benefit for this service is included in the payment/allowance for another service/procedure
  '181': 'bundling',          // Procedure code was incorrect. This service may be covered under a different procedure code
  '182': 'bundling',          // Procedure modifier was incorrect
  '183': 'bundling',          // The referring provider is not eligible to refer the service billed
  '184': 'bundling',          // The prescribing/ordering provider is not eligible to prescribe/order the service billed
  '185': 'bundling',          // Claim/service denied because a non-covered service is more than the threshold amount
  '186': 'bundling',          // Level of care change adjustment
  '187': 'bundling',          // Consumer Spending Account payments (includes but is not limited to Flexible Spending Account, Health Savings Account, Health Reimbursement Account, etc.)
  '188': 'bundling',          // This product/procedure is only covered when used according to FDA recommendations
  '189': 'bundling',          // Not a covered benefit

  // ── missing_info ───────────────────────────────────────────────────────────
  // Claim lacks required information / billing error
  '4':   'missing_info',      // The service/equipment/drug is not covered under the patient's current benefit plan
  '5':   'missing_info',      // The procedure code/bill type is inconsistent with the place of service
  '16':  'missing_info',      // Claim/service lacks information or has submission/billing error(s)
  '107': 'missing_info',      // The related or qualifying claim/service was not identified on this claim
  '125': 'missing_info',      // Submission/billing error(s). At least one Remark Code must be provided
  '146': 'missing_info',      // Diagnosis was invalid for the date(s) of service reported
  '147': 'missing_info',      // Provider contracted/negotiated rate expired or not on file
  '148': 'missing_info',      // Information from another provider was not provided or was insufficient/incomplete
  '149': 'missing_info',      // Lifetime benefit maximum has been reached for this service/benefit category
  '150': 'missing_info',      // Payer deems the information submitted does not support this level of service
  '152': 'missing_info',      // Payer deems the information submitted does not support this many/frequency of services
  '252': 'missing_info',      // An attachment/other documentation is required to adjudicate this claim/service

  // ── authorization ──────────────────────────────────────────────────────────
  // Precertification / prior authorization / referral absent or invalid
  '15':  'authorization',     // Payment adjusted because the submitted authorization number is missing, invalid, or does not apply to the billed services or provider
  '96':  'authorization',     // Non-covered charge(s). At least one Remark Code must be provided — NOTE: 96 is frequently used for auth denials in practice
  '197': 'authorization',     // Precertification/authorization/notification absent
  '278': 'authorization',     // Prior authorization/pre-certification not obtained

  // ── not_covered ────────────────────────────────────────────────────────────
  // Benefit exclusion / plan limitation / not a covered service
  '24':  'not_covered',       // Charges are covered under a capitation agreement/managed care plan
  '26':  'not_covered',       // Expenses incurred prior to coverage
  '27':  'not_covered',       // Expenses incurred after coverage terminated
  '35':  'not_covered',       // Lifetime benefit maximum has been reached
  '49':  'not_covered',       // These are non-covered services because this is a routine exam or screening procedure
  '109': 'not_covered',       // Claim/service not covered by this payer/contractor
  '119': 'not_covered',       // Benefit maximum for this time period or occurrence has been reached
  '204': 'not_covered',       // This service/equipment/drug is not covered under the patient's current benefit plan

  // ── duplicate_claim ────────────────────────────────────────────────────────
  '18':  'duplicate_claim',   // Exact duplicate claim/service
}

/**
 * Look up the denial category for a CARC code.
 * Returns 'other' for any code not in the canonical map.
 * Input is trimmed and matched as-is (codes are numeric strings without prefix).
 */
export function carcToDenialCategory(carcCode: string): DenialCategory {
  const code = carcCode.trim()
  return CARC_CATEGORY_MAP[code] ?? 'other'
}

/**
 * Validate that no CARC code appears more than once across the map.
 * Called at module load in test environments to catch future regressions.
 */
export function assertNoDuplicateCarcCodes(): void {
  const seen = new Set<string>()
  for (const code of Object.keys(CARC_CATEGORY_MAP)) {
    if (seen.has(code)) {
      throw new Error(
        `Duplicate CARC code detected in CARC_CATEGORY_MAP: "${code}". ` +
        'Each code must appear in exactly one category.'
      )
    }
    seen.add(code)
  }
}
