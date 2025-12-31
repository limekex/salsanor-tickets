import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { format } from 'date-fns'
import { PayButton } from '@/components/pay-button'
import { TicketQR } from '@/components/ticket-qr'
import { AcceptOfferButton, DeclineOfferButton } from './offer-buttons'
import { CancelOrderButton } from './cancel-order-button'
import { formatDistanceToNow } from 'date-fns'
import { LayoutDashboard, Clock, Settings } from 'lucide-react'
import { MembershipCard } from '@/components/membership-card'

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
                    },
                    memberships: {
                        where: {
                            status: { not: 'CANCELLED' }
                        },
                        include: {
                            tier: true,
                            organizer: true,
                            person: true
                        },
                        orderBy: { validTo: 'desc' }
                    }
                }
            },
            roles: true
        }
    })

    // If no profile yet, redirect to onboarding
    if (!userAccount?.personProfile) {
        redirect('/onboarding')
    }

    const { registrations, tickets, memberships } = userAccount.personProfile
    const hasStaffRoles = userAccount.roles.length > 0

    return (
        <main className="container mx-auto py-rn-7 px-rn-4 space-y-rn-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-rn-6 gap-rn-4">
                <div>
                    <h1 className="rn-h1">My Profile</h1>
                    <p className="rn-meta text-rn-text-muted">{user.email}</p>
                </div>
                <div className="flex gap-rn-2 flex-wrap">
                    <Button asChild variant="outline">
                        <Link href="/profile/settings">
                            <Settings className="h-4 w-4 mr-2" />
                            Settings
                        </Link>
                    </Button>
                    {hasStaffRoles && (
                        <Button asChild variant="outline">
                            <Link href="/dashboard">
                                <LayoutDashboard className="h-4 w-4 mr-2" />
                                Staff Dashboard
                            </Link>
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-rn-8">
                {/* Main Content - Left Side */}
                <div className="lg:col-span-2 space-y-rn-8">
                    {/* Course Registrations Section */}
                    <div className="space-y-rn-4">
                        <h2 className="rn-h2">My Course Registrations</h2>
                        <div className="grid gap-rn-6 md:grid-cols-2">
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
                                    <div className="space-y-2">
                                        <PayButton orderId={reg.order.id} />
                                        <CancelOrderButton orderId={reg.order.id} />
                                    </div>
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
                </div>

                {/* Sidebar - Right Side (Memberships) */}
                {memberships.length > 0 && (
                    <div className="lg:col-span-1">
                        <div className="sticky top-4 space-y-4">
                            <h2 className="text-2xl font-bold">My Memberships</h2>
                            <div className="space-y-4">
                                {memberships.map((membership) => {
                                    // Show pending message for PENDING_PAYMENT memberships
                                    if (membership.status === 'PENDING_PAYMENT') {
                                        return (
                                            <Card key={membership.id}>
                                                <CardHeader className="text-center">
                                                    <div className="flex justify-center mb-2">
                                                        <div className="rounded-full bg-yellow-100 dark:bg-yellow-900/20 p-2">
                                                            <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                                                        </div>
                                                    </div>
                                                    <CardTitle className="text-lg">Pending Approval</CardTitle>
                                                    <CardDescription>
                                                        {membership.organizer.name}
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent className="space-y-3">
                                                    <div className="text-sm text-center text-muted-foreground">
                                                        Your <strong>{membership.tier.name}</strong> membership is waiting for validation from an administrator.
                                                    </div>
                                                    <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-sm">
                                                        <p className="text-yellow-800 dark:text-yellow-400">
                                                            You will receive an email notification once your membership has been approved.
                                                        </p>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )
                                    }

                                    // Show normal membership card for ACTIVE memberships
                                    return (
                                        <MembershipCard 
                                            key={membership.id} 
                                            membership={{
                                                ...membership,
                                                tier: {
                                                    name: membership.tier.name,
                                                    slug: membership.tier.slug,
                                                    discountPercent: Number(membership.tier.discountPercent)
                                                },
                                                organizer: {
                                                    name: membership.organizer.name,
                                                    slug: membership.organizer.slug,
                                                    mvaRate: Number(membership.organizer.mvaRate),
                                                    stripeFeePercentage: Number(membership.organizer.stripeFeePercentage)
                                                }
                                            }} 
                                        />
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    )
}
