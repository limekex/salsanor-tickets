import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle2, ExternalLink, CreditCard, ArrowLeft } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { StripeEmbeddedOnboarding } from './stripe-embedded-onboarding'
import { StripeEmbeddedManagement } from './stripe-embedded-management'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Stripe from 'stripe'

async function getStripeAccountStatus(accountId: string) {
    const config = await prisma.paymentConfig.findUnique({
        where: { provider: 'STRIPE' }
    })

    const stripeKey = config?.secretKey || process.env.STRIPE_SECRET_KEY
    if (!stripeKey) return null

    const stripe = new Stripe(stripeKey, {
        apiVersion: '2024-11-20.acacia'
    })

    try {
        const account = await stripe.accounts.retrieve(accountId)
        return {
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
            detailsSubmitted: account.details_submitted,
        }
    } catch {
        return null
    }
}

export default async function StaffAdminPaymentsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
        redirect('/auth/login')
    }

    // Get user's admin organizations
    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: {
            roles: {
                include: {
                    organizer: true
                }
            }
        }
    })

    if (!userAccount) {
        redirect('/auth/login')
    }

    // Get organizations where user is admin
    const adminOrganizers = userAccount.roles
        .filter(r => r.role === 'ORG_ADMIN' || r.role === 'ORGANIZER' || r.role === 'ADMIN')
        .map(r => r.organizer)
        .filter((org): org is NonNullable<typeof org> => org !== null)

    if (adminOrganizers.length === 0) {
        return (
            <div className="space-y-6">
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        You don&apos;t have admin access to any organizations.
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    // Check if Stripe Connect is enabled globally
    const paymentConfig = await prisma.paymentConfig.findUnique({
        where: { provider: 'STRIPE' },
        select: {
            useStripeConnect: true,
            enabled: true,
            publishableKey: true,
        }
    })

    const isStripeConnectEnabled = paymentConfig?.enabled && paymentConfig?.useStripeConnect

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button asChild variant="ghost" size="sm">
                    <Link href="/staffadmin/settings">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Payment Settings</h1>
                    <p className="text-muted-foreground">
                        Connect your Stripe account to receive payments
                    </p>
                </div>
            </div>

            {!isStripeConnectEnabled && (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Stripe Connect is not enabled on this platform. Contact the administrator 
                        to enable multi-tenant payment processing.
                    </AlertDescription>
                </Alert>
            )}

            {isStripeConnectEnabled && adminOrganizers.map(async (organizer) => {
                const hasStripeAccount = !!organizer.stripeConnectAccountId
                
                // Fetch real-time status from Stripe if account exists
                let stripeStatus = null
                if (hasStripeAccount && organizer.stripeConnectAccountId) {
                    stripeStatus = await getStripeAccountStatus(organizer.stripeConnectAccountId)
                    
                    // Update database if status has changed
                    if (stripeStatus) {
                        const needsUpdate = 
                            stripeStatus.detailsSubmitted !== organizer.stripeOnboardingComplete ||
                            stripeStatus.chargesEnabled !== organizer.stripeChargesEnabled ||
                            stripeStatus.payoutsEnabled !== organizer.stripePayoutsEnabled
                        
                        if (needsUpdate) {
                            await prisma.organizer.update({
                                where: { id: organizer.id },
                                data: {
                                    stripeOnboardingComplete: stripeStatus.detailsSubmitted,
                                    stripeChargesEnabled: stripeStatus.chargesEnabled,
                                    stripePayoutsEnabled: stripeStatus.payoutsEnabled,
                                }
                            })
                            // Update local object
                            organizer.stripeOnboardingComplete = stripeStatus.detailsSubmitted
                            organizer.stripeChargesEnabled = stripeStatus.chargesEnabled
                            organizer.stripePayoutsEnabled = stripeStatus.payoutsEnabled
                        }
                    }
                }
                
                const isOnboardingComplete = organizer.stripeOnboardingComplete
                const chargesEnabled = stripeStatus?.chargesEnabled ?? organizer.stripeChargesEnabled
                const payoutsEnabled = stripeStatus?.payoutsEnabled ?? organizer.stripePayoutsEnabled

                return (
                    <div key={organizer.id} className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold">{organizer.name}</h2>
                            {hasStripeAccount && isOnboardingComplete && (
                                <Badge variant="default" className="bg-green-600">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Connected
                                </Badge>
                            )}
                            {hasStripeAccount && !isOnboardingComplete && (
                                <Badge variant="secondary">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Incomplete
                                </Badge>
                            )}
                            {!hasStripeAccount && (
                                <Badge variant="outline">
                                    Not Connected
                                </Badge>
                            )}
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Connection Status</CardTitle>
                                <CardDescription>
                                    Stripe account connection status for {organizer.name}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {hasStripeAccount ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-3 border rounded">
                                            <div className="flex items-center gap-3">
                                                <CreditCard className="h-5 w-5 text-blue-600" />
                                                <div>
                                                    <p className="font-mono text-sm">
                                                        {organizer.stripeConnectAccountId}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Stripe Account ID
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="p-3 border rounded">
                                                <div className="flex items-center gap-2">
                                                    {chargesEnabled ? (
                                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                    ) : (
                                                        <AlertCircle className="h-4 w-4 text-amber-600" />
                                                    )}
                                                    <span className="text-sm font-medium">
                                                        {chargesEnabled ? 'Charges Enabled' : 'Charges Disabled'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Ability to accept payments
                                                </p>
                                            </div>

                                            <div className="p-3 border rounded">
                                                <div className="flex items-center gap-2">
                                                    {payoutsEnabled ? (
                                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                    ) : (
                                                        <AlertCircle className="h-4 w-4 text-amber-600" />
                                                    )}
                                                    <span className="text-sm font-medium">
                                                        {payoutsEnabled ? 'Payouts Enabled' : 'Payouts Disabled'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Ability to receive funds
                                                </p>
                                            </div>
                                        </div>

                                        {!isOnboardingComplete && (
                                            <Alert>
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertDescription>
                                                    Your Stripe account setup is incomplete. Complete the onboarding 
                                                    process below to start accepting payments.
                                                </AlertDescription>
                                            </Alert>
                                        )}
                                    </div>
                                ) : (
                                    <Alert>
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription className="text-sm">
                                            <strong>What you&apos;ll need:</strong>
                                            <ul className="list-disc list-inside mt-2 space-y-1">
                                                <li>Business or personal details</li>
                                                <li>Bank account information</li>
                                                <li>Tax identification number (org.nr for Norwegian businesses)</li>
                                            </ul>
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </CardContent>
                        </Card>

                        {/* Embedded Stripe Connect Components */}
                        {paymentConfig.publishableKey && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>
                                        {hasStripeAccount && isOnboardingComplete ? 'Account Management' : 'Account Setup'}
                                    </CardTitle>
                                    <CardDescription>
                                        {hasStripeAccount && isOnboardingComplete 
                                            ? 'Manage your Stripe account settings' 
                                            : 'Connect or complete your Stripe account setup'}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {hasStripeAccount && isOnboardingComplete ? (
                                        <StripeEmbeddedManagement 
                                            organizerId={organizer.id}
                                            publishableKey={paymentConfig.publishableKey}
                                        />
                                    ) : (
                                        <StripeEmbeddedOnboarding 
                                            organizerId={organizer.id}
                                            publishableKey={paymentConfig.publishableKey}
                                        />
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        <Card>
                            <CardHeader>
                                <CardTitle>How It Works</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm text-muted-foreground">
                                <div className="flex gap-3">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center text-xs font-bold">
                                        1
                                    </div>
                                    <div>
                                        <p className="font-semibold text-foreground">Connect Your Account</p>
                                        <p className="text-xs">Link your existing Stripe account or create a new one</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center text-xs font-bold">
                                        2
                                    </div>
                                    <div>
                                        <p className="font-semibold text-foreground">Complete Verification</p>
                                        <p className="text-xs">Provide business details and verify your identity</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center text-xs font-bold">
                                        3
                                    </div>
                                    <div>
                                        <p className="font-semibold text-foreground">Start Accepting Payments</p>
                                        <p className="text-xs">Receive payments directly to your account after platform fees</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Alert>
                            <ExternalLink className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                                Stripe Connect is a secure way to receive payments. The platform never has access 
                                to your bank details. All sensitive information is handled directly by Stripe.{' '}
                                <a 
                                    href="https://stripe.com/connect" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="underline"
                                >
                                    Learn more about Stripe Connect
                                </a>
                            </AlertDescription>
                        </Alert>
                    </div>
                )
            })}
        </div>
    )
}
