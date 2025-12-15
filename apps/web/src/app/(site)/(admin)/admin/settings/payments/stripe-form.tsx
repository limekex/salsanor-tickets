
'use client'

import { useState, useTransition } from 'react'
import { updatePaymentConfig } from '@/app/actions/settings'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

export function StripeFormClient({ initialConfig }: { initialConfig?: any }) {
    const [enabled, setEnabled] = useState(initialConfig?.enabled ?? false)
    const [isTest, setIsTest] = useState(initialConfig?.isTest ?? true)
    const [publishableKey, setPublishableKey] = useState(initialConfig?.publishableKey ?? '')
    const [secretKey, setSecretKey] = useState(initialConfig?.secretKey ?? '')
    const [webhookSecret, setWebhookSecret] = useState(initialConfig?.webhookSecret ?? '')

    const [isPending, startTransition] = useTransition()
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    function handleSave() {
        setMessage(null)
        startTransition(async () => {
            const result = await updatePaymentConfig('STRIPE', {
                enabled,
                isTest,
                publishableKey,
                secretKey,
                webhookSecret
            })
            if (result.success) {
                setMessage({ type: 'success', text: 'Stripe settings saved successfully.' })
            } else {
                setMessage({ type: 'error', text: 'Failed to save settings.' })
            }
        })
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Stripe Configuration</CardTitle>
                        <CardDescription>Enter your standard and secret keys.</CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Label htmlFor="stripe-enabled">Enabled</Label>
                        <Switch id="stripe-enabled" checked={enabled} onCheckedChange={setEnabled} />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center space-x-2 border p-3 rounded bg-muted/20">
                    <Switch id="stripe-test" checked={isTest} onCheckedChange={setIsTest} />
                    <div className="flex-1">
                        <Label htmlFor="stripe-test" className="font-semibold">Test Mode</Label>
                        <p className="text-xs text-muted-foreground">Using sandbox environment (does not process real cards).</p>
                    </div>
                </div>

                <div className="grid gap-2">
                    <Label>Publishable Key ({isTest ? 'Test' : 'Live'})</Label>
                    <Input
                        value={publishableKey}
                        onChange={e => setPublishableKey(e.target.value)}
                        placeholder={isTest ? "pk_test_..." : "pk_live_..."}
                        className="font-mono"
                    />
                </div>

                <div className="grid gap-2">
                    <Label>Secret Key ({isTest ? 'Test' : 'Live'})</Label>
                    <Input
                        type="password"
                        value={secretKey}
                        onChange={e => setSecretKey(e.target.value)}
                        placeholder={isTest ? "sk_test_..." : "sk_live_..."}
                        className="font-mono"
                    />
                </div>

                <div className="grid gap-2">
                    <Label>Webhook Secret</Label>
                    <Input
                        type="password"
                        value={webhookSecret}
                        onChange={e => setWebhookSecret(e.target.value)}
                        placeholder="whsec_..."
                        className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                        Signing secret for webhook events.
                    </p>
                </div>

                {message && (
                    <div className={`flex items-center gap-2 text-sm p-3 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-destructive/10 text-destructive'}`}>
                        {message.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        {message.text}
                    </div>
                )}
            </CardContent>
            <CardFooter>
                <Button onClick={handleSave} disabled={isPending}>
                    {isPending ? 'Saving...' : 'Save Configuration'}
                </Button>
            </CardFooter>
        </Card>
    )
}
