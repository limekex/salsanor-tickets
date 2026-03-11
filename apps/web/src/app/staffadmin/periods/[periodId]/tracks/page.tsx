import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import Link from 'next/link'
import { ArrowLeft, Plus, QrCode } from 'lucide-react'
import { formatDateRange, formatPrice, formatWeekday } from '@/lib/formatters'
import { COURSE_TEMPLATE_LABELS } from '@/types/custom-fields'
import type { CourseTemplateType } from '@salsanor/database'

export default async function StaffAdminTracksPage({ 
    params 
}: { 
    params: Promise<{ periodId: string }> 
}) {
    const { periodId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    // Get user's organizations where they have ORG_ADMIN role
    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: {
            UserAccountRole: {
                where: {
                    role: 'ORG_ADMIN'
                },
                include: {
                    Organizer: true
                }
            }
        }
    })

    const adminOrgIds = userAccount?.UserAccountRole.map(r => r.organizerId).filter(Boolean) || []

    if (adminOrgIds.length === 0) {
        redirect('/dashboard')
    }

    // Fetch the period with tracks
    const period = await prisma.coursePeriod.findUnique({
        where: { id: periodId },
        include: {
            Organizer: true,
            CourseTrack: {
                include: {
                    _count: {
                        select: {
                            Registration: true
                        }
                    }
                },
                orderBy: {
                    title: 'asc'
                }
            }
        }
    })

    if (!period) {
        notFound()
    }

    // Verify user has access to this period's organizer
    if (!adminOrgIds.includes(period.organizerId)) {
        throw new Error('Unauthorized: You do not have access to this period')
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button asChild variant="ghost" size="icon">
                    <Link href="/staffadmin/periods">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <h2 className="text-3xl font-bold tracking-tight">{period.name} - Tracks</h2>
                    <p className="text-muted-foreground">{period.Organizer.name} • {period.code}</p>
                </div>
                <Button asChild>
                    <Link href={`/staffadmin/tracks/new?periodId=${periodId}`}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Track
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Period Information</CardTitle>
                    <CardDescription>
                        {formatDateRange(period.startDate, period.endDate)}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <p className="text-sm font-medium">Location</p>
                            <p className="text-sm text-muted-foreground">
                                {period.locationName ? `${period.locationName}, ${period.city}` : period.city}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm font-medium">Sales Status</p>
                            <p className="text-sm text-muted-foreground">
                                {period.salesOpenAt < new Date() && period.salesCloseAt > new Date() ? (
                                    <Badge className="bg-green-600">Open</Badge>
                                ) : (
                                    <Badge variant="secondary">Closed</Badge>
                                )}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Course Tracks ({period.CourseTrack.length})</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Template</TableHead>
                                <TableHead>Level</TableHead>
                                <TableHead>Schedule</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead>Capacity</TableHead>
                                <TableHead>Registrations</TableHead>
                                <TableHead>Self Check-in</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {period.CourseTrack.map((track) => {
                                return (
                                    <TableRow key={track.id}>
                                        <TableCell className="font-medium">{track.title}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="text-xs">
                                                {COURSE_TEMPLATE_LABELS[track.templateType as CourseTemplateType] || track.templateType}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {track.levelLabel || 'Standard'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {formatWeekday(track.weekday)} {track.timeStart.slice(0, 5)}
                                        </TableCell>
                                        <TableCell>{formatPrice(track.priceSingleCents)}</TableCell>
                                        <TableCell>
                                            {track.capacityLeaders && track.capacityFollowers 
                                                ? `${track.capacityLeaders}/${track.capacityFollowers}` 
                                                : track.capacityTotal}
                                        </TableCell>
                                        <TableCell>
                                            <Link 
                                                href={`/staffadmin/tracks/${track.id}/participants`}
                                                className="hover:underline"
                                            >
                                                <Badge variant={track._count.Registration >= track.capacityTotal ? 'destructive' : 'secondary'}>
                                                    {track._count.Registration}
                                                </Badge>
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            {track.allowSelfCheckIn ? (
                                                <Button asChild variant="outline" size="sm">
                                                    <Link href={`/selfcheckin?trackId=${track.id}`} target="_blank">
                                                        <QrCode className="h-4 w-4 mr-1" />
                                                        Open
                                                    </Link>
                                                </Button>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">Disabled</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button asChild variant="ghost" size="sm">
                                                <Link href={`/staffadmin/tracks/${track.id}`}>Edit</Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                            {period.CourseTrack.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                        No tracks found. Create one to get started.
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
