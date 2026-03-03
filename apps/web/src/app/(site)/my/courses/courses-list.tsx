'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TicketQR } from '@/components/ticket-qr'
import { WalletButtons } from '@/components/wallet-buttons'
import { PayButton } from '@/components/pay-button'
import { CancelOrderButton } from '@/app/(site)/profile/cancel-order-button'
import { AcceptOfferButton, DeclineOfferButton } from '@/app/(site)/profile/offer-buttons'
import { formatDateShort, formatPrice, formatRelativeTime } from '@/lib/formatters'
import { UI_TEXT } from '@/lib/i18n'
import { EyeOff, Eye, TrendingUp, CheckCircle2 } from 'lucide-react'

type Registration = {
    id: string
    periodId: string
    status: string
    chosenRole: string
    createdAt: Date | string
    CourseTrack: { id: string; title: string }
    CoursePeriod: { id: string; name: string; startDate: Date | string; endDate: Date | string; weekday?: number }
    Order: { id: string; totalCents: number } | null
    WaitlistEntry: { status: string; offeredUntil: Date | string | null } | null
    attendance: { sessionDate: Date | string }[]
}

type Ticket = {
    id: string
    periodId: string
    qrTokenHash: string
    status: string
}

interface CoursesListProps {
    registrations: Registration[]
    tickets: Ticket[]
    totalSessions: number
    attendedSessions: number
}

export function CoursesList({ registrations, tickets, totalSessions, attendedSessions }: CoursesListProps) {
    const [showCanceled, setShowCanceled] = useState(false)

    const inactiveStatuses = ['CANCELLED', 'REFUNDED']
    const hasInactive = registrations.some(r => inactiveStatuses.includes(r.status))

    const visibleRegistrations = showCanceled
        ? registrations
        : registrations.filter(r => !inactiveStatuses.includes(r.status))

    const attendanceRate = totalSessions > 0
        ? Math.round((attendedSessions / totalSessions) * 100)
        : null

    return (
        <div className="space-y-rn-6">
            {/* Attendance stats summary */}
            {attendedSessions > 0 && (
                <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="pt-4 pb-4">
                        <div className="flex items-center gap-3">
                            <TrendingUp className="h-5 w-5 text-primary shrink-0" />
                            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                                <span className="flex items-center gap-1.5">
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    <strong>{attendedSessions}</strong>
                                    {attendedSessions === 1 ? ' session attended' : ' sessions attended'}
                                </span>
                                {attendanceRate !== null && (
                                    <span className="text-muted-foreground">
                                        {attendanceRate}% attendance rate across all active courses
                                    </span>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Hide/show canceled toggle */}
            {hasInactive && (
                <div className="flex justify-end">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCanceled(v => !v)}
                        className="gap-1.5 text-muted-foreground"
                    >
                        {showCanceled ? (
                            <>
                                <EyeOff className="h-4 w-4" />
                                Hide canceled
                            </>
                        ) : (
                            <>
                                <Eye className="h-4 w-4" />
                                Show canceled ({registrations.filter(r => inactiveStatuses.includes(r.status)).length})
                            </>
                        )}
                    </Button>
                </div>
            )}

            {/* Course cards */}
            <div className="grid gap-rn-6 md:grid-cols-2">
                {visibleRegistrations.map((reg) => {
                    const attended = reg.attendance.length
                    return (
                        <Card key={reg.id}>
                            <CardHeader>
                                <div className="flex justify-between">
                                    <Badge variant={reg.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                        {reg.status}
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">
                                        {formatDateShort(reg.createdAt)}
                                    </span>
                                </div>
                                <CardTitle>{reg.CourseTrack.title}</CardTitle>
                                <CardDescription>{reg.CoursePeriod.name}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span>{UI_TEXT.courses.role}</span>
                                            <span>{reg.chosenRole}</span>
                                        </div>
                                        {reg.status === 'ACTIVE' && attended > 0 && (
                                            <div className="flex justify-between text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                                    Sessions attended
                                                </span>
                                                <span className="font-medium">{attended}</span>
                                            </div>
                                        )}
                                        {reg.Order && (
                                            <div className="flex justify-between border-t pt-2">
                                                <span>{UI_TEXT.courses.totalPaid}</span>
                                                <span>{formatPrice(reg.Order.totalCents)}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* OFFER UI */}
                                    {reg.WaitlistEntry?.status === 'OFFERED' && reg.WaitlistEntry.offeredUntil && (
                                        <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-md border border-orange-200 dark:border-orange-800 space-y-3">
                                            <div>
                                                <h4 className="font-bold text-orange-800 dark:text-orange-400">{UI_TEXT.waitlist.spotOffered}</h4>
                                                <p className="text-xs text-orange-700 dark:text-orange-500">
                                                    {UI_TEXT.waitlist.expires} {formatRelativeTime(reg.WaitlistEntry.offeredUntil)}
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
                                                return (
                                                    <div className="space-y-4">
                                                        <TicketQR token={ticket.qrTokenHash} title={reg.CoursePeriod.name} />
                                                        <WalletButtons ticketId={ticket.id} type="course" />
                                                    </div>
                                                )
                                            }
                                            return null
                                        })()
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
