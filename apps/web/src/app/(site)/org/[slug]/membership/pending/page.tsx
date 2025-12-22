import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { CheckCircle2, Clock, Home } from 'lucide-react'

interface Props {
    params: Promise<{ slug: string }>
    searchParams: Promise<{ orderId?: string }>
}

export default async function MembershipPendingPage({ params, searchParams }: Props) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    const resolvedParams = await params
    const resolvedSearchParams = await searchParams
    const orderId = resolvedSearchParams.orderId

    if (!orderId) {
        redirect('/')
    }

    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
            memberships: {
                include: {
                    tier: true,
                    organizer: true
                }
            }
        }
    })

    if (!order || !order.memberships || order.memberships.length === 0) {
        redirect('/')
    }

    const membership = order.memberships[0]
    const requiresPayment = order.status === 'PENDING'

    return (
        <div className="container mx-auto py-10">
            <div className="max-w-2xl mx-auto space-y-6">
                <Card>
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            <div className="rounded-full bg-yellow-100 dark:bg-yellow-900/20 p-3">
                                <Clock className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl">Membership Pending Approval</CardTitle>
                        <CardDescription>
                            Your {membership.tier.name} membership application has been received
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Alert>
                            <AlertDescription>
                                Your membership application for <strong>{membership.organizer.name}</strong> requires 
                                manual approval from an organization administrator. You will receive an email notification 
                                once your membership has been reviewed and approved.
                            </AlertDescription>
                        </Alert>

                        {requiresPayment && (
                            <Alert>
                                <AlertDescription>
                                    <strong>Note:</strong> Payment will be required after your membership is approved. 
                                    You will receive a payment link via email.
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="bg-muted p-4 rounded-lg space-y-2">
                            <h3 className="font-semibold">Application Details</h3>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Organization:</span>
                                    <p className="font-medium">{membership.organizer.name}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Membership Tier:</span>
                                    <p className="font-medium">{membership.tier.name}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Status:</span>
                                    <p className="font-medium text-yellow-600 dark:text-yellow-400">Pending Approval</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Order ID:</span>
                                    <p className="font-medium font-mono text-xs">{order.id.slice(0, 8)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 pt-4">
                            <h3 className="font-semibold text-sm">What happens next?</h3>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600" />
                                    <span>An administrator will review your application</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600" />
                                    <span>You will receive an email notification once approved</span>
                                </li>
                                {requiresPayment && (
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600" />
                                        <span>Complete payment after approval to activate your membership</span>
                                    </li>
                                )}
                                {!requiresPayment && (
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600" />
                                        <span>Your membership will be activated upon approval</span>
                                    </li>
                                )}
                            </ul>
                        </div>

                        <div className="pt-6 flex flex-col sm:flex-row gap-3 justify-center">
                            <Button asChild className="sm:order-2 sm:w-auto">
                                <Link href="/profile">
                                    View My Profile
                                </Link>
                            </Button>
                            <Button asChild variant="outline" className="sm:order-1 sm:w-auto">
                                <Link href="/">
                                    <Home className="h-4 w-4 mr-2" />
                                    Back to Home
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
