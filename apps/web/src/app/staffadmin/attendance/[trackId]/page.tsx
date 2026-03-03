import { notFound } from 'next/navigation'
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
import { ArrowLeft, Users, CalendarDays, TrendingUp, CheckCircle2 } from 'lucide-react'
import { getTrackAttendanceStats, getTrackParticipantAttendance } from '@/app/actions/attendance-stats'
import { AttendanceExportButton } from './export-button'

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

export default async function TrackAttendanceDetailPage({ 
    params 
}: { 
    params: Promise<{ trackId: string }> 
}) {
    const { trackId } = await params
    
    const [stats, participants] = await Promise.all([
        getTrackAttendanceStats(trackId),
        getTrackParticipantAttendance(trackId)
    ])

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
                        Back to Dashboard
                    </Link>
                </Button>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="rn-h1">{stats.trackTitle}</h1>
                    <p className="rn-meta text-rn-text-muted">
                        {stats.periodName} • Attendance Statistics
                    </p>
                </div>
                <AttendanceExportButton 
                    trackId={trackId}
                    trackTitle={stats.trackTitle}
                    periodName={stats.periodName}
                />
            </div>

            {/* Summary Cards */}
            <div className="grid gap-rn-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Average Attendance</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.averageAttendance}%</div>
                        <p className="text-xs text-muted-foreground">across all sessions</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Registrations</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalRegistrations}</div>
                        <p className="text-xs text-muted-foreground">active participants</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Sessions</CardTitle>
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalSessions}</div>
                        <p className="text-xs text-muted-foreground">completed sessions</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Check-ins</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalCheckIns}</div>
                        <p className="text-xs text-muted-foreground">recorded</p>
                    </CardContent>
                </Card>
            </div>

            {/* Session-by-Session Stats */}
            <Card>
                <CardHeader>
                    <CardTitle>Session History</CardTitle>
                    <CardDescription>Attendance for each completed session</CardDescription>
                </CardHeader>
                <CardContent>
                    {stats.sessions.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            No sessions have occurred yet.
                        </p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {stats.sessions.map((session, idx) => (
                                <div 
                                    key={idx}
                                    className="flex flex-col items-center p-2 rounded-lg border bg-card min-w-[70px]"
                                >
                                    <span className="text-xs text-muted-foreground">
                                        {formatShortDate(session.date)}
                                    </span>
                                    <Badge variant={getAttendanceBadgeVariant(session.attendanceRate)} className="mt-1">
                                        {session.attendanceRate}%
                                    </Badge>
                                    <span className="text-xs mt-1">
                                        {session.actual}/{session.expected}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Participant Attendance Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Participant Attendance</CardTitle>
                    <CardDescription>Attendance rate per participant</CardDescription>
                </CardHeader>
                <CardContent>
                    {participants.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            No participants registered for this track.
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Participant</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead className="text-right">Attended</TableHead>
                                    <TableHead className="text-right">Total Sessions</TableHead>
                                    <TableHead className="text-right">Attendance</TableHead>
                                    <TableHead className="text-right">Last Check-in</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {participants.map(p => (
                                    <TableRow key={p.registrationId}>
                                        <TableCell className="font-medium">{p.personName}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{p.chosenRole}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">{p.totalAttended}</TableCell>
                                        <TableCell className="text-right">{p.totalSessions}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={getAttendanceBadgeVariant(p.attendanceRate)}>
                                                {p.attendanceRate}%
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground">
                                            {p.lastCheckIn ? formatDate(p.lastCheckIn) : '—'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
