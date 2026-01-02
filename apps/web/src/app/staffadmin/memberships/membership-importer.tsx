'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Upload, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react'
import { 
  previewCSV, 
  importMembershipsWithMapping, 
  type CSVPreview, 
  type FieldMapping,
  type ImportDefaults,
  type ImportSummary 
} from '@/app/actions/memberships-import'

interface MembershipImporterProps {
  tiers: Array<{
    id: string
    name: string
    slug: string
  }>
}

export function MembershipImporter({ tiers }: MembershipImporterProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'result'>('upload')
  const [csvContent, setCsvContent] = useState<string>('')
  const [preview, setPreview] = useState<CSVPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Field mapping state
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({})
  
  // Defaults state
  const [defaultTierId, setDefaultTierId] = useState<string>(tiers[0]?.id || '')
  const [defaultValidFromOffset, setDefaultValidFromOffset] = useState<string>('0')
  const [defaultValidToOffset, setDefaultValidToOffset] = useState<string>('365')
  const [defaultAutoRenew, setDefaultAutoRenew] = useState(false)
  
  // Result state
  const [summary, setSummary] = useState<ImportSummary | null>(null)

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Please select a CSV file')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const text = await file.text()
      setCsvContent(text)
      
      const csvPreview = await previewCSV(text)
      setPreview(csvPreview)
      
      // Try to auto-detect common field names
      const autoMapping: FieldMapping = {}
      csvPreview.headers.forEach(header => {
        const lower = header.toLowerCase()
        if (lower.includes('email') || lower === 'e-mail') {
          autoMapping.email = header
        } else if (lower.includes('first') && lower.includes('name')) {
          autoMapping.firstName = header
        } else if (lower.includes('last') && lower.includes('name')) {
          autoMapping.lastName = header
        } else if (lower.includes('phone') || lower.includes('mobile') || lower.includes('telefon')) {
          autoMapping.phone = header
        } else if (lower.includes('member') && lower.includes('number')) {
          autoMapping.memberNumber = header
        } else if (lower.includes('tier') || lower.includes('level') || lower.includes('type')) {
          autoMapping.tierId = header
        } else if (lower.includes('valid') && lower.includes('from')) {
          autoMapping.validFrom = header
        } else if (lower.includes('valid') && lower.includes('to')) {
          autoMapping.validTo = header
        } else if (lower.includes('auto') && lower.includes('renew')) {
          autoMapping.autoRenew = header
        }
      })
      
      setFieldMapping(autoMapping)
      setStep('mapping')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await processFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      await processFile(file)
    }
  }

  const handleImport = async () => {
    setLoading(true)
    setError(null)

    try {
      const defaults: ImportDefaults = {
        tierId: defaultTierId,
        validFromOffset: parseInt(defaultValidFromOffset),
        validToOffset: parseInt(defaultValidToOffset),
        autoRenew: defaultAutoRenew,
      }

      const result = await importMembershipsWithMapping(csvContent, fieldMapping, defaults)
      setSummary(result)
      setStep('result')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setStep('upload')
    setCsvContent('')
    setPreview(null)
    setFieldMapping({})
    setSummary(null)
    setError(null)
  }

  if (step === 'upload') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Import Memberships from CSV</CardTitle>
          <CardDescription>
            Upload a CSV file to import member data. You&apos;ll be able to map fields and set defaults in the next step.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center space-y-4 transition-colors cursor-pointer ${
              isDragging 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
            } ${loading ? 'opacity-50 pointer-events-none' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className={`h-12 w-12 mx-auto transition-colors ${
              isDragging ? 'text-primary' : 'text-muted-foreground'
            }`} />
            <div>
              <p className="text-lg font-medium">
                {isDragging ? 'Drop CSV file here' : 'Choose CSV File'}
              </p>
              <Input
                ref={fileInputRef}
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                disabled={loading}
                className="hidden"
              />
              <p className="text-sm text-muted-foreground mt-2">
                {isDragging 
                  ? 'Release to upload' 
                  : 'Drag and drop or click to select a CSV file with member information'
                }
              </p>
            </div>
            {loading && <p className="text-sm">Reading file...</p>}
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium">Common CSV formats supported:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Email, FirstName, LastName, Phone, MemberNumber</li>
              <li>With dates: ValidFrom, ValidTo</li>
              <li>With tier: Tier (name or slug)</li>
              <li>With renewal: AutoRenew (true/false)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (step === 'mapping' && preview) {
    const unmappedFields = [
      { key: 'firstName', label: 'First Name', required: false },
      { key: 'lastName', label: 'Last Name', required: false },
      { key: 'email', label: 'Email', required: true },
      { key: 'phone', label: 'Phone', required: false },
      { key: 'memberNumber', label: 'Member Number', required: false },
      { key: 'tierId', label: 'Membership Tier', required: false },
      { key: 'validFrom', label: 'Valid From Date', required: false },
      { key: 'validTo', label: 'Valid To Date', required: false },
      { key: 'autoRenew', label: 'Auto Renew', required: false },
    ]

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Map CSV Columns</CardTitle>
            <CardDescription>
              Match your CSV columns to system fields. Unmapped fields will use default values.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="grid gap-4">
              {unmappedFields.map(field => (
                <div key={field.key} className="grid grid-cols-3 gap-4 items-center">
                  <div>
                    <Label className="flex items-center gap-2">
                      {field.label}
                      {field.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                    </Label>
                  </div>
                  <div className="col-span-2">
                    <Select
                      value={fieldMapping[field.key as keyof FieldMapping] || '__unmapped__'}
                      onValueChange={(value: string) => setFieldMapping(prev => ({
                        ...prev,
                        [field.key]: value === '__unmapped__' ? undefined : value
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select CSV column..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__unmapped__">-- Not mapped --</SelectItem>
                        {preview.headers.map(header => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Default Values</CardTitle>
            <CardDescription>
              Set fallback values for fields not present in CSV or empty rows
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Default Membership Tier</Label>
                <Select value={defaultTierId} onValueChange={setDefaultTierId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tiers.map(tier => (
                      <SelectItem key={tier.id} value={tier.id}>
                        {tier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Used when Tier column is not mapped or empty
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valid From Offset (days)</Label>
                  <Input
                    type="number"
                    value={defaultValidFromOffset}
                    onChange={(e) => setDefaultValidFromOffset(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Days from today (0 = today, -30 = 30 days ago)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Valid To Offset (days)</Label>
                  <Input
                    type="number"
                    value={defaultValidToOffset}
                    onChange={(e) => setDefaultValidToOffset(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Days from Valid From (365 = 1 year)
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Default Auto-Renew</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable auto-renewal for imported memberships
                  </p>
                </div>
                <Switch
                  checked={defaultAutoRenew}
                  onCheckedChange={setDefaultAutoRenew}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview Data</CardTitle>
            <CardDescription>
              Sample rows from your CSV file
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {preview.headers.map(header => (
                      <TableHead key={header}>{header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.sampleRows.map((row, idx) => (
                    <TableRow key={idx}>
                      {preview.headers.map(header => (
                        <TableCell key={header} className="text-sm">
                          {row[header] || '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Showing first {preview.sampleRows.length} rows
            </p>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button onClick={handleImport} disabled={loading || !fieldMapping.email}>
            {loading ? 'Importing...' : 'Import Members'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={loading}>
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  if (step === 'result' && summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Import Complete</CardTitle>
          <CardDescription>
            Summary of the membership import operation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{summary.total}</div>
                <p className="text-xs text-muted-foreground">Total Rows</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{summary.created}</div>
                <p className="text-xs text-muted-foreground">Created</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">{summary.updated}</div>
                <p className="text-xs text-muted-foreground">Updated</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-yellow-600">{summary.skipped}</div>
                <p className="text-xs text-muted-foreground">Skipped</p>
              </CardContent>
            </Card>
          </div>

          {summary.errors.length > 0 && (
            <div className="space-y-2">
              <Label className="text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Errors ({summary.errors.length})
              </Label>
              <div className="bg-destructive/10 rounded-md p-4 max-h-60 overflow-y-auto">
                <ul className="text-sm space-y-1">
                  {summary.errors.map((error, idx) => (
                    <li key={idx} className="text-destructive">• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {summary.errors.length === 0 && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-4 rounded-md">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">All members imported successfully!</span>
            </div>
          )}

          <Button onClick={handleReset}>
            Import More Members
          </Button>
        </CardContent>
      </Card>
    )
  }

  return null
}
