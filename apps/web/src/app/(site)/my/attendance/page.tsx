import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft, BarChart3, CheckCircle2, XCircle, CalendarDays, CalendarOff, TrendingUp } from 'lucide-react'
import { UI_TEXT } from '@/lib/i18n'
import { formatDateShort } from '@/lib/formatters'

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function getWeekdayName(weekday: number): string {
    return WEEKDAY_NAMES[weekday] ?? 'Unknown'
}

function getProgressBarColor(rate: number): string {
    if (rate >= 80) return 'bg-green-500'
    if (rate >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
}

export default async function MyAttendancePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    // Fetch user account with all course registrations and attendance
    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: {
            PersonProfile: {
                include: {
                    Registration: {
                        where: { status: 'ACTIVE' },
                        include: {
                            CourseTrack: true,
                            CoursePeriod: {
                                include: { PeriodBreak: true }
                            },
                            Attendance: {
                                where: { cancelled: false },
                                orderBy: { sessionDate: 'desc' }
                            },
                            PlannedAbsence: {
                                where: { sessionDate: { gte: new Date() } },
                                orderBy: { sessionDate: 'asc' }
                            }
                        },
                        orderBy: { createdAt: 'desc' }
                    }
                }
            }
        }
    })

    if (!userAccount?.PersonProfile) {
        redirect('/onboarding')
    }

    const registrations = userAccount.PersonProfile.Registration || []

    // Calculate stats for each registration
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const registrationStats = registrations.map(reg => {
        const period = reg.CoursePeriod
        const track = reg.CourseTrack
        const periodStart = new Date(period.startDate)
        const periodEnd = new Date(period.endDate)
        const refDate = periodEnd > today ? today : periodEnd

        // Calculate weeks elapsed (sessions held)
        let weeksElapsed = 0
        if (periodStart < refDate) {
            const current = new Date(periodStart)
            while (current <= refDate) {
                const jsDay = current.getDay()
                const isoDay = jsDay === 0 ? 7 : jsDay
                if (isoDay === track.weekday) {
                    // Check if not a break
                    const isBreak = period.PeriodBreak.some(b => {
                        const breakStart = new Date(b.startDate)
                        const breakEnd = new Date(b.endDate)
                        return current >= breakStart && current <= breakEnd
                    })
                    if (!isBreak) weeksElapsed++
                }
                current.setDate(current.getDate() + 1)
            }
        }

        // Calculate upcoming sessions
        let upcomingSessions = 0
        const futureStart = new Date(today)
        futureStart.setDate(futureStart.getDate() + 1)
        const futureCheck = new Date(futureStart)
        while (futureCheck <= periodEnd) {
            const jsDay = futureCheck.getDay()
            const isoDay = jsDay === 0 ? 7 : jsDay
            if (isoDay === track.weekday) {
                const isBreak = period.PeriodBreak.some(b => {
                    const breakStart = new Date(b.startDate)
                    const breakEnd = new Date(b.endDate)
                    return futureCheck >= breakStart && futureCheck <= breakEnd
                })
                if (!isBreak) upcomingSessions++
            }
            futureCheck.setDate(futureCheck.getDate() + 1)
        }

        const totalAttended = reg.Attendance.length
        const attendanceRate = weeksElapsed > 0 ? Math.round((totalAttended / weeksElapsed) * 100) : 0
        const isOngoing = periodStart <= today && periodEnd >= today
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const plannedAbsences = (reg as any).PlannedAbsence?.length ?? 0

        return {
            id: reg.id,
            trackTitle: track.title,
            periodName: period.name,
            weekday: track.weekday,
            totalAttended,
            totalSessions: weeksElapsed,
            upcomingSessions,
            attendanceRate,
            isOngoing,
            plannedAbsences,
            lastCheckIn: reg.Attendance[0]?.sessionDate || null,
            checkInHistory: reg.Attendance.slice(0, 5) // Last 5 check-ins
        }
    })

    // Overall stats
    const totalAttendedAll = registrationStats.reduce((sum, r) => sum + r.totalAttended, 0)
    const totalSessionsAll = registrationStats.reduce((sum, r) => sum + r.totalSessions, 0)
    const totalPlannedAbsences = registrationStats.reduce((sum, r) => sum + r.plannedAbsences, 0)
    const overallRate = totalSessionsAll > 0 ? Math.round((totalAttendedAll / totalSessionsAll) * 100) : 0

    return (
        <main className="container mx-auto py-rn-7 px-rn-4">
            <div className="max-w-5xl mx-auto space-y-rn-6">
                {/* Header */}
                <div className="flex items-center gap-rn-4 mb-rn-6">
                    <Button asChild variant="ghost" size="sm">
                        <Link href="/my">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            {UI_TEXT.common.backToPortal}
                        </Link>
                    </Button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-rn-6">
                    <div>
                        <h1 className="rn-h1 flex items-center gap-2">
                            <BarChart3 className="h-8 w-8" />
                            Attendance Overview
                        </h1>
                        <p className="rn-meta text-rn-text-muted">
                            Track your course attendance across all registrations
                        </p>
                    </div>
                </div>

                {/* Overall Stats Card */}
                {totalSessionsAll > 0 && (
                    <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
                        <CardContent className="pt-6">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-full bg-primary/20">
                                        <TrendingUp className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Overall Attendance</p>
                                        <p className="text-3xl font-bold">{overallRate}%</p>
                                    </div>
                                </div>
                                <div className={`grid gap-6 text-center ${totalPlannedAbsences > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
                                    <div>
                                        <p className="text-2xl font-bold text-green-600">{totalAttendedAll}</p>
                                        <p className="text-xs text-muted-foreground">Sessions Attended</p>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{totalSessionsAll}</p>
                                        <p className="text-xs text-muted-foreground">Total Sessions</p>
                                    </div>
                                    {totalPlannedAbsences > 0 && (
                                        <div>
                                            <p className="text-2xl font-bold text-orange-500">{totalPlannedAbsences}</p>
                                            <p className="text-xs text-muted-foreground">Planned Absences</p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-2xl font-bold text-blue-600">{registrationStats.filter(r => r.isOngoing).length}</p>
                                        <p className="text-xs text-muted-foreground">Active Courses</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Course Attendance Cards */}
                {registrationStats.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">No active course registrations found.</p>
                            <Button asChild className="mt-4">
                                <Link href="/courses">Browse Courses</Link>
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-rn-4">
                        {registrationStats.map((stat) => (
                            <Card key={stat.id} className={stat.isOngoing ? 'border-primary/30' : ''}>
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="flex items-center gap-2">
                                                {stat.trackTitle}
                                                {stat.isOngoing && (
                                                    <Badge variant="outline" className="text-xs">Active</Badge>
                                                )}
                                            </CardTitle>
                                            <CardDescription className="flex items-center gap-2 mt-1">
                                                {stat.periodName}
                                                <span className="text-xs">•</span>
                                                <Badge variant="secondary" className="text-xs">{getWeekdayName(stat.weekday)}</Badge>
                                            </CardDescription>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-bold">{stat.attendanceRate}%</p>
                                            <p className="text-xs text-muted-foreground">Attendance</p>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {/* Progress Bar */}
                                    <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
                                        <div 
                                            className={`h-full rounded-full transition-all ${getProgressBarColor(stat.attendanceRate)}`}
                                            style={{ width: `${Math.min(stat.attendanceRate, 100)}%` }}
                                        />
                                    </div>

                                    {/* Stats Grid */}
                                    <div className={`grid gap-4 text-center text-sm mb-4 ${stat.plannedAbsences > 0 ? 'grid-cols-5' : 'grid-cols-4'}`}>
                                        <div>
                                            <div className="flex justify-center mb-1">
                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                            </div>
                                            <p className="font-bold">{stat.totalAttended}</p>
                                            <p className="text-xs text-muted-foreground">Attended</p>
                                        </div>
                                        <div>
                                            <div className="flex justify-center mb-1">
                                                <XCircle className="h-4 w-4 text-red-500" />
                                            </div>
                                            <p className="font-bold">{stat.totalSessions - stat.totalAttended}</p>
                                            <p className="text-xs text-muted-foreground">Missed</p>
                                        </div>
                                        {stat.plannedAbsences > 0 && (
                                            <div>
                                                <div className="flex justify-center mb-1">
                                                    <CalendarOff className="h-4 w-4 text-orange-500" />
                                                </div>
                                                <p className="font-bold">{stat.plannedAbsences}</p>
                                                <p className="text-xs text-muted-foreground">Planned</p>
                                            </div>
                                        )}
                                        <div>
                                            <div className="flex justify-center mb-1">
                                                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <p className="font-bold">{stat.totalSessions}</p>
                                            <p className="text-xs text-muted-foreground">Past Sessions</p>
                                        </div>
                                        <div>
                                            <div className="flex justify-center mb-1">
                                                <CalendarDays className="h-4 w-4 text-blue-500" />
                                            </div>
                                            <p className="font-bold">{stat.upcomingSessions}</p>
                                            <p className="text-xs text-muted-foreground">Upcoming</p>
                                        </div>
                                    </div>

                                    {/* Recent Check-ins */}
                                    {stat.checkInHistory.length > 0 && (
                                        <div className="border-t pt-4">
                                            <p className="text-xs font-medium text-muted-foreground mb-2">Recent Check-ins</p>
                                            <div className="flex flex-wrap gap-2">
                                                {stat.checkInHistory.map((checkin) => (
                                                    <Badge key={checkin.id} variant="outline" className="text-xs">
                                                        <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                                                        {formatDateShort(checkin.sessionDate)}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </main>
    )
}
