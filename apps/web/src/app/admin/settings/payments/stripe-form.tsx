'use client'

import { useState, useTransition } from 'react'
import { updatePaymentConfig } from '@/app/actions/settings'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle2, ExternalLink, Info } from 'lucide-react'

export function StripeFormClient({ initialConfig }: { initialConfig?: any }) {
    const [enabled, setEnabled] = useState(initialConfig?.enabled ?? false)
    const [isTest, setIsTest] = useState(initialConfig?.isTest ?? true)
    const [publishableKey, setPublishableKey] = useState(initialConfig?.publishableKey ?? '')
    const [secretKey, setSecretKey] = useState(initialConfig?.secretKey ?? '')
    const [webhookSecret, setWebhookSecret] = useState(initialConfig?.webhookSecret ?? '')
    const [useStripeConnect, setUseStripeConnect] = useState(initialConfig?.useStripeConnect ?? false)
    const [platformAccountId, setPlatformAccountId] = useState(initialConfig?.platformAccountId ?? '')
    const [platformFeePercent, setPlatformFeePercent] = useState(initialConfig?.platformFeePercent ?? 0)
    const [platformFeeFixed, setPlatformFeeFixed] = useState(initialConfig?.platformFeeFixed ?? 0)

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
                webhookSecret,
                useStripeConnect,
                platformAccountId,
                platformFeePercent,
                platformFeeFixed,
            })
            if (result.success) {
                setMessage({ type: 'success', text: 'Stripe settings saved successfully.' })
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to save settings.' })
            }
        })
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Stripe Configuration</CardTitle>
                        <CardDescription>
                            Configure standard Stripe or Stripe Connect for multi-tenant payments
                        </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Label htmlFor="stripe-enabled">Enabled</Label>
                        <Switch id="stripe-enabled" checked={enabled} onCheckedChange={setEnabled} />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Test Mode Toggle */}
                <div className="flex items-center space-x-2 border p-3 rounded bg-muted/20">
                    <Switch id="stripe-test" checked={isTest} onCheckedChange={setIsTest} />
                    <div className="flex-1">
                        <Label htmlFor="stripe-test" className="font-semibold">Test Mode</Label>
                        <p className="text-xs text-muted-foreground">
                            Using sandbox environment (does not process real cards).
                        </p>
                    </div>
                </div>

                {/* Stripe Connect Toggle */}
                <div className="flex items-center space-x-2 border p-3 rounded bg-blue-50 dark:bg-blue-950/20">
                    <Switch 
                        id="stripe-connect" 
                        checked={useStripeConnect} 
                        onCheckedChange={setUseStripeConnect} 
                    />
                    <div className="flex-1">
                        <Label htmlFor="stripe-connect" className="font-semibold">
                            Use Stripe Connect
                        </Label>
                        <p className="text-xs text-muted-foreground">
                            Enable multi-tenant payments where each organizer has their own Stripe account
                        </p>
                    </div>
                </div>

                {useStripeConnect && (
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                            <strong>Stripe Connect Platform Mode:</strong> Each organizer will be able to connect 
                            their own Stripe account. You need a Stripe Platform account to use this.{' '}
                            <a 
                                href="https://stripe.com/docs/connect" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="underline inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                            >
                                Learn more <ExternalLink className="h-3 w-3" />
                            </a>
                        </AlertDescription>
                    </Alert>
                )}

                <Tabs defaultValue={useStripeConnect ? "connect" : "standard"} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="standard" disabled={useStripeConnect}>
                            Standard Stripe
                        </TabsTrigger>
                        <TabsTrigger value="connect" disabled={!useStripeConnect}>
                            Stripe Connect
                        </TabsTrigger>
                    </TabsList>
                    
                    {/* Standard Stripe Configuration */}
                    <TabsContent value="standard" className="space-y-4 mt-4">
                        <div className="grid gap-2">
                            <Label>Publishable Key ({isTest ? 'Test' : 'Live'})</Label>
                            <Input
                                value={publishableKey}
                                onChange={e => setPublishableKey(e.target.value)}
                                placeholder={isTest ? "pk_test_..." : "pk_live_..."}
                                className="font-mono text-sm"
                                disabled={useStripeConnect}
                            />
                            <p className="text-xs text-muted-foreground">
                                Your standard Stripe publishable API key
                            </p>
                        </div>

                        <div className="grid gap-2">
                            <Label>Secret Key ({isTest ? 'Test' : 'Live'})</Label>
                            <Input
                                type="password"
                                value={secretKey}
                                onChange={e => setSecretKey(e.target.value)}
                                placeholder={isTest ? "sk_test_..." : "sk_live_..."}
                                className="font-mono text-sm"
                                disabled={useStripeConnect}
                            />
                            <p className="text-xs text-muted-foreground">
                                Your standard Stripe secret API key (stored securely)
                            </p>
                        </div>

                        <div className="grid gap-2">
                            <Label>Webhook Secret</Label>
                            <Input
                                type="password"
                                value={webhookSecret}
                                onChange={e => setWebhookSecret(e.target.value)}
                                placeholder="whsec_..."
                                className="font-mono text-sm"
                                disabled={useStripeConnect}
                            />
                            <p className="text-xs text-muted-foreground">
                                Signing secret for validating webhook events
                            </p>
                        </div>
                    </TabsContent>

                    {/* Stripe Connect Configuration */}
                    <TabsContent value="connect" className="space-y-4 mt-4">
                        <div className="grid gap-2">
                            <Label>Platform Account ID</Label>
                            <Input
                                value={platformAccountId}
                                onChange={e => setPlatformAccountId(e.target.value)}
                                placeholder="acct_..."
                                className="font-mono text-sm"
                                disabled={!useStripeConnect}
                            />
                            <p className="text-xs text-muted-foreground">
                                Your Stripe Platform account ID (from Stripe Dashboard)
                            </p>
                        </div>

                        <div className="grid gap-2">
                            <Label>Platform Publishable Key ({isTest ? 'Test' : 'Live'})</Label>
                            <Input
                                value={publishableKey}
                                onChange={e => setPublishableKey(e.target.value)}
                                placeholder={isTest ? "pk_test_..." : "pk_live_..."}
                                className="font-mono text-sm"
                                disabled={!useStripeConnect}
                            />
                            <p className="text-xs text-muted-foreground">
                                Your platform's publishable API key
                            </p>
                        </div>

                        <div className="grid gap-2">
                            <Label>Platform Secret Key ({isTest ? 'Test' : 'Live'})</Label>
                            <Input
                                type="password"
                                value={secretKey}
                                onChange={e => setSecretKey(e.target.value)}
                                placeholder={isTest ? "sk_test_..." : "sk_live_..."}
                                className="font-mono text-sm"
                                disabled={!useStripeConnect}
                            />
                            <p className="text-xs text-muted-foreground">
                                Your platform's secret API key (stored securely)
                            </p>
                        </div>

                        <div className="grid gap-2">
                            <Label>Webhook Secret (Connect)</Label>
                            <Input
                                type="password"
                                value={webhookSecret}
                                onChange={e => setWebhookSecret(e.target.value)}
                                placeholder="whsec_..."
                                className="font-mono text-sm"
                                disabled={!useStripeConnect}
                            />
                            <p className="text-xs text-muted-foreground">
                                Webhook secret for Connect events
                            </p>
                        </div>

                        <div className="border-t pt-4 space-y-4">
                            <h4 className="font-semibold text-sm">Platform Fees</h4>
                            
                            <div className="grid gap-2">
                                <Label>Platform Fee (%)</Label>
                                <Input
                                    type="number"
                                    value={platformFeePercent}
                                    onChange={e => setPlatformFeePercent(parseFloat(e.target.value) || 0)}
                                    placeholder="0"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    disabled={!useStripeConnect}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Percentage commission on each transaction (e.g., 2.5 for 2.5%)
                                </p>
                            </div>

                            <div className="grid gap-2">
                                <Label>Fixed Fee per Transaction (øre/cents)</Label>
                                <Input
                                    type="number"
                                    value={platformFeeFixed}
                                    onChange={e => setPlatformFeeFixed(parseInt(e.target.value) || 0)}
                                    placeholder="0"
                                    step="1"
                                    min="0"
                                    disabled={!useStripeConnect}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Fixed fee in øre per transaction (e.g., 100 = 1 NOK)
                                </p>
                            </div>

                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription className="text-xs">
                                    <strong>Note:</strong> Platform fees are deducted from payments before they 
                                    reach the connected organizer accounts. Example: 2.5% + 1 NOK on a 100 NOK 
                                    payment = 3.50 NOK platform fee, 96.50 NOK to organizer.
                                </AlertDescription>
                            </Alert>
                        </div>
                    </TabsContent>
                </Tabs>

                {message && (
                    <div className={`flex items-center gap-2 text-sm p-3 rounded ${
                        message.type === 'success' 
                            ? 'bg-green-100 dark:bg-green-950/20 text-green-700 dark:text-green-400' 
                            : 'bg-destructive/10 text-destructive'
                    }`}>
                        {message.type === 'success' ? (
                            <CheckCircle2 className="h-4 w-4" />
                        ) : (
                            <AlertCircle className="h-4 w-4" />
                        )}
                        {message.text}
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex justify-between">
                <div className="text-sm text-muted-foreground">
                    {useStripeConnect ? (
                        <span>Connect mode: Organizers will link their own accounts</span>
                    ) : (
                        <span>Standard mode: All payments to one account</span>
                    )}
                </div>
                <Button onClick={handleSave} disabled={isPending}>
                    {isPending ? 'Saving...' : 'Save Configuration'}
                </Button>
            </CardFooter>
        </Card>
    )
}
