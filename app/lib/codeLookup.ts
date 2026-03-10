/**
 * CARC/RARC code lookup utilities.
 * Loads from cached JSON files (app/data/carc.json, app/data/rarc.json).
 * Source: Washington Publishing Company (WPC)
 */

import carcData from '../data/carc.json'
import rarcData from '../data/rarc.json'

type CodeEntry = {
  code: string
  description: string
  effective?: string
  terminated?: string
}

const carcMap: Record<string, CodeEntry> = carcData as Record<string, CodeEntry>
const rarcMap: Record<string, CodeEntry> = rarcData as Record<string, CodeEntry>

/**
 * Look up a CARC code description.
 */
export function getCarcDescription(code: string): string | null {
  return carcMap[code]?.description || null
}

/**
 * Look up a RARC code description.
 */
export function getRarcDescription(code: string): string | null {
  return rarcMap[code]?.description || null
}

/**
 * Get full CARC entry.
 */
export function getCarcEntry(code: string): CodeEntry | null {
  return carcMap[code] || null
}

/**
 * Get full RARC entry.
 */
export function getRarcEntry(code: string): CodeEntry | null {
  return rarcMap[code] || null
}

/**
 * Batch lookup for multiple CARC codes.
 */
export function getCarcDescriptions(codes: string[]): Record<string, string> {
  const result: Record<string, string> = {}
  for (const code of codes) {
    const desc = getCarcDescription(code)
    if (desc) result[code] = desc
  }
  return result
}

/**
 * Batch lookup for multiple RARC codes.
 */
export function getRarcDescriptions(codes: string[]): Record<string, string> {
  const result: Record<string, string> = {}
  for (const code of codes) {
    const desc = getRarcDescription(code)
    if (desc) result[code] = desc
  }
  return result
}
