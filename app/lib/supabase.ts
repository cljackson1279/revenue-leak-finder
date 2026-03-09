import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function getUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
  return url
}

function getAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set')
  return key
}

/**
 * Get a Supabase client for use in client components.
 * Lazily creates the client on first call.
 * Safe to call during SSR/build — will throw only when actually invoked at runtime
 * without env vars (which shouldn't happen in production).
 */
let _browserClient: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_browserClient) {
    _browserClient = createClient(getUrl(), getAnonKey())
  }
  return _browserClient
}

/**
 * Create an authenticated Supabase client using a Bearer token.
 * Used in API routes where the user's JWT is forwarded.
 * RLS policies are enforced because the client impersonates the user.
 */
export function createAuthClient(accessToken: string) {
  return createClient(getUrl(), getAnonKey(), {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
}

/**
 * Create a service-role Supabase client.
 * Bypasses RLS — use only for admin operations, migrations, and background jobs.
 * NEVER expose to the client.
 */
export function createServiceClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }
  return createClient(getUrl(), serviceRoleKey)
}
