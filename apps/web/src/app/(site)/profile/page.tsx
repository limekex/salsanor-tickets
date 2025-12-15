
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { PayButton } from '@/components/pay-button'
import { TicketQR } from '@/components/ticket-qr'
import { AcceptOfferButton, DeclineOfferButton } from './offer-buttons'
import { formatDistanceToNow } from 'date-fns'

export default async function ProfilePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    // Fetch user account and registrations
    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: {
            personProfile: {
                include: {
                    registrations: {
                        include: {
                            track: true,
                            period: true,
                            order: true,
                            waitlist: true
                        },
                        orderBy: { createdAt: 'desc' }
                    },
                    tickets: {
                        where: { status: 'ACTIVE' }
                    }
                }
            }
        }
    })

    // If no profile yet, redirect to onboarding
    if (!userAccount?.personProfile) {
        redirect('/onboarding')
    }

    const { registrations, tickets } = userAccount.personProfile

    return (
        <div className="container mx-auto py-10 space-y-8">
            <div>
                <h1 className="text-3xl font-bold">My Registrations</h1>
                <p className="text-muted-foreground">{user.email}</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {registrations.length === 0 && <p>No registrations found.</p>}

                {registrations.map((reg) => (
                    <Card key={reg.id}>
                        <CardHeader>
                            <div className="flex justify-between">
                                <Badge variant={reg.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                    {reg.status}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                    {format(reg.createdAt, 'MMM d, yyyy')}
                                </span>
                            </div>
                            <CardTitle>{reg.track.title}</CardTitle>
                            <CardDescription>{reg.period.name}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span>Role:</span>
                                        <span>{reg.chosenRole}</span>
                                    </div>
                                    {reg.order && (
                                        <div className="flex justify-between border-t pt-2">
                                            <span>Total Paid/Due:</span>
                                            <span>{reg.order.totalCents / 100},-</span>
                                        </div>
                                    )}
                                </div>

                                {/* OFFER UI */}
                                {reg.waitlist?.status === 'OFFERED' && (
                                    <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-md border border-orange-200 dark:border-orange-800 space-y-3">
                                        <div>
                                            <h4 className="font-bold text-orange-800 dark:text-orange-400">Spot Offered!</h4>
                                            <p className="text-xs text-orange-700 dark:text-orange-500">
                                                Expires {formatDistanceToNow(reg.waitlist.offeredUntil!, { addSuffix: true })}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <AcceptOfferButton registrationId={reg.id} />
                                            <DeclineOfferButton registrationId={reg.id} />
                                        </div>
                                    </div>
                                )}

                                {(reg.status === 'DRAFT' || reg.status === 'PENDING_PAYMENT') && reg.order?.id && (
                                    <PayButton orderId={reg.order.id} />
                                )}

                                {reg.status === 'ACTIVE' && (
                                    (() => {
                                        const ticket = tickets.find(t => t.periodId === reg.periodId)
                                        if (ticket) {
                                            return <TicketQR token={ticket.qrTokenHash} title={reg.period.name} />
                                        }
                                        return null
                                    })()
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
