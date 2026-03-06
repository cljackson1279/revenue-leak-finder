'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

type UploadedFile = {
  name: string
  size: number
  status: 'uploading' | 'success' | 'error'
}

export default function UploadPage() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [readinessLevel, setReadinessLevel] = useState<'not-ready' | 'ready' | 'improve'>('not-ready')

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles || selectedFiles.length === 0) return

    setUploading(true)
    setMessage(null)

    const fileArray = Array.from(selectedFiles)
    const newFiles: UploadedFile[] = fileArray.map(f => ({
      name: f.name,
      size: f.size,
      status: 'uploading',
    }))

    setFiles(prev => [...prev, ...newFiles])

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i]
        const fileName = `${user.id}/${Date.now()}-${file.name}`

        const { error } = await supabase.storage
          .from('uploads')
          .upload(fileName, file)

        setFiles(prev =>
          prev.map((f, idx) =>
            idx === prev.length - fileArray.length + i
              ? { ...f, status: error ? 'error' : 'success' }
              : f
          )
        )

        if (error) throw error
      }

      setMessage({ type: 'success', text: `${fileArray.length} file(s) uploaded successfully!` })

      // Update readiness based on file count
      const totalFiles = files.length + fileArray.length
      if (totalFiles >= 3) {
        setReadinessLevel('improve')
      } else if (totalFiles >= 1) {
        setReadinessLevel('ready')
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

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
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
            <Badge variant={readinessLevel === 'ready' ? 'default' : 'outline'}>
              Ready
            </Badge>
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
                accept=".pdf,.txt,.edi"
                multiple
                onChange={handleFileChange}
                disabled={uploading}
              />
              <p className="text-sm text-muted-foreground">
                Accepted formats: PDF, TXT, EDI (835 files)
              </p>
            </div>

            {message && (
              <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                {message.text}
              </Alert>
            )}
          </div>
        </Card>

        {files.length > 0 && (
          <Card className="p-6">
            <h2 className="text-lg font-medium">Uploaded Files</h2>
            <Separator className="my-4" />
            <div className="space-y-2">
              {files.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                  </div>
                  <Badge
                    variant={
                      file.status === 'success'
                        ? 'default'
                        : file.status === 'error'
                        ? 'destructive'
                        : 'outline'
                    }
                  >
                    {file.status === 'uploading' && 'Uploading...'}
                    {file.status === 'success' && 'Success'}
                    {file.status === 'error' && 'Failed'}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
