import type { SupabaseClient } from '@supabase/supabase-js'

// ─── Types aligned to DB schema ────────────────────────────────────────────

export type Upload = {
  id: string
  account_id: string
  filename: string
  source_type: 'era_835' | 'eob_pdf' | 'other'
  status: 'uploaded' | 'analyzing' | 'processing' | 'complete' | 'error'
  error_message: string | null
  storage_path: string
  content_hash: string | null
  size_bytes: number | null
  mime_type: string | null
  analyzed_at: string | null
  created_at: string
  updated_at: string
}

export type Finding = {
  id: string
  account_id: string
  upload_id: string
  created_at: string
  payer: string | null
  service_date: string | null
  procedure_code: string | null
  billed_amount: number | null
  allowed_amount: number | null
  paid_amount: number | null
  patient_responsibility: number | null
  underpayment_amount: number | null
  carc_codes: string[] | null
  rarc_codes: string[] | null
  finding_type: 'UNDERPAID' | 'DENIED_APPEALABLE' | 'DENIED_NON_APPEALABLE' | 'NEEDS_REVIEW' | 'INCOMPLETE_DATA'
  confidence: 'High' | 'Medium' | 'Low'
  action: string
  rationale: string
  evidence: Record<string, unknown>
  status: 'open' | 'resolved' | 'ignored'
}

export type Account = {
  id: string
  name: string
  created_at: string
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Get the account_id for a given user. Returns null if user has no account.
 * Accepts a Supabase client so it works with both browser and auth clients.
 */
export async function getCurrentAccountId(
  client: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await client
    .from('account_users')
    .select('account_id')
    .eq('user_id', userId)
    .limit(1)
    .single()

  if (error || !data) return null
  return data.account_id
}

/**
 * Create an upload record.
 */
export async function createUpload(
  client: SupabaseClient,
  params: {
    accountId: string
    filename: string
    storagePath: string
    sourceType: 'era_835' | 'eob_pdf' | 'other'
    contentHash?: string
  }
): Promise<Upload | null> {
  const { data, error } = await client
    .from('uploads')
    .insert({
      account_id: params.accountId,
      filename: params.filename,
      storage_path: params.storagePath,
      source_type: params.sourceType,
      content_hash: params.contentHash || null,
      status: 'uploaded',
    })
    .select()
    .single()

  if (error || !data) {
    console.error('[database] createUpload error:', error?.message)
    return null
  }
  return data as Upload
}

/**
 * Get all uploads for an account.
 */
export async function getUploadsForAccount(
  client: SupabaseClient,
  accountId: string
): Promise<Upload[]> {
  const { data, error } = await client
    .from('uploads')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[database] getUploadsForAccount error:', error.message)
    return []
  }
  return (data as Upload[]) || []
}

/**
 * Determine source_type from filename extension.
 */
export function getSourceTypeFromFilename(filename: string): 'era_835' | 'eob_pdf' | 'other' {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return 'eob_pdf'
  if (ext === 'edi' || ext === 'x12' || ext === '835' || ext === 'txt') return 'era_835'
  return 'other'
}
