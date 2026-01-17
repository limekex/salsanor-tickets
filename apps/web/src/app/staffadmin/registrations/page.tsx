import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
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
import { format } from 'date-fns'
import { CancelRegistrationButton } from '@/components/cancel-registration-button'

const WEEKDAY_LABELS: Record<number, string> = {
    1: 'Monday',
    2: 'Tuesday', 
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
    7: 'Sunday'
}

function getStatusBadge(status: string) {
    const variants = {
        ACTIVE: 'success',
        PENDING_PAYMENT: 'warning',
        WAITLIST: 'warning',
        CANCELLED: 'destructive',
        DRAFT: 'outline',
    } as const

    return (
        <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
            {status.replace('_', ' ')}
        </Badge>
    )
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

export default async function StaffAdminRegistrationsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    // Get user's organization
    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: {
            UserAccountRole: {
                where: {
                    role: {
                        in: ['ORG_ADMIN', 'ORG_FINANCE']
                    }
                }
            }
        }
    })

    if (!userAccount?.UserAccountRole.length) {
        throw new Error('Unauthorized: You must be an organization admin or finance manager')
    }

    const organizerId = userAccount.UserAccountRole[0].organizerId!

    // Get all registrations for this organization
    const registrations = await prisma.registration.findMany({
        where: {
            CoursePeriod: {
                organizerId
            }
        },
        include: {
            PersonProfile: true,
            CoursePeriod: {
                select: {
                    id: true,
                    code: true,
                    name: true,
                    organizerId: true
                }
            },
            CourseTrack: {
                select: {
                    id: true,
                    title: true,
                    weekday: true,
                    timeStart: true,
                    levelLabel: true
                }
            },
            Order: {
                select: {
                    id: true,
                    totalCents: true,
                    status: true,
                    orderNumber: true
                }
            },
            WaitlistEntry: true
        },
        orderBy: {
            createdAt: 'desc'
        }
    })

    // Group by period for better overview
    const registrationsByPeriod = registrations.reduce((acc, reg) => {
        const periodKey = reg.CoursePeriod.code
        if (!acc[periodKey]) {
            acc[periodKey] = {
                period: reg.CoursePeriod,
                registrations: []
            }
        }
        acc[periodKey].registrations.push(reg)
        return acc
    }, {} as Record<string, { period: typeof registrations[0]['CoursePeriod'], registrations: typeof registrations }>)

    const totalActive = registrations.filter(r => r.status === 'ACTIVE').length
    const totalWaitlist = registrations.filter(r => r.status === 'WAITLIST').length
    const totalRevenue = registrations
        .filter(r => r.status === 'ACTIVE' && r.Order)
        .reduce((sum, r) => sum + (r.Order?.totalCents || 0), 0)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="rn-h2">Registrations</h2>
                    <p className="rn-meta text-rn-text-muted mt-1">Manage course registrations, cancellations, and waitlist</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-rn-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-rn-2">
                        <CardTitle className="rn-meta text-rn-text-muted">Active Registrations</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h1">{totalActive}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-rn-2">
                        <CardTitle className="rn-meta text-rn-text-muted">On Waitlist</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h1">{totalWaitlist}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-rn-2">
                        <CardTitle className="rn-meta text-rn-text-muted">Total Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h1">{(totalRevenue / 100).toFixed(0)} kr</div>
                    </CardContent>
                </Card>
            </div>

            {/* Registrations by Period */}
            {Object.entries(registrationsByPeriod).map(([periodKey, { period, registrations: periodRegs }]) => (
                <Card key={periodKey}>
                    <CardHeader>
                        <CardTitle>{period.name}</CardTitle>
                        <CardDescription>
                            Period Code: {period.code} • {periodRegs.length} registration{periodRegs.length !== 1 ? 's' : ''}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Participant</TableHead>
                                    <TableHead>Track</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Order</TableHead>
                                    <TableHead>Registered</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {periodRegs.map((reg) => (
                                    <TableRow key={reg.id}>
                                        <TableCell className="font-medium">
                                            <div>
                                                {reg.PersonProfile.firstName} {reg.PersonProfile.lastName}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {reg.PersonProfile.email}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{reg.CourseTrack.title}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {WEEKDAY_LABELS[reg.CourseTrack.weekday]} {reg.CourseTrack.timeStart}
                                                    {reg.CourseTrack.levelLabel && ` • ${reg.CourseTrack.levelLabel}`}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {getRoleBadge(reg.chosenRole)}
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(reg.status)}
                                            {reg.cancelledAt && (
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    Cancelled {format(reg.cancelledAt, 'MMM d, yyyy')}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {reg.Order && (
                                                <div>
                                                    <div className="text-sm font-medium">
                                                        {(reg.Order.totalCents / 100).toFixed(0)} kr
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
                                            {format(reg.createdAt, 'MMM d, yyyy')}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button asChild variant="ghost" size="sm">
                                                    <Link href={`/staffadmin/tracks/detail/${reg.trackId}`}>
                                                        View Track
                                                    </Link>
                                                </Button>
                                                {reg.status !== 'CANCELLED' && (
                                                    <CancelRegistrationButton
                                                        registrationId={reg.id}
                                                        participantName={`${reg.PersonProfile.firstName} ${reg.PersonProfile.lastName}`}
                                                        courseName={`${period.name} - ${reg.CourseTrack.title}`}
                                                    />
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {periodRegs.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            No registrations for this period yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            ))}

            {registrations.length === 0 && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <p className="text-muted-foreground">No registrations yet. Create your first course period to get started.</p>
                        <Button asChild className="mt-4">
                            <Link href="/staffadmin/periods/new">Create Period</Link>
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
