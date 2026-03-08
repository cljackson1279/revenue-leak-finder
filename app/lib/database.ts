import { supabase } from './supabase'

export type Upload = {
  id: string
  account_id: string
  user_id: string
  filename: string
  storage_path: string
  mime_type: string | null
  size_bytes: number | null
  source_type: string | null
  status: 'uploaded' | 'processing' | 'complete' | 'error'
  error_message: string | null
  created_at: string
  updated_at: string
}

export async function getCurrentAccountId(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('account_users')
    .select('account_id')
    .eq('user_id', userId)
    .limit(1)
    .single()

  if (error || !data) {
    console.error('Error fetching account_id:', error)
    return null
  }

  return data.account_id
}

export async function createUpload(params: {
  accountId: string
  userId: string
  filename: string
  storagePath: string
  mimeType: string | null
  sizeBytes: number
  sourceType: string
}): Promise<Upload | null> {
  const { data, error } = await supabase
    .from('uploads')
    .insert({
      account_id: params.accountId,
      user_id: params.userId,
      filename: params.filename,
      storage_path: params.storagePath,
      mime_type: params.mimeType,
      size_bytes: params.sizeBytes,
      source_type: params.sourceType,
      status: 'uploaded',
    })
    .select()
    .single()

  if (error || !data) {
    console.error('Error creating upload:', error)
    return null
  }

  return data as Upload
}

export async function getUploadsForAccount(accountId: string): Promise<Upload[]> {
  const { data, error } = await supabase
    .from('uploads')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching uploads:', error)
    return []
  }

  return (data as Upload[]) || []
}

export async function updateUploadStatus(
  uploadId: string,
  status: Upload['status'],
  errorMessage?: string
): Promise<boolean> {
  const { error } = await supabase
    .from('uploads')
    .update({
      status,
      error_message: errorMessage || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', uploadId)

  if (error) {
    console.error('Error updating upload status:', error)
    return false
  }

  return true
}

export function getSourceTypeFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()

  if (ext === 'pdf') return 'pdf'
  if (ext === 'edi' || ext === 'x12' || ext === '835' || ext === 'txt') return 'era_835'

  return 'unknown'
}
