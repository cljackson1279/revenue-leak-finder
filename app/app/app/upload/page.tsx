'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import {
  getCurrentAccountId,
  createUpload,
  getUploadsForAccount,
  getSourceTypeFromFilename,
  type Upload,
} from '@/lib/database'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export default function UploadPage() {
  const supabase = getSupabase()
  const router = useRouter()
  const [uploads, setUploads] = useState<Upload[]>([])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [accountId, setAccountId] = useState<string | null>(null)
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set())
  const [autoOpenResults, setAutoOpenResults] = useState(true)
  const [dragOver, setDragOver] = useState(false)

  const loadUploads = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setMessage({ type: 'error', text: 'Not authenticated' })
        return
      }

      const currentAccountId = await getCurrentAccountId(supabase, user.id)
      if (!currentAccountId) {
        setMessage({
          type: 'error',
          text: 'No account found. Please contact support to set up your account.',
        })
        setLoading(false)
        return
      }

      setAccountId(currentAccountId)
      const uploadsData = await getUploadsForAccount(supabase, currentAccountId)
      setUploads(uploadsData)
    } catch (error) {
      console.error('Error loading uploads:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to load uploads',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUploads()
  }, [loadUploads])

  const handleUploadFiles = async (files: FileList | File[]) => {
    setUploading(true)
    setMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      if (!accountId) throw new Error('No account ID available')

      const fileArray = Array.from(files)
      let successCount = 0

      for (const file of fileArray) {
        const storagePath = `${accountId}/${user.id}/${Date.now()}-${file.name}`

        const { error: storageError } = await supabase.storage
          .from('uploads')
          .upload(storagePath, file)

        if (storageError) {
          console.error('Storage upload error:', storageError)
          continue
        }

        const upload = await createUpload(supabase, {
          accountId,
          filename: file.name,
          storagePath,
          sourceType: getSourceTypeFromFilename(file.name),
        })

        if (upload) {
          successCount++
          setUploads(prev => [upload, ...prev])
        }
      }

      if (successCount > 0) {
        setMessage({ type: 'success', text: `${successCount} file(s) uploaded successfully!` })
      } else {
        setMessage({ type: 'error', text: 'Failed to upload files' })
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Upload failed',
      })
    } finally {
      setUploading(false)
    }
  }

  const handleRunAnalysis = async (uploadId: string) => {
    setAnalyzingIds(prev => new Set(prev).add(uploadId))
    setMessage(null)

    const clearAnalyzing = () =>
      setAnalyzingIds(prev => { const next = new Set(prev); next.delete(uploadId); return next })

    const setUploadError = (msg: string) =>
      setUploads(prev =>
        prev.map(u =>
          u.id === uploadId
            ? { ...u, status: 'error' as const, error_message: msg, updated_at: new Date().toISOString() }
            : u
        )
      )

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    if (!token) {
      setMessage({ type: 'error', text: 'Session expired — please sign in again' })
      clearAnalyzing()
      router.push('/login')
      return
    }

    let response: Response
    let data: { error?: string; details?: string; ok?: boolean; findings_count?: number }

    try {
      response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ upload_id: uploadId }),
      })
      data = await response.json()
    } catch {
      const msg = 'Network error — could not reach the server'
      setMessage({ type: 'error', text: msg })
      setUploadError(msg)
      clearAnalyzing()
      return
    }

    if (response.status === 401) {
      setMessage({ type: 'error', text: 'Session expired — please sign in again' })
      clearAnalyzing()
      router.push('/login')
      return
    }

    if (!response.ok) {
      const msg = data.error || 'Analysis failed'
      setMessage({ type: 'error', text: msg })
      setUploadError(msg)
      clearAnalyzing()
      return
    }

    setUploads(prev =>
      prev.map(u =>
        u.id === uploadId
          ? { ...u, status: 'complete' as const, error_message: null, updated_at: new Date().toISOString() }
          : u
      )
    )
    const count = data.findings_count ?? 0
    setMessage({ type: 'success', text: count > 0 ? `Analysis complete — ${count} finding(s) found.` : 'Analysis complete.' })
    clearAnalyzing()

    if (autoOpenResults) {
      router.push(`/app/results?upload_id=${uploadId}`)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      handleUploadFiles(e.dataTransfer.files)
    }
  }

  const formatBytes = (bytes: number | null) => {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const getStatusBadgeVariant = (status: Upload['status']) => {
    switch (status) {
      case 'complete': return 'default'
      case 'error': return 'destructive'
      default: return 'outline'
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <p className="text-muted-foreground">Loading uploads...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Upload Files</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload 835 ERA files (.edi, .x12, .835, .txt) or EOB PDFs (.pdf) for analysis.
        </p>
      </div>

      <div className="space-y-6">
        {/* Drop Zone */}
        <Card
          className={`flex cursor-pointer flex-col items-center justify-center border-2 border-dashed p-12 transition-colors ${
            dragOver ? 'border-blue-500 bg-blue-50' : 'border-zinc-300 hover:border-zinc-400'
          } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => {
            if (uploading || !accountId) return
            const input = document.createElement('input')
            input.type = 'file'
            input.multiple = true
            input.accept = '.edi,.x12,.835,.txt,.pdf'
            input.onchange = e => {
              const files = (e.target as HTMLInputElement).files
              if (files) handleUploadFiles(files)
            }
            input.click()
          }}
        >
          {uploading ? (
            <p className="text-sm text-muted-foreground">Uploading...</p>
          ) : (
            <>
              <p className="mb-2 text-base font-medium">
                Drop files here or click to browse
              </p>
              <p className="text-sm text-muted-foreground">
                Supports 835 ERA (.edi, .x12, .835, .txt) and EOB PDF (.pdf)
              </p>
            </>
          )}
        </Card>

        {/* Options */}
        <div className="flex items-center gap-2">
          <input
            id="auto-open"
            type="checkbox"
            checked={autoOpenResults}
            onChange={e => setAutoOpenResults(e.target.checked)}
            className="h-4 w-4 cursor-pointer"
          />
          <Label htmlFor="auto-open" className="cursor-pointer text-sm font-normal">
            Auto-open Results after analysis
          </Label>
        </div>

        {/* Messages */}
        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Uploads List */}
        {uploads.length > 0 && (
          <Card className="p-6">
            <h2 className="text-lg font-medium">Uploads ({uploads.length})</h2>
            <Separator className="my-4" />
            <div className="space-y-2">
              {uploads.map(upload => (
                <div
                  key={upload.id}
                  className="flex items-center justify-between rounded border p-3"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{upload.filename}</p>
                    <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
                      <span>{formatBytes(upload.size_bytes)}</span>
                      <span>{upload.source_type === 'era_835' ? '835 ERA' : upload.source_type === 'eob_pdf' ? 'EOB PDF' : upload.source_type?.toUpperCase()}</span>
                      <span>{new Date(upload.created_at).toLocaleString()}</span>
                    </div>
                    {upload.error_message && (
                      <p className="mt-1 text-xs text-red-600">{upload.error_message}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={getStatusBadgeVariant(upload.status)}>
                      {upload.status}
                    </Badge>
                    {upload.status === 'complete' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/app/results?upload_id=${upload.id}`)}
                      >
                        View Results
                      </Button>
                    )}
                    {(upload.status === 'uploaded' || upload.status === 'error') && (
                      <Button
                        size="sm"
                        onClick={() => handleRunAnalysis(upload.id)}
                        disabled={analyzingIds.has(upload.id)}
                      >
                        {analyzingIds.has(upload.id) ? 'Analyzing...' : 'Analyze'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
