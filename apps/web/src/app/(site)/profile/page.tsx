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
import { QRCodeDisplay } from '@/components/qr-code-display'
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
            PersonProfile: {
                include: {
                    Registration: {
                        where: {
                            // Only show registrations that are not in DRAFT status
                            // DRAFT orders should not be visible until payment is confirmed
                            status: { not: 'DRAFT' }
                        },
                        include: {
                            CourseTrack: true,
                            CoursePeriod: true,
                            Order: true,
                            WaitlistEntry: true
                        },
                        orderBy: { createdAt: 'desc' }
                    },
                    EventRegistration: {
                        where: {
                            status: { not: 'DRAFT' }
                        },
                        include: {
                            Event: {
                                include: {
                                    Organizer: true
                                }
                            },
                            Order: true
                        },
                        orderBy: { createdAt: 'desc' }
                    },
                    Ticket: {
                        where: { status: 'ACTIVE' }
                    },
                    EventTicket: {
                        where: { status: 'ACTIVE' },
                        include: {
                            Event: {
                                include: {
                                    Organizer: true
                                }
                            }
                        }
                    },
                    Membership: {
                        where: {
                            status: { not: 'CANCELLED' }
                        },
                        include: {
                            MembershipTier: true,
                            Organizer: true,
                            PersonProfile: true
                        },
                        orderBy: { validTo: 'desc' }
                    }
                }
            },
            UserAccountRole: true
        }
    })

    // If no profile yet, redirect to onboarding
    if (!userAccount?.PersonProfile) {
        redirect('/onboarding')
    }

    const registrations = userAccount.PersonProfile.Registration
    const eventRegistrations = userAccount.PersonProfile.EventRegistration || []
    const eventTickets = userAccount.PersonProfile.EventTicket || []
    const tickets = userAccount.PersonProfile.Ticket
    const memberships = userAccount.PersonProfile.Membership
    const hasStaffRoles = userAccount.UserAccountRole.length > 0

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
                    {/* Event Tickets Section */}
                    {eventRegistrations.length > 0 && (
                        <div className="space-y-rn-4">
                            <h2 className="rn-h2">My Event Tickets</h2>
                            <div className="grid gap-rn-6 md:grid-cols-2">
                                {eventRegistrations.map((eventReg) => (
                                    <Card key={eventReg.id}>
                                        <CardHeader>
                                            <div className="flex justify-between">
                                                <Badge variant={eventReg.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                                    {eventReg.status}
                                                </Badge>
                                                <span className="text-sm text-muted-foreground">
                                                    {format(eventReg.createdAt, 'MMM d, yyyy')}
                                                </span>
                                            </div>
                                            <CardTitle>{eventReg.Event.title}</CardTitle>
                                            <CardDescription>{eventReg.Event.Organizer.name}</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-4">
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span>Quantity:</span>
                                                        <span>{eventReg.quantity} ticket(s)</span>
                                                    </div>
                                                    {eventReg.Event.startsAt && (
                                                        <div className="flex justify-between">
                                                            <span>Date:</span>
                                                            <span>{format(new Date(eventReg.Event.startsAt), 'MMM d, yyyy HH:mm')}</span>
                                                        </div>
                                                    )}
                                                    {eventReg.Order && (
                                                        <div className="flex justify-between border-t pt-2">
                                                            <span>Total Paid/Due:</span>
                                                            <span>{eventReg.Order.totalCents / 100},-</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Show tickets if active */}
                                                {eventReg.status === 'ACTIVE' && (() => {
                                                    const tickets = eventTickets.filter(t => t.eventId === eventReg.Event.id)
                                                    if (tickets.length > 0) {
                                                        return (
                                                            <div className="border-t pt-4 space-y-3">
                                                                <p className="text-sm font-medium">
                                                                    {tickets.length === 1 ? 'Din billett:' : `Dine ${tickets.length} billetter:`}
                                                                </p>
                                                                {tickets.length === 1 ? (
                                                                    <div className="flex justify-center">
                                                                        <QRCodeDisplay token={tickets[0].qrTokenHash} size={150} />
                                                                    </div>
                                                                ) : (
                                                                    <div className="space-y-2">
                                                                        {tickets.map((ticket, idx) => (
                                                                            <details key={ticket.id} className="group">
                                                                                <summary className="cursor-pointer list-none">
                                                                                    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent">
                                                                                        <span className="font-medium">
                                                                                            Billett {ticket.ticketNumber || idx + 1}
                                                                                        </span>
                                                                                        <svg 
                                                                                            className="w-5 h-5 transition-transform group-open:rotate-180" 
                                                                                            fill="none" 
                                                                                            stroke="currentColor" 
                                                                                            viewBox="0 0 24 24"
                                                                                        >
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                                                        </svg>
                                                                                    </div>
                                                                                </summary>
                                                                                <div className="mt-2 flex justify-center p-4 bg-muted/50 rounded-lg">
                                                                                    <QRCodeDisplay token={ticket.qrTokenHash} size={150} />
                                                                                </div>
                                                                            </details>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                <p className="text-xs text-center text-muted-foreground">
                                                                    Vis disse ved innsjekk
                                                                </p>
                                                            </div>
                                                        )
                                                    }
                                                    return null
                                                })()}

                                                {(eventReg.status === 'DRAFT' || eventReg.status === 'PENDING_PAYMENT') && eventReg.Order?.id && (
                                                    <div className="space-y-2">
                                                        <PayButton orderId={eventReg.Order.id} />
                                                        <CancelOrderButton orderId={eventReg.Order.id} />
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

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
                                        <CardTitle>{reg.CourseTrack.title}</CardTitle>
                                        <CardDescription>{reg.CoursePeriod.name}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span>Role:</span>
                                                    <span>{reg.chosenRole}</span>
                                                </div>
                                                {reg.Order && (
                                                    <div className="flex justify-between border-t pt-2">
                                                        <span>Total Paid/Due:</span>
                                                        <span>{reg.Order.totalCents / 100},-</span>
                                                    </div>
                                                )}
                                            </div>

                                {/* OFFER UI */}
                                {reg.WaitlistEntry?.status === 'OFFERED' && reg.WaitlistEntry.offeredUntil && (
                                    <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-md border border-orange-200 dark:border-orange-800 space-y-3">
                                        <div>
                                            <h4 className="font-bold text-orange-800 dark:text-orange-400">Spot Offered!</h4>
                                            <p className="text-xs text-orange-700 dark:text-orange-500">
                                                Expires {formatDistanceToNow(reg.WaitlistEntry.offeredUntil, { addSuffix: true })}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <AcceptOfferButton registrationId={reg.id} />
                                            <DeclineOfferButton registrationId={reg.id} />
                                        </div>
                                    </div>
                                )}

                                {(reg.status === 'DRAFT' || reg.status === 'PENDING_PAYMENT') && reg.Order?.id && (
                                    <div className="space-y-2">
                                        <PayButton orderId={reg.Order.id} />
                                        <CancelOrderButton orderId={reg.Order.id} />
                                    </div>
                                )}

                                {reg.status === 'ACTIVE' && (
                                    (() => {
                                        const ticket = tickets.find(t => t.periodId === reg.periodId)
                                        if (ticket) {
                                            return <TicketQR token={ticket.qrTokenHash} title={reg.CoursePeriod.name} />
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
                                                    slug: membership.tier.slug
                                                },
                                                organizer: {
                                                    name: membership.organizer.name
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
