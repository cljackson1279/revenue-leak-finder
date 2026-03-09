import { createAuthClient } from './supabase'
import { getCurrentAccountId } from './database'
import type { SupabaseClient, User } from '@supabase/supabase-js'

export type AuthContext = {
  user: User
  accountId: string
  supabase: SupabaseClient
  token: string
}

/**
 * Extract Bearer token, validate user, resolve account membership.
 * Returns AuthContext or throws with status + message.
 */
export async function authenticateRequest(request: Request): Promise<AuthContext> {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    throw new AuthError('Not authenticated', 401)
  }

  const supabase = createAuthClient(token)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token)

  if (authError || !user) {
    throw new AuthError('Not authenticated', 401)
  }

  const accountId = await getCurrentAccountId(supabase, user.id)
  if (!accountId) {
    throw new AuthError('No account membership found', 403)
  }

  return { user, accountId, supabase, token }
}

export class AuthError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'AuthError'
    this.status = status
  }
}
