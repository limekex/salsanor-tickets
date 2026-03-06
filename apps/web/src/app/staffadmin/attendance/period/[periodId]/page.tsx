import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import Link from 'next/link'
import { ArrowLeft, Users, CalendarDays, TrendingUp, BarChart3, Calendar } from 'lucide-react'
import { getPeriodDetailStats } from '@/app/actions/attendance-stats'
import { requireOrgFinance } from '@/utils/auth-org-finance'

const weekdayNames = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(date))
}

function formatShortDate(date: Date): string {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(date))
}

function getAttendanceBadgeVariant(rate: number): 'default' | 'secondary' | 'destructive' {
    if (rate >= 80) return 'default'
    if (rate >= 50) return 'secondary'
    return 'destructive'
}

function getAttendanceColor(rate: number): string {
    if (rate >= 80) return 'bg-green-500'
    if (rate >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
}

export default async function PeriodDetailPage({ 
    params 
}: { 
    params: Promise<{ periodId: string }> 
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    await requireOrgFinance()
    
    const { periodId } = await params
    const stats = await getPeriodDetailStats(periodId)

    if (!stats) {
        notFound()
    }

    return (
        <div className="space-y-rn-6">
            {/* Header */}
            <div className="flex items-center gap-rn-4">
                <Button asChild variant="ghost" size="sm">
                    <Link href="/staffadmin/attendance">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Overview
                    </Link>
                </Button>
            </div>

            <div>
                <h1 className="rn-h1">{stats.periodName}</h1>
                <p className="rn-meta text-rn-text-muted">
                    {formatDate(stats.startDate)} – {formatDate(stats.endDate)} • {stats.organizerName}
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-rn-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Avg Attendance</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.averageAttendance}%</div>
                        <div className="mt-1 h-2 bg-secondary rounded-full overflow-hidden">
                            <div 
                                className={`h-full ${getAttendanceColor(stats.averageAttendance)}`}
                                style={{ width: `${stats.averageAttendance}%` }}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Check-ins</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalCheckIns}</div>
                        <p className="text-xs text-muted-foreground">this period</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Registrations</CardTitle>
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalRegistrations}</div>
                        <p className="text-xs text-muted-foreground">active participants</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Tracks</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalTracks}</div>
                        <p className="text-xs text-muted-foreground">course tracks</p>
                    </CardContent>
                </Card>
            </div>

            {/* Track Comparison */}
            <Card>
                <CardHeader>
                    <CardTitle>Track Comparison</CardTitle>
                    <CardDescription>Attendance rates across all tracks in this period</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Track</TableHead>
                                <TableHead>Day</TableHead>
                                <TableHead className="text-right">Registrations</TableHead>
                                <TableHead className="text-right">Sessions</TableHead>
                                <TableHead className="text-right">Check-ins</TableHead>
                                <TableHead className="text-right">Attendance</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stats.trackSummaries.map(track => (
                                <TableRow key={track.trackId}>
                                    <TableCell className="font-medium">{track.trackTitle}</TableCell>
                                    <TableCell>{weekdayNames[track.weekday]}</TableCell>
                                    <TableCell className="text-right">{track.registrations}</TableCell>
                                    <TableCell className="text-right">{track.sessionsCompleted}</TableCell>
                                    <TableCell className="text-right">{track.totalCheckIns}</TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant={getAttendanceBadgeVariant(track.averageAttendance)}>
                                            {track.averageAttendance}%
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Button asChild variant="ghost" size="sm">
                                            <Link href={`/staffadmin/attendance/${track.trackId}`}>
                                                Details
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Week by Week Breakdown */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        <div>
                            <CardTitle>Week-by-Week Breakdown</CardTitle>
                            <CardDescription>Attendance for each week of the period</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {stats.weeks.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                            No sessions have occurred yet.
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {stats.weeks.map(week => (
                                <div key={week.weekNumber} className="border rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <h4 className="font-medium">Week {week.weekNumber}</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {formatShortDate(week.weekStart)} – {formatShortDate(week.weekEnd)}
                                            </p>
                                        </div>
                                        <Badge variant={getAttendanceBadgeVariant(week.overallRate)}>
                                            {week.overallRate}% ({week.totalActual}/{week.totalExpected})
                                        </Badge>
                                    </div>
                                    
                                    {/* Track bars for this week */}
                                    <div className="space-y-2">
                                        {week.tracks.filter(t => t.sessionDate).map(track => (
                                            <div key={track.trackId} className="flex items-center gap-3">
                                                <span className="text-sm w-32 truncate">{track.trackTitle}</span>
                                                <div className="flex-1 h-4 bg-secondary rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full ${getAttendanceColor(track.attendanceRate)} transition-all`}
                                                        style={{ width: `${track.attendanceRate}%` }}
                                                    />
                                                </div>
                                                <span className="text-sm text-muted-foreground w-16 text-right">
                                                    {track.actual}/{track.expected}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
