# CARC Denial Category Mapping Audit

## Current State (before fix)

### parse835.ts — `carcToDenialCategory()` (if-else chain, first match wins)

| Code | Category assigned |
|------|------------------|
| 39   | medical_necessity |
| 50   | medical_necessity |
| 55   | medical_necessity |
| 56   | medical_necessity |
| 167  | medical_necessity |
| 197  | medical_necessity  ← FIRST MATCH (before authorization check) |
| 29   | timely_filing |
| 59   | bundling |
| 97   | bundling |
| 181  | bundling |
| 182  | bundling |
| 183  | bundling |
| 184  | bundling |
| 185  | bundling |
| 186  | bundling |
| 187  | bundling |
| 188  | bundling |
| 189  | bundling |
| 4    | missing_info |
| 5    | missing_info |
| 16   | missing_info |
| 107  | missing_info |
| 125  | missing_info |
| 146  | missing_info |
| 147  | missing_info |
| 148  | missing_info |
| 149  | missing_info |
| 150  | missing_info |
| 151  | missing_info |
| 152  | missing_info |
| 15   | authorization  (code 197 never reaches this — already caught above) |
| 197  | DEAD — never reached |
| 24   | not_covered |
| 26   | not_covered |
| 27   | not_covered |
| 35   | not_covered |
| 49   | not_covered |
| 96   | not_covered |
| 109  | not_covered |
| 119  | not_covered |
| 204  | not_covered |
| 18   | duplicate_claim |

### parsePdf.ts — `denialCategoryMap` object (key lookup, last key wins if duplicated)

| Code | Category assigned |
|------|------------------|
| 50   | medical_necessity |
| 39   | medical_necessity |
| 55   | medical_necessity |
| 167  | medical_necessity |
| 197  | authorization     ← DIFFERENT from parse835 (197 → medical_necessity in 835) |
| 29   | timely_filing |
| 97   | bundling |
| 59   | bundling |
| 16   | missing_info |
| 4    | missing_info |
| 5    | missing_info |
| 125  | missing_info |
| 96   | not_covered |
| 49   | not_covered |
| 109  | not_covered |
| 119  | not_covered |
| 204  | not_covered |
| 18   | duplicate_claim |

## Conflicts Identified

| CARC | parse835.ts result | parsePdf.ts result | Conflict? |
|------|-------------------|--------------------|-----------|
| 197  | medical_necessity (caught first) | authorization | YES — different category across files |
| 96   | not_covered | not_covered | No conflict (both agree) |

## Canonical Decision for CO-197

CARC 197 description: "Precertification/authorization/notification absent."
This is unambiguously an **authorization** failure — the service was not pre-authorized.
Assigning it to `medical_necessity` in parse835.ts was a bug (197 was listed in the
medical_necessity array before the authorization array, so it was caught early).

**Canonical assignment: authorization**

## Codes Present in 835 but Missing from PDF map

These codes are handled in parse835 but not in parsePdf's denialCategoryMap (PDF falls back to 'other'):
56, 181, 182, 183, 184, 185, 186, 187, 188, 189, 107, 146, 147, 148, 149, 150, 151, 152, 15, 24, 26, 27, 35

These should be added to the shared canonical map so PDF-parsed denials are categorized consistently.
