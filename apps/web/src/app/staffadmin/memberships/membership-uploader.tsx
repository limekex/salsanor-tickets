'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, CheckCircle2, Upload, FileSpreadsheet } from 'lucide-react'
import { importMemberships } from '@/app/actions/memberships'

interface ImportResult {
  success: boolean
  summary?: {
    total: number
    created: number
    updated: number
    skipped: number
    errors: string[]
  }
  error?: string
}

export function MembershipUploader({ organizerId }: { organizerId: string }) {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleUpload() {
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    startTransition(async () => {
      const response = await importMemberships(formData)
      setResult(response as ImportResult)
      if (response.success) {
        setFile(null)
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Import Memberships
        </CardTitle>
        <CardDescription>
          Upload a CSV file with membership data. Required columns: Email, FirstName, LastName, ValidFrom, ValidTo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            type="file"
            accept=".csv"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null)
              setResult(null)
            }}
            disabled={isPending}
            className="flex-1"
          />
          <Button
            onClick={handleUpload}
            disabled={!file || isPending}
          >
            {isPending ? (
              <>
                <Upload className="h-4 w-4 mr-2 animate-pulse" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </>
            )}
          </Button>
        </div>

        {result?.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{result.error}</AlertDescription>
          </Alert>
        )}

        {result?.success && result.summary && (
          <Alert>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle>Import Complete</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-1">
                <div><strong>Total rows:</strong> {result.summary.total}</div>
                <div className="text-green-600"><strong>Created:</strong> {result.summary.created}</div>
                <div className="text-blue-600"><strong>Updated:</strong> {result.summary.updated}</div>
                {result.summary.skipped > 0 && (
                  <div className="text-amber-600"><strong>Skipped:</strong> {result.summary.skipped}</div>
                )}
              </div>

              {result.summary.errors.length > 0 && (
                <div className="mt-3">
                  <div className="font-semibold text-destructive mb-1">
                    Errors ({result.summary.errors.length}):
                  </div>
                  <ul className="list-disc list-inside text-sm space-y-1 max-h-40 overflow-y-auto">
                    {result.summary.errors.map((err, i) => (
                      <li key={i} className="text-destructive">{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="text-sm text-muted-foreground space-y-1">
          <div><strong>CSV Format Example:</strong></div>
          <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
{`Email,FirstName,LastName,Phone,MemberNumber,ValidFrom,ValidTo,Status
john@example.com,John,Doe,12345678,M001,2025-01-01,2025-12-31,ACTIVE
jane@example.com,Jane,Smith,,M002,2025-01-01,2025-12-31,ACTIVE`}
          </pre>
        </div>
      </CardContent>
    </Card>
  )
}
