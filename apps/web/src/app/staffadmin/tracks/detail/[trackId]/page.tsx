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
import { QrCode } from 'lucide-react'

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

    // Fetch the track with registrations
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

    const activeCount = track.Registration.filter(r => r.status === 'ACTIVE').length
    const waitlistCount = track.Registration.filter(r => r.status === 'WAITLIST').length
    const capacityPercent = Math.round((activeCount / track.capacityTotal) * 100)
    const availableSpots = track.capacityTotal - activeCount

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
                                <TableHead>Payment</TableHead>
                                <TableHead>Registered</TableHead>
                                <TableHead>Waitlist Info</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {track.Registration.map((reg) => (
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
                            ))}
                            {track.Registration.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
