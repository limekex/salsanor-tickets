
import { getPaymentConfigs, updatePaymentConfig } from '@/app/actions/settings'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PaymentProvider } from '@prisma/client'
import { Badge } from '@/components/ui/badge'

export default async function PaymentSettingsPage() {
    const configs = await getPaymentConfigs()
    const stripeConfig = configs.find(c => c.provider === 'STRIPE')

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Payment Settings</h1>
                <p className="text-muted-foreground">Configure payment providers and API keys.</p>
            </div>

            <Tabs defaultValue="stripe">
                <TabsList>
                    <TabsTrigger value="stripe">Stripe</TabsTrigger>
                    <TabsTrigger value="vipps">Vipps MobilePay</TabsTrigger>
                </TabsList>

                <TabsContent value="stripe" className="space-y-4">
                    <StripeConfigForm config={stripeConfig} />
                </TabsContent>

                <TabsContent value="vipps">
                    <Card>
                        <CardHeader>
                            <CardTitle>Vipps MobilePay</CardTitle>
                            <CardDescription>Coming soon / Not configured.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Integration planned for later phase.</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

import { StripeFormClient } from './stripe-form'

function StripeConfigForm({ config }: { config?: any }) {
    // Convert Prisma Decimal to number for client component
    const serializedConfig = config ? {
        ...config,
        platformFeePercent: config.platformFeePercent ? Number(config.platformFeePercent) : 0,
    } : undefined
    
    return <StripeFormClient initialConfig={serializedConfig} />
}
