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
import { ArrowLeft, Download, Mail, Users } from 'lucide-react'
import { formatDateShort, formatWeekday } from '@/lib/formatters'
import { COURSE_TEMPLATE_LABELS } from '@/types/custom-fields'
import type { CourseTemplateType } from '@salsanor/database'

export default async function TrackParticipantsPage({ 
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
                    Order: {
                        select: {
                            id: true,
                            orderNumber: true,
                            status: true,
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            }
        }
    })

    if (!track) {
        notFound()
    }

    // Verify user has ORG_ADMIN access
    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: {
            UserAccountRole: {
                where: {
                    role: 'ORG_ADMIN',
                    organizerId: track.CoursePeriod.organizerId
                }
            }
        }
    })

    if (!userAccount?.UserAccountRole.length) {
        throw new Error('Unauthorized: You do not have access to this track')
    }

    const isPartner = track.templateType === 'PARTNER'
    const leaders = track.Registration.filter(r => r.chosenRole === 'LEADER')
    const followers = track.Registration.filter(r => r.chosenRole === 'FOLLOWER')

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button asChild variant="ghost" size="icon">
                    <Link href={`/staffadmin/periods/${track.periodId}/tracks`}>
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <h2 className="text-3xl font-bold tracking-tight">{track.title} - Participants</h2>
                    <p className="text-muted-foreground">
                        {track.CoursePeriod.name} • {formatWeekday(track.weekday)} {track.timeStart.slice(0, 5)}
                    </p>
                </div>
                <Button variant="outline" asChild>
                    <Link href={`/staffadmin/tracks/${trackId}`}>
                        Edit Track
                    </Link>
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Template</CardDescription>
                        <CardTitle className="text-lg">
                            {COURSE_TEMPLATE_LABELS[track.templateType as CourseTemplateType]}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total Registrations</CardDescription>
                        <CardTitle className="text-2xl flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            {track.Registration.length} / {track.capacityTotal}
                        </CardTitle>
                    </CardHeader>
                </Card>
                {isPartner && (
                    <>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>Leaders</CardDescription>
                                <CardTitle className="text-2xl">
                                    {leaders.length} / {track.capacityLeaders || '∞'}
                                </CardTitle>
                            </CardHeader>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>Followers</CardDescription>
                                <CardTitle className="text-2xl">
                                    {followers.length} / {track.capacityFollowers || '∞'}
                                </CardTitle>
                            </CardHeader>
                        </Card>
                    </>
                )}
            </div>

            {/* Participants Table */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Participants ({track.Registration.length})</CardTitle>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" disabled>
                                <Mail className="h-4 w-4 mr-2" />
                                Email All
                            </Button>
                            <Button variant="outline" size="sm" disabled>
                                <Download className="h-4 w-4 mr-2" />
                                Export CSV
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Phone</TableHead>
                                {isPartner && <TableHead>Role</TableHead>}
                                <TableHead>Order</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Registered</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {track.Registration.map((reg) => (
                                <TableRow key={reg.id}>
                                    <TableCell className="font-medium">
                                        {reg.PersonProfile?.firstName} {reg.PersonProfile?.lastName}
                                    </TableCell>
                                    <TableCell>
                                        <a 
                                            href={`mailto:${reg.PersonProfile?.email}`}
                                            className="text-primary hover:underline"
                                        >
                                            {reg.PersonProfile?.email}
                                        </a>
                                    </TableCell>
                                    <TableCell>
                                        {reg.PersonProfile?.phone || '-'}
                                    </TableCell>
                                    {isPartner && (
                                        <TableCell>
                                            <Badge variant={reg.chosenRole === 'LEADER' ? 'default' : 'secondary'}>
                                                {reg.chosenRole}
                                            </Badge>
                                        </TableCell>
                                    )}
                                    <TableCell>
                                        {reg.Order ? (
                                            <Link 
                                                href={`/staffadmin/orders/${reg.Order.id}`}
                                                className="text-primary hover:underline text-sm"
                                            >
                                                #{reg.Order.orderNumber}
                                            </Link>
                                        ) : '-'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge 
                                            variant={
                                                reg.status === 'ACTIVE' ? 'default' :
                                                reg.status === 'WAITLIST' ? 'secondary' :
                                                reg.status === 'CANCELLED' ? 'destructive' :
                                                'outline'
                                            }
                                        >
                                            {reg.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {formatDateShort(reg.createdAt)}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {track.Registration.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={isPartner ? 7 : 6} className="text-center py-8 text-muted-foreground">
                                        No participants registered yet.
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
