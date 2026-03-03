import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { CancelRegistrationButton } from '@/components/cancel-registration-button'
import { PromoteFromWaitlistButton } from './promote-button'
import { formatWeekday, formatPrice, formatDateShort, formatRelativeTime } from '@/lib/formatters'
import { QrCode, TrendingUp, Users, BarChart3, AlertTriangle } from 'lucide-react'
import { NotifyLowAttendanceButton } from './notify-button'

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case 'ACTIVE': return <Badge variant="success">Active</Badge>
        case 'WAITLIST': return <Badge variant="warning">Waitlist</Badge>
        case 'DRAFT': return <Badge variant="outline">Draft</Badge>
        case 'CANCELLED': return <Badge variant="destructive">Cancelled</Badge>
        case 'PENDING_PAYMENT': return <Badge variant="warning">Pending Payment</Badge>
        default: return <Badge variant="outline">{status}</Badge>
    }
}

function getRoleBadge(role: string) {
    const colors = {
        LEADER: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        FOLLOWER: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
        ANY: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    } as const

    return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
            {role}
        </span>
    )
}

/** Number of weeks elapsed (= scheduled sessions so far) for a period up to today */
function weeksElapsed(startDate: Date, endDate: Date): number {
    const today = new Date()
    const end = endDate > today ? today : endDate
    if (startDate >= end) return 0
    return Math.max(Math.floor((end.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)), 0)
}

export default async function StaffAdminTrackDetailPage({ 
    params 
}: { 
    params: Promise<{ trackId: string }> 
}) {
    const { trackId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    // Fetch the track with registrations + attendance
    const track = await prisma.courseTrack.findUnique({
        where: { id: trackId },
        include: {
            CoursePeriod: {
                include: {
                    Organizer: true
                }
            },
            Registration: {
                include: {
                    PersonProfile: true,
                    WaitlistEntry: true,
                    Order: {
                        select: {
                            id: true,
                            totalCents: true,
                            orderNumber: true
                        }
                    },
                    Attendance: {
                        where: { cancelled: false },
                        select: { sessionDate: true, checkInTime: true, method: true }
                    }
                },
                orderBy: { createdAt: 'asc' }
            }
        }
    })

    if (!track) {
        notFound()
    }

    // Verify user has ORG_ADMIN or ORG_FINANCE access
    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: {
            UserAccountRole: {
                where: {
                    organizerId: track.CoursePeriod.organizerId,
                    role: {
                        in: ['ORG_ADMIN', 'ORG_FINANCE']
                    }
                }
            }
        }
    })

    if (!userAccount?.UserAccountRole.length) {
        throw new Error('Unauthorized: You do not have access to this track')
    }

    const activeRegistrations = track.Registration.filter(r => r.status === 'ACTIVE')
    const activeCount = activeRegistrations.length
    const waitlistCount = track.Registration.filter(r => r.status === 'WAITLIST').length
    const capacityPercent = Math.round((activeCount / track.capacityTotal) * 100)
    const availableSpots = track.capacityTotal - activeCount

    // -----------------------------------------------------------------------
    // ATTENDANCE ANALYTICS
    // -----------------------------------------------------------------------
    const totalScheduledSessions = weeksElapsed(
        track.CoursePeriod.startDate,
        track.CoursePeriod.endDate
    )

    // Aggregate all attendance records across active registrations
    const allAttendances = activeRegistrations.flatMap(r => r.Attendance)

    // Per-session breakdown: map sessionDate → count
    const sessionMap = new Map<string, number>()
    for (const a of allAttendances) {
        const key = a.sessionDate.toISOString().slice(0, 10)
        sessionMap.set(key, (sessionMap.get(key) ?? 0) + 1)
    }
    const sessionRows = Array.from(sessionMap.entries())
        .map(([date, count]) => ({ date, count, rate: activeCount > 0 ? Math.round((count / activeCount) * 100) : 0 }))
        .sort((a, b) => a.date.localeCompare(b.date))

    // Per-participant attendance counts (for augmenting the registrations table)
    const attendanceByReg = new Map<string, number>(
        track.Registration.map(r => [r.id, r.Attendance.length])
    )

    // Overall attendance rate across all active registrations
    const totalPossible = activeCount * totalScheduledSessions
    const totalAttended = activeRegistrations.reduce((s, r) => s + r.Attendance.length, 0)
    const overallRate = totalPossible > 0 ? Math.round((totalAttended / totalPossible) * 100) : null

    // Low-attendance participants (active, below 75%)
    const LOW_THRESHOLD = 0.75
    const lowAttendanceCount = totalScheduledSessions > 0
        ? activeRegistrations.filter(r => (r.Attendance.length / totalScheduledSessions) < LOW_THRESHOLD).length
        : 0

    // Build self check-in URL
    const headersList = await headers()
    const host = headersList.get('x-forwarded-host') || headersList.get('host') || 'localhost:3000'
    const protocol = headersList.get('x-forwarded-proto') || 'https'
    const selfCheckInUrl = `${protocol}://${host}/selfcheckin?trackId=${trackId}`

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-rn-3">
                        <h2 className="rn-h2">{track.title}</h2>
                        {track.levelLabel && (
                            <Badge variant="outline">{track.levelLabel}</Badge>
                        )}
                    </div>
                    <p className="rn-meta text-rn-text-muted mt-1">
                        {track.CoursePeriod.name} • {formatWeekday(track.weekday)} {track.timeStart} - {track.timeEnd}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button asChild variant="outline">
                        <Link href={`/staffadmin/tracks/${trackId}`}>Edit Track</Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link href="/staffadmin/registrations">Back to All Registrations</Link>
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-rn-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-rn-2">
                        <CardTitle className="rn-meta text-rn-text-muted">Capacity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h1">
                            {activeCount} / {track.capacityTotal}
                        </div>
                        <p className="rn-caption text-rn-text-muted mt-1">
                            {capacityPercent}% filled
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-rn-2">
                        <CardTitle className="rn-meta text-rn-text-muted">Available Spots</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h1">{availableSpots}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-rn-2">
                        <CardTitle className="rn-meta text-rn-text-muted">Waitlist</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h1">{waitlistCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-rn-2">
                        <CardTitle className="rn-meta text-rn-text-muted">Pricing</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h3">
                            {formatPrice(track.priceSingleCents)}
                        </div>
                        {track.pricePairCents && (
                            <p className="rn-caption text-rn-text-muted">
                                Pair: {formatPrice(track.pricePairCents)}
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Self Check-in */}
            {track.allowSelfCheckIn && (
                <Card className="border-primary/30 bg-primary/5">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <QrCode className="h-4 w-4 text-primary" />
                            Self Check-in Enabled
                        </CardTitle>
                        <CardDescription>
                            Participants can check themselves in by scanning this link or entering their phone number.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 flex-wrap">
                            <code className="text-xs bg-muted px-2 py-1 rounded break-all">{selfCheckInUrl}</code>
                            <Button asChild size="sm" variant="outline">
                                <Link href={selfCheckInUrl} target="_blank" rel="noopener noreferrer">
                                    Open
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ---------------------------------------------------------------- */}
            {/* ATTENDANCE ANALYTICS                                              */}
            {/* ---------------------------------------------------------------- */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                            <TrendingUp className="h-4 w-4" />
                            Overall Attendance Rate
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {overallRate !== null ? `${overallRate}%` : '—'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {totalAttended} check-ins / {totalPossible} possible
                            {totalScheduledSessions > 0 && ` (${totalScheduledSessions} sessions so far)`}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                            <BarChart3 className="h-4 w-4" />
                            Sessions Recorded
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{sessionRows.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            of {totalScheduledSessions} scheduled sessions
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            Low Attendance (&lt;75%)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{lowAttendanceCount}</div>
                        <div className="flex items-center gap-2 mt-2">
                            <p className="text-xs text-muted-foreground">of {activeCount} active participants</p>
                            {lowAttendanceCount > 0 && totalScheduledSessions > 0 && (
                                <NotifyLowAttendanceButton trackId={trackId} lowCount={lowAttendanceCount} />
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Per-session breakdown */}
            {sessionRows.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <BarChart3 className="h-4 w-4" />
                            Session Breakdown
                        </CardTitle>
                        <CardDescription>Attendance count per class session</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Session Date</TableHead>
                                    <TableHead className="text-right">Check-ins</TableHead>
                                    <TableHead className="text-right">Rate</TableHead>
                                    <TableHead>Bar</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sessionRows.map(row => (
                                    <TableRow key={row.date}>
                                        <TableCell>{new Date(row.date).toLocaleDateString('en-GB', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</TableCell>
                                        <TableCell className="text-right font-medium">{row.count}</TableCell>
                                        <TableCell className="text-right">{row.rate}%</TableCell>
                                        <TableCell>
                                            <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary rounded-full"
                                                    style={{ width: `${row.rate}%` }}
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Registrations Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Registrations ({track.Registration.length})</CardTitle>
                    <CardDescription>
                        All registrations for this track including active, waitlist, and cancelled
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Attendance</TableHead>
                                <TableHead>Payment</TableHead>
                                <TableHead>Registered</TableHead>
                                <TableHead>Waitlist Info</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {track.Registration.map((reg) => {
                                const attended = attendanceByReg.get(reg.id) ?? 0
                                const rate = totalScheduledSessions > 0 && reg.status === 'ACTIVE'
                                    ? Math.round((attended / totalScheduledSessions) * 100)
                                    : null
                                return (
                                    <TableRow key={reg.id}>
                                        <TableCell className="font-medium">
                                            <div>
                                                {reg.PersonProfile.firstName} {reg.PersonProfile.lastName}
                                            </div>
                                            <div className="text-xs text-muted-foreground">{reg.PersonProfile.email}</div>
                                        </TableCell>
                                        <TableCell>
                                            {getRoleBadge(reg.chosenRole)}
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={reg.status} />
                                            {reg.cancelledAt && (
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    {formatDateShort(reg.cancelledAt)}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {reg.status === 'ACTIVE' ? (
                                                <div>
                                                    <span className="font-medium">{attended}</span>
                                                    {totalScheduledSessions > 0 && (
                                                        <span className="text-xs text-muted-foreground">
                                                            {' '}/ {totalScheduledSessions}
                                                        </span>
                                                    )}
                                                    {rate !== null && (
                                                        <div className={`text-xs mt-0.5 ${rate < 75 ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
                                                            {rate}%{rate < 75 ? ' ⚠' : ''}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {reg.Order && (
                                                <div>
                                                    <div className="text-sm font-medium">
                                                        {formatPrice(reg.Order.totalCents)}
                                                    </div>
                                                    {reg.Order.orderNumber && (
                                                        <div className="text-xs text-muted-foreground">
                                                            #{reg.Order.orderNumber}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {formatDateShort(reg.createdAt)}
                                        </TableCell>
                                        <TableCell>
                                            {reg.WaitlistEntry && (
                                                <div className="text-sm">
                                                    {reg.WaitlistEntry.status === 'OFFERED' && (
                                                        <span className="text-orange-600 font-semibold">
                                                            Expires {formatRelativeTime(reg.WaitlistEntry.offeredUntil!)}
                                                        </span>
                                                    )}
                                                    {reg.WaitlistEntry.status === 'EXPIRED' && (
                                                        <span className="text-red-500">Offer Expired</span>
                                                    )}
                                                    {reg.WaitlistEntry.status === 'ON_WAITLIST' && (
                                                        <span className="text-muted-foreground">Waiting</span>
                                                    )}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {reg.status === 'WAITLIST' && reg.WaitlistEntry?.status === 'ON_WAITLIST' && availableSpots > 0 && (
                                                    <PromoteFromWaitlistButton registrationId={reg.id} />
                                                )}
                                                {reg.status !== 'CANCELLED' && reg.status !== 'WAITLIST' && (
                                                    <CancelRegistrationButton
                                                        registrationId={reg.id}
                                                        participantName={`${reg.PersonProfile.firstName} ${reg.PersonProfile.lastName}`}
                                                        courseName={`${track.CoursePeriod.name} - ${track.title}`}
                                                    />
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                            {track.Registration.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                        No registrations yet for this track.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
