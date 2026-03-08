'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  getCurrentAccountId,
  createUpload,
  getUploadsForAccount,
  getSourceTypeFromFilename,
  type Upload,
} from '@/lib/database'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export default function UploadPage() {
  const [uploads, setUploads] = useState<Upload[]>([])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [accountId, setAccountId] = useState<string | null>(null)
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadUploads()
  }, [])

  const loadUploads = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setMessage({ type: 'error', text: 'Not authenticated' })
        return
      }

      const currentAccountId = await getCurrentAccountId(user.id)
      if (!currentAccountId) {
        setMessage({
          type: 'error',
          text: 'No account found. Please contact support to set up your account.',
        })
        setLoading(false)
        return
      }

      setAccountId(currentAccountId)
      const uploadsData = await getUploadsForAccount(currentAccountId)
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
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles || selectedFiles.length === 0) return

    setUploading(true)
    setMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      if (!accountId) throw new Error('No account ID available')

      const fileArray = Array.from(selectedFiles)
      let successCount = 0

      for (const file of fileArray) {
        const storagePath = `${accountId}/${user.id}/${Date.now()}-${file.name}`

        // Upload to Storage
        const { error: storageError } = await supabase.storage
          .from('uploads')
          .upload(storagePath, file)

        if (storageError) {
          console.error('Storage upload error:', storageError)
          continue
        }

        // Insert into database
        const upload = await createUpload({
          accountId,
          userId: user.id,
          filename: file.name,
          storagePath,
          mimeType: file.type || null,
          sizeBytes: file.size,
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

      // Reset file input
      e.target.value = ''
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

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ upload_id: uploadId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed')
      }

      // Update the upload in the list
      setUploads(prev =>
        prev.map(u =>
          u.id === uploadId ? { ...u, status: data.status, updated_at: new Date().toISOString() } : u
        )
      )

      setMessage({ type: 'success', text: 'Analysis started successfully' })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to start analysis',
      })

      // Update upload status to error
      setUploads(prev =>
        prev.map(u =>
          u.id === uploadId
            ? {
                ...u,
                status: 'error',
                error_message: error instanceof Error ? error.message : 'Analysis failed',
                updated_at: new Date().toISOString(),
              }
            : u
        )
      )
    } finally {
      setAnalyzingIds(prev => {
        const next = new Set(prev)
        next.delete(uploadId)
        return next
      })
    }
  }

  const formatBytes = (bytes: number | null) => {
    if (!bytes || bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getStatusBadgeVariant = (status: Upload['status']) => {
    switch (status) {
      case 'uploaded':
        return 'outline'
      case 'processing':
        return 'default'
      case 'complete':
        return 'default'
      case 'error':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const readinessLevel =
    uploads.length >= 3 ? 'improve' : uploads.length >= 1 ? 'ready' : 'not-ready'

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
        <h1 className="text-3xl font-semibold tracking-tight">Upload Files</h1>
        <p className="mt-1 text-base text-muted-foreground">
          Upload EOB PDFs, 835 ERA files, or other billing documents for analysis.
        </p>
      </div>

      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="text-lg font-medium">Readiness Meter</h2>
          <Separator className="my-4" />
          <div className="flex gap-4">
            <Badge variant={readinessLevel === 'not-ready' ? 'default' : 'outline'}>
              Not Ready
            </Badge>
            <Badge variant={readinessLevel === 'ready' ? 'default' : 'outline'}>Ready</Badge>
            <Badge variant={readinessLevel === 'improve' ? 'default' : 'outline'}>
              Ready (Improve accuracy)
            </Badge>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Upload at least 1 file to begin analysis. More files improve accuracy.
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-medium">File Upload</h2>
          <Separator className="my-4" />

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file-upload">Select files</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".pdf,.txt,.edi,.835,.x12"
                multiple
                onChange={handleFileChange}
                disabled={uploading || !accountId}
              />
              <p className="text-sm text-muted-foreground">
                Accepted formats: PDF, TXT, EDI, 835, X12
              </p>
            </div>

            {message && (
              <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}
          </div>
        </Card>

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
                      <span>{upload.source_type?.toUpperCase()}</span>
                      <span>{formatDate(upload.created_at)}</span>
                    </div>
                    {upload.error_message && (
                      <p className="mt-1 text-xs text-red-600">{upload.error_message}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={getStatusBadgeVariant(upload.status)}>
                      {upload.status}
                    </Badge>
                    {upload.status === 'uploaded' && (
                      <Button
                        size="sm"
                        onClick={() => handleRunAnalysis(upload.id)}
                        disabled={analyzingIds.has(upload.id)}
                      >
                        {analyzingIds.has(upload.id) ? 'Starting...' : 'Run Analysis'}
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
