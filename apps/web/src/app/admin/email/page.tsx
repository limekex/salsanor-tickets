'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  getGlobalEmailSettings, 
  saveGlobalEmailSettings, 
  getEmailProvider,
  saveEmailProvider,
  sendTestEmail
} from '@/app/actions/admin/email-settings'
import { Mail, CheckCircle2, XCircle, Loader2 } from 'lucide-react'

export default function EmailSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  // Provider settings
  const [provider, setProvider] = useState('BREVO')
  const [apiKey, setApiKey] = useState('')
  const [hasExistingApiKey, setHasExistingApiKey] = useState(false)
  
  // Email settings
  const [fromName, setFromName] = useState('RegiNor Platform')
  const [fromEmail, setFromEmail] = useState('noreply@reginor.no')
  const [replyToEmail, setReplyToEmail] = useState('support@reginor.no')
  const [primaryLanguage, setPrimaryLanguage] = useState('no')
  
  // Test email
  const [testEmail, setTestEmail] = useState('')
  const [sendingTest, setSendingTest] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      const [settings, providerData] = await Promise.all([
        getGlobalEmailSettings(),
        getEmailProvider()
      ])
      
      if (settings) {
        setFromName(settings.fromName)
        setFromEmail(settings.fromEmail)
        setReplyToEmail(settings.replyToEmail)
        setPrimaryLanguage(settings.primaryLanguage)
      }
      
      if (providerData) {
        setProvider(providerData.provider)
        setHasExistingApiKey(!!providerData.apiKey)
      }
      
      setLoading(false)
    } catch (error) {
      console.error('Failed to load settings:', error)
      setMessage({ type: 'error', text: 'Failed to load email settings' })
      setLoading(false)
    }
  }

  async function handleSaveProvider() {
    setSaving(true)
    setMessage(null)
    
    try {
      const hasNewKey = apiKey.trim().length > 0
      
      if (!hasNewKey && !hasExistingApiKey) {
        throw new Error('API key is required')
      }
      
      await saveEmailProvider({
        provider,
        apiKey: hasNewKey ? apiKey : undefined,
      })
      
      setMessage({ type: 'success', text: 'Email provider saved successfully' })
      setHasExistingApiKey(true)
      setApiKey('')
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to save provider' 
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveSettings() {
    setSaving(true)
    setMessage(null)
    
    try {
      await saveGlobalEmailSettings({
        fromName,
        fromEmail,
        replyToEmail,
        primaryLanguage,
      })
      
      setMessage({ type: 'success', text: 'Email settings saved successfully' })
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to save settings' 
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleSendTest() {
    if (!testEmail) {
      setMessage({ type: 'error', text: 'Please enter a test email address' })
      return
    }
    
    setSendingTest(true)
    setMessage(null)
    
    try {
      await sendTestEmail(testEmail)
      setMessage({ type: 'success', text: `Test email sent to ${testEmail}` })
      setTestEmail('')
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to send test email' 
      })
    } finally {
      setSendingTest(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-rn-text-muted" />
      </div>
    )
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="flex items-center gap-3 mb-6">
        <Mail className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold">Email Settings</h1>
          <p className="text-muted-foreground">
            Configure email provider and default settings
          </p>
        </div>
      </div>

      {message && (
        <Alert className={message.type === 'error' ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'}>
          {message.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription className={message.type === 'error' ? 'text-red-800' : 'text-green-800'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="provider" className="mt-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="provider">Provider</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="test">Test</TabsTrigger>
        </TabsList>

        <TabsContent value="provider">
          <Card>
            <CardHeader>
              <CardTitle>Email Provider</CardTitle>
              <CardDescription>
                Select and configure your email provider
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="provider">Provider</Label>
                <Select value={provider} onValueChange={setProvider}>
                  <SelectTrigger id="provider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BREVO">Brevo (Sendinblue)</SelectItem>
                    <SelectItem value="RESEND">Resend</SelectItem>
                    <SelectItem value="SENDGRID">SendGrid</SelectItem>
                    <SelectItem value="SES">Amazon SES</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder={hasExistingApiKey ? '••••••••••••' : 'Paste API key'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                {hasExistingApiKey && (
                  <p className="text-sm text-muted-foreground">
                    API key is already configured. Paste a new one to update.
                  </p>
                )}
                {provider === 'BREVO' && (
                  <p className="text-sm text-muted-foreground">
                    Find your API key at: <a href="https://app.brevo.com/settings/keys/api" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://app.brevo.com/settings/keys/api</a>
                  </p>
                )}
              </div>

              <Button onClick={handleSaveProvider} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Provider'
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Email Settings</CardTitle>
              <CardDescription>
                Global default settings for outgoing emails
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fromName">From Name</Label>
                <Input
                  id="fromName"
                  placeholder="RegiNor Platform"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fromEmail">From Email</Label>
                <Input
                  id="fromEmail"
                  type="email"
                  placeholder="noreply@reginor.no"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="replyToEmail">Reply-To Email</Label>
                <Input
                  id="replyToEmail"
                  type="email"
                  placeholder="support@reginor.no"
                  value={replyToEmail}
                  onChange={(e) => setReplyToEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Primary Language</Label>
                <Select value={primaryLanguage} onValueChange={setPrimaryLanguage}>
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="no">Norwegian</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleSaveSettings} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Settings'
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test">
          <Card>
            <CardHeader>
              <CardTitle>Send Test Email</CardTitle>
              <CardDescription>
                Test that the email system works by sending a test email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="testEmail">Recipient Email</Label>
                <Input
                  id="testEmail"
                  type="email"
                  placeholder="your@email.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
              </div>

              <Button onClick={handleSendTest} disabled={sendingTest || !testEmail}>
                {sendingTest ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Test Email
                  </>
                )}
              </Button>

              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Tip:</strong> Make sure both sender settings and API key are configured before sending a test email.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
