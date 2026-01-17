'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { updateEmailTemplate } from '@/app/actions/admin/email-templates'
import { toast } from 'sonner'
import { Loader2, Save, Eye, Mail } from 'lucide-react'

type EmailTemplate = {
  id: string
  slug: string
  name: string
  category: string
  language: string
  subject: string
  preheader?: string | null
  htmlContent: string
  textContent?: string | null
  variables: Record<string, string>
  isActive: boolean
}

type Props = {
  templates: EmailTemplate[]
}

export function EmailTemplateEditor({ templates }: Props) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id || '')
  const [subject, setSubject] = useState('')
  const [preheader, setPreheader] = useState('')
  const [htmlContent, setHtmlContent] = useState('')
  const [textContent, setTextContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showTestDialog, setShowTestDialog] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [isSendingTest, setIsSendingTest] = useState(false)

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId)

  // Update form when template changes
  const handleTemplateChange = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (template) {
      setSelectedTemplateId(templateId)
      setSubject(template.subject)
      setPreheader(template.preheader || '')
      setHtmlContent(template.htmlContent)
      setTextContent(template.textContent || '')
      setShowPreview(false)
    }
  }

  const handleSave = async () => {
    if (!selectedTemplate) return

    setIsSaving(true)
    try {
      await updateEmailTemplate(selectedTemplate.id, {
        subject,
        preheader,
        htmlContent,
        textContent,
      })
      toast.success('Template saved successfully')
    } catch (error) {
      toast.error('Failed to save template')
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSendTest = async () => {
    if (!testEmail || !selectedTemplate) return

    setIsSendingTest(true)
    try {
      // Create example variables from template variables
      const exampleVariables: Record<string, any> = {}
      
      if (selectedTemplate.variables) {
        Object.keys(selectedTemplate.variables).forEach((key) => {
          if (key.includes('Url') || key.includes('Link')) {
            exampleVariables[key] = 'https://example.com'
          } else if (key.includes('Date')) {
            exampleVariables[key] = new Date().toLocaleDateString('no-NO')
          } else if (key.includes('Amount') || key.includes('Price') || key.includes('Total')) {
            exampleVariables[key] = '1 234 kr'
          } else if (key.includes('Number')) {
            exampleVariables[key] = '12345'
          } else if (key.includes('Name')) {
            exampleVariables[key] = 'Test Testesen'
          } else if (key.includes('Email')) {
            exampleVariables[key] = testEmail
          } else if (key.toLowerCase().includes('year')) {
            exampleVariables[key] = new Date().getFullYear()
          } else {
            exampleVariables[key] = `[Example ${key}]`
          }
        })
      }

      const response = await fetch('/api/admin/email/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateSlug: selectedTemplate.slug,
          recipientEmail: testEmail,
          variables: exampleVariables,
          language: selectedTemplate.language,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to send test email')
      }

      toast.success(`Test email sent to ${testEmail}`)
      setShowTestDialog(false)
      setTestEmail('')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send test email'
      toast.error(message)
      console.error(error)
    } finally {
      setIsSendingTest(false)
    }
  }

  const renderPreview = () => {
    // Replace variables with example data
    let previewHtml = htmlContent
    if (selectedTemplate?.variables) {
      Object.entries(selectedTemplate.variables).forEach(([key, description]) => {
        const placeholder = `{{ ${key} }}`
        let exampleValue = `[${description}]`
        
        // Provide better example values
        if (key.includes('Url') || key.includes('Link')) {
          exampleValue = '#'
        } else if (key.includes('Date')) {
          exampleValue = new Date().toLocaleDateString('no-NO')
        } else if (key.includes('Amount') || key.includes('Price') || key.includes('Total')) {
          exampleValue = '1 234 kr'
        } else if (key.includes('Number')) {
          exampleValue = '12345'
        } else if (key.includes('Name')) {
          exampleValue = 'Ola Nordmann'
        } else if (key.includes('Email')) {
          exampleValue = 'ola@example.com'
        }
        
        previewHtml = previewHtml.replace(new RegExp(placeholder, 'g'), exampleValue)
      })
    }

    return (
      <iframe
        srcDoc={previewHtml}
        className="w-full h-[600px] border rounded-md bg-white"
        title="Email Preview"
      />
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Template Selector */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Templates</CardTitle>
          <CardDescription>Select a template to edit</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {templates.map((template) => {
            const isSelected = selectedTemplateId === template.id
            return (
              <button
                key={template.id}
                onClick={() => handleTemplateChange(template.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  isSelected
                    ? 'bg-primary border-primary'
                    : 'hover:bg-accent border-border'
                }`}
              >
                <div className={`font-medium ${isSelected ? 'text-primary-foreground' : ''}`}>
                  {template.name}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge 
                    variant={isSelected ? "secondary" : "outline"} 
                    className={`text-xs ${isSelected ? 'bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30' : ''}`}
                  >
                    {template.language.toUpperCase()}
                  </Badge>
                  <Badge 
                    variant={isSelected ? "secondary" : "outline"} 
                    className={`text-xs ${isSelected ? 'bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30' : ''}`}
                  >
                    {template.category}
                  </Badge>
                </div>
              </button>
            )
          })}
        </CardContent>
      </Card>

      {/* Editor */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{selectedTemplate?.name}</CardTitle>
              <CardDescription>Edit template content and settings</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="h-4 w-4 mr-2" />
                {showPreview ? 'Edit' : 'Preview'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTestDialog(true)}
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Test
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {showPreview ? (
            <div className="space-y-4">
              <div>
                <Label>Subject Preview</Label>
                <div className="mt-1 p-3 bg-muted rounded-md font-medium">
                  {subject}
                </div>
              </div>
              {preheader && (
                <div>
                  <Label>Preheader Preview</Label>
                  <div className="mt-1 p-3 bg-muted rounded-md text-sm text-muted-foreground">
                    {preheader}
                  </div>
                </div>
              )}
              <div>
                <Label>Email Preview</Label>
                <div className="mt-1">
                  {renderPreview()}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Variables Info */}
              {selectedTemplate?.variables && Object.keys(selectedTemplate.variables).length > 0 && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
                  <h4 className="font-semibold text-sm mb-2">Available Variables:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(selectedTemplate.variables).map(([key, description]) => (
                      <div key={key}>
                        <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded">
                          {'{{ ' + key + ' }}'}
                        </code>
                        <span className="text-muted-foreground ml-2">- {description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Subject */}
              <div>
                <Label htmlFor="subject">Subject Line</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Email subject..."
                />
              </div>

              {/* Preheader */}
              <div>
                <Label htmlFor="preheader">Preheader (optional)</Label>
                <Input
                  id="preheader"
                  value={preheader}
                  onChange={(e) => setPreheader(e.target.value)}
                  placeholder="Preview text shown in email client..."
                />
              </div>

              {/* Content Tabs */}
              <Tabs defaultValue="html" className="w-full">
                <TabsList>
                  <TabsTrigger value="html">HTML Content</TabsTrigger>
                  <TabsTrigger value="text">Plain Text</TabsTrigger>
                </TabsList>
                <TabsContent value="html" className="mt-4">
                  <Textarea
                    value={htmlContent}
                    onChange={(e) => setHtmlContent(e.target.value)}
                    placeholder="HTML email content..."
                    className="min-h-[400px] font-mono text-sm"
                  />
                </TabsContent>
                <TabsContent value="text" className="mt-4">
                  <Textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Plain text email content..."
                    className="min-h-[400px] font-mono text-sm"
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Send Test Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Send a test email using the <strong>{selectedTemplate?.name}</strong> template with example data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="test-email">Recipient Email</Label>
              <Input
                id="test-email"
                type="email"
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && testEmail) {
                    handleSendTest()
                  }
                }}
              />
            </div>
            {selectedTemplate?.variables && Object.keys(selectedTemplate.variables).length > 0 && (
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-2">Template variables will be filled with example data:</p>
                <ul className="list-disc list-inside space-y-1">
                  {Object.entries(selectedTemplate.variables).slice(0, 5).map(([key, desc]) => (
                    <li key={key}>
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">{key}</code>: {desc}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowTestDialog(false)
                setTestEmail('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendTest}
              disabled={!testEmail || isSendingTest}
            >
              {isSendingTest ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Test
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
