/**
 * Rate Limiter — In-memory implementation with swappable interface.
 * 
 * MVP: in-memory sliding window per key.
 * To swap to Upstash Redis later, implement the RateLimiter interface.
 */

export interface RateLimiter {
  check(key: string): Promise<{ allowed: boolean; remaining: number; resetAt: number }>
}

// ─── In-memory implementation ───────────────────────────────────────────────

type WindowEntry = { timestamps: number[] }

const store = new Map<string, WindowEntry>()

const DEFAULT_WINDOW_MS = 60_000  // 1 minute
const DEFAULT_MAX_REQUESTS = 10   // 10 requests per minute

export class InMemoryRateLimiter implements RateLimiter {
  private windowMs: number
  private maxRequests: number

  constructor(opts?: { windowMs?: number; maxRequests?: number }) {
    this.windowMs = opts?.windowMs ?? DEFAULT_WINDOW_MS
    this.maxRequests = opts?.maxRequests ?? DEFAULT_MAX_REQUESTS
  }

  async check(key: string): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const now = Date.now()
    const cutoff = now - this.windowMs

    let entry = store.get(key)
    if (!entry) {
      entry = { timestamps: [] }
      store.set(key, entry)
    }

    // Remove expired timestamps
    entry.timestamps = entry.timestamps.filter(t => t > cutoff)

    const remaining = Math.max(0, this.maxRequests - entry.timestamps.length)
    const resetAt = entry.timestamps.length > 0
      ? entry.timestamps[0] + this.windowMs
      : now + this.windowMs

    if (entry.timestamps.length >= this.maxRequests) {
      return { allowed: false, remaining: 0, resetAt }
    }

    entry.timestamps.push(now)
    return { allowed: true, remaining: remaining - 1, resetAt }
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

const analyzeRateLimiter = new InMemoryRateLimiter({
  windowMs: 60_000,
  maxRequests: 10,
})

export function getAnalyzeRateLimiter(): RateLimiter {
  return analyzeRateLimiter
}
