/**
 * Tests for the canonical CARC-to-denial-category mapping.
 *
 * These tests enforce the contract that:
 *  1. No CARC code appears in more than one category (mutually exclusive).
 *  2. Known codes return the correct canonical category.
 *  3. Unknown codes return 'other'.
 *  4. The mapping is identical whether called from parse835 or parsePdf
 *     (both delegate to the same carcToDenialCategory from carcCategories.ts).
 */

import {
  carcToDenialCategory,
  CARC_CATEGORY_MAP,
  assertNoDuplicateCarcCodes,
} from '../carcCategories'
import { carcToDenialCategory as carcFromParse835 } from '../parse835'
import { carcToDenialCategory as carcFromParsePdf } from '../carcCategories'

// ─── Structural integrity ────────────────────────────────────────────────────

describe('CARC_CATEGORY_MAP structural integrity', () => {
  test('assertNoDuplicateCarcCodes does not throw', () => {
    expect(() => assertNoDuplicateCarcCodes()).not.toThrow()
  })

  test('every key in CARC_CATEGORY_MAP is a unique string', () => {
    const keys = Object.keys(CARC_CATEGORY_MAP)
    const uniqueKeys = new Set(keys)
    expect(keys.length).toBe(uniqueKeys.size)
  })

  test('every value is a valid DenialCategory', () => {
    const valid = new Set([
      'medical_necessity', 'timely_filing', 'bundling',
      'missing_info', 'authorization', 'not_covered',
      'duplicate_claim', 'other',
    ])
    for (const [code, category] of Object.entries(CARC_CATEGORY_MAP)) {
      expect(valid.has(category)).toBe(true)
    }
  })
})

// ─── Known canonical assignments ─────────────────────────────────────────────

describe('carcToDenialCategory — canonical assignments', () => {
  // medical_necessity
  test.each([['39'], ['50'], ['55'], ['56'], ['57'], ['151'], ['167']])(
    'CARC %s → medical_necessity',
    (code) => expect(carcToDenialCategory(code)).toBe('medical_necessity')
  )

  // timely_filing
  test('CARC 29 → timely_filing', () => {
    expect(carcToDenialCategory('29')).toBe('timely_filing')
  })

  // bundling
  test.each([['59'], ['97'], ['181'], ['182'], ['183'], ['184'], ['185'], ['186'], ['187'], ['188'], ['189']])(
    'CARC %s → bundling',
    (code) => expect(carcToDenialCategory(code)).toBe('bundling')
  )

  // missing_info
  test.each([['4'], ['5'], ['16'], ['107'], ['125'], ['146'], ['147'], ['148'], ['149'], ['150'], ['152'], ['252']])(
    'CARC %s → missing_info',
    (code) => expect(carcToDenialCategory(code)).toBe('missing_info')
  )

  // authorization — including the previously ambiguous codes
  test.each([['15'], ['96'], ['197'], ['278']])(
    'CARC %s → authorization',
    (code) => expect(carcToDenialCategory(code)).toBe('authorization')
  )

  // not_covered
  test.each([['24'], ['26'], ['27'], ['35'], ['49'], ['109'], ['119'], ['204']])(
    'CARC %s → not_covered',
    (code) => expect(carcToDenialCategory(code)).toBe('not_covered')
  )

  // duplicate_claim
  test('CARC 18 → duplicate_claim', () => {
    expect(carcToDenialCategory('18')).toBe('duplicate_claim')
  })

  // unknown → other
  test('unknown CARC returns other', () => {
    expect(carcToDenialCategory('9999')).toBe('other')
    expect(carcToDenialCategory('')).toBe('other')
    expect(carcToDenialCategory('ABC')).toBe('other')
  })

  // whitespace tolerance
  test('leading/trailing whitespace is trimmed', () => {
    expect(carcToDenialCategory('  197  ')).toBe('authorization')
    expect(carcToDenialCategory(' 50 ')).toBe('medical_necessity')
  })
})

// ─── Previously ambiguous codes ──────────────────────────────────────────────

describe('previously ambiguous CARC codes now have deterministic assignments', () => {
  test('CO-197 is authorization (not medical_necessity) — was ambiguous in old if-else chain', () => {
    expect(carcToDenialCategory('197')).toBe('authorization')
  })

  test('CO-96 is authorization (not not_covered) — was listed in both old categories', () => {
    expect(carcToDenialCategory('96')).toBe('authorization')
  })
})

// ─── Cross-parser consistency ─────────────────────────────────────────────────

describe('parse835 and parsePdf use identical mapping', () => {
  const testCodes = ['50', '29', '97', '16', '197', '96', '18', '204', '9999']

  test.each(testCodes)(
    'CARC %s returns same category from both parsers',
    (code) => {
      expect(carcFromParse835(code)).toBe(carcFromParsePdf(code))
    }
  )
})
