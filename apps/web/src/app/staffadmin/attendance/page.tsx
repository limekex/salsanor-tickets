import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
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
import { ArrowLeft, Users, CalendarDays, TrendingUp, BarChart3 } from 'lucide-react'
import { getOrganizerAttendanceOverview } from '@/app/actions/attendance-stats'
import { getSelectedOrganizerForFinance, requireOrgFinance } from '@/utils/auth-org-finance'

const weekdayNames = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(date))
}

function getAttendanceBadgeVariant(rate: number): 'default' | 'secondary' | 'destructive' {
    if (rate >= 80) return 'default'
    if (rate >= 50) return 'secondary'
    return 'destructive'
}

export default async function AttendanceDashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    // Validate access
    await requireOrgFinance()
    const organizerId = await getSelectedOrganizerForFinance()

    const periodStats = await getOrganizerAttendanceOverview(organizerId)

    // Calculate totals across all periods
    const totalCheckIns = periodStats.reduce((sum, p) => sum + p.totalCheckIns, 0)
    const totalRegistrations = periodStats.reduce((sum, p) => sum + p.totalRegistrations, 0)
    const totalTracks = periodStats.reduce((sum, p) => sum + p.totalTracks, 0)

    return (
        <div className="space-y-rn-6">
            {/* Header */}
            <div className="flex items-center gap-rn-4">
                <Button asChild variant="ghost" size="sm">
                    <Link href="/staffadmin">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Link>
                </Button>
            </div>

            <div>
                <h1 className="rn-h1">Attendance Dashboard</h1>
                <p className="rn-meta text-rn-text-muted">
                    Track attendance across all your course periods
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-rn-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Check-ins</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalCheckIns}</div>
                        <p className="text-xs text-muted-foreground">all time</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Active Registrations</CardTitle>
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalRegistrations}</div>
                        <p className="text-xs text-muted-foreground">across all periods</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Active Tracks</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalTracks}</div>
                        <p className="text-xs text-muted-foreground">course tracks</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Periods</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{periodStats.length}</div>
                        <p className="text-xs text-muted-foreground">total periods</p>
                    </CardContent>
                </Card>
            </div>

            {/* Period-by-Period Stats */}
            {periodStats.length === 0 ? (
                <Card>
                    <CardContent className="py-8 text-center">
                        <p className="text-muted-foreground">No periods found. Create a period to start tracking attendance.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-rn-6">
                    {periodStats.map(period => (
                        <Card key={period.periodId}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>{period.periodName}</CardTitle>
                                        <CardDescription>
                                            {formatDate(period.startDate)} – {formatDate(period.endDate)}
                                        </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge variant={getAttendanceBadgeVariant(period.averageAttendance)}>
                                            {period.averageAttendance}% avg attendance
                                        </Badge>
                                        <Button asChild variant="outline" size="sm">
                                            <Link href={`/staffadmin/attendance/period/${period.periodId}`}>
                                                Period Details
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {period.tracks.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No tracks in this period.</p>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Track</TableHead>
                                                <TableHead>Day</TableHead>
                                                <TableHead className="text-right">Registrations</TableHead>
                                                <TableHead className="text-right">Check-ins</TableHead>
                                                <TableHead className="text-right">Avg Attendance</TableHead>
                                                <TableHead></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {period.tracks.map(track => (
                                                <TableRow key={track.id}>
                                                    <TableCell className="font-medium">{track.title}</TableCell>
                                                    <TableCell>{weekdayNames[track.weekday]}</TableCell>
                                                    <TableCell className="text-right">{track.registrations}</TableCell>
                                                    <TableCell className="text-right">{track.checkIns}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant={getAttendanceBadgeVariant(track.averageAttendance)}>
                                                            {track.averageAttendance}%
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button asChild variant="ghost" size="sm">
                                                            <Link href={`/staffadmin/attendance/${track.id}`}>
                                                                View Details
                                                            </Link>
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
