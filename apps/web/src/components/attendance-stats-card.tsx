'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, CalendarDays, TrendingUp, CalendarOff } from 'lucide-react'

interface AttendanceStatsCardProps {
    registrationId: string
}

interface AttendanceData {
    totalAttended: number
    totalSessions: number
    attendanceRate: number
    upcomingSessions: number
    lastCheckIn: string | null
    plannedAbsences?: number
}

export function AttendanceStatsCard({ registrationId }: AttendanceStatsCardProps) {
    const [data, setData] = useState<AttendanceData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchAttendance() {
            try {
                const res = await fetch(`/api/my/attendance?registrationId=${registrationId}`)
                if (res.ok) {
                    const json = await res.json()
                    setData(json)
                }
            } catch (e) {
                console.error('Failed to fetch attendance:', e)
            } finally {
                setLoading(false)
            }
        }
        fetchAttendance()
    }, [registrationId])

    if (loading) {
        return (
            <div className="animate-pulse bg-muted h-24 rounded-lg" />
        )
    }

    if (!data || data.totalSessions === 0) {
        return (
            <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground text-center">
                    No sessions yet — attendance tracking starts when the course begins.
                </p>
            </div>
        )
    }

    const getProgressBarColor = () => {
        if (data.attendanceRate >= 80) return 'bg-green-500'
        if (data.attendanceRate >= 50) return 'bg-yellow-500'
        return 'bg-red-500'
    }

    return (
        <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    Attendance
                </span>
                <span className="text-lg font-bold">{data.attendanceRate}%</span>
            </div>
            
            <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                    className={`h-full rounded-full transition-all ${getProgressBarColor()}`}
                    style={{ width: `${data.attendanceRate}%` }}
                />
            </div>
            
            <div className={`grid gap-2 text-center text-xs ${data.plannedAbsences && data.plannedAbsences > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
                <div className="space-y-1">
                    <div className="flex justify-center">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </div>
                    <p className="font-bold">{data.totalAttended} / {data.totalSessions}</p>
                    <p className="text-muted-foreground">Attended</p>
                </div>
                <div className="space-y-1">
                    <div className="flex justify-center">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="font-bold">{data.totalSessions}</p>
                    <p className="text-muted-foreground">Past</p>
                </div>
                <div className="space-y-1">
                    <div className="flex justify-center">
                        <CalendarDays className="h-4 w-4 text-blue-500" />
                    </div>
                    <p className="font-bold">{data.upcomingSessions}</p>
                    <p className="text-muted-foreground">Upcoming</p>
                </div>
                {data.plannedAbsences && data.plannedAbsences > 0 && (
                    <div className="space-y-1">
                        <div className="flex justify-center">
                            <CalendarOff className="h-4 w-4 text-orange-500" />
                        </div>
                        <p className="font-bold">{data.plannedAbsences}</p>
                        <p className="text-muted-foreground">Absences</p>
                    </div>
                )}
            </div>
        </div>
    )
}
