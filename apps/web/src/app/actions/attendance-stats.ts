'use server'

import { prisma } from '@/lib/db'
import { requireOrgAdminForOrganizer } from '@/utils/auth-org-admin'

export interface TrackAttendanceStats {
    trackId: string
    trackTitle: string
    periodId: string
    periodName: string
    totalRegistrations: number
    totalSessions: number
    totalCheckIns: number
    averageAttendance: number
    sessions: SessionStats[]
}

export interface SessionStats {
    date: Date
    expected: number
    actual: number
    attendanceRate: number
}

export interface ParticipantAttendanceRow {
    registrationId: string
    personName: string
    chosenRole: string
    totalAttended: number
    totalSessions: number
    attendanceRate: number
    lastCheckIn: Date | null
}

export interface PeriodOverviewStats {
    periodId: string
    periodName: string
    organizerName: string
    startDate: Date
    endDate: Date
    totalTracks: number
    totalRegistrations: number
    totalCheckIns: number
    totalExpectedSessions: number
    averageAttendance: number
    tracks: {
        id: string
        title: string
        weekday: number
        registrations: number
        checkIns: number
        averageAttendance: number
    }[]
}

/**
 * Get attendance overview for all periods of an organizer
 */
export async function getOrganizerAttendanceOverview(organizerId: string): Promise<PeriodOverviewStats[]> {
    await requireOrgAdminForOrganizer(organizerId)

    const periods = await prisma.coursePeriod.findMany({
        where: { organizerId },
        include: {
            Organizer: { select: { name: true } },
            CourseTrack: {
                include: {
                    Registration: {
                        where: { status: 'ACTIVE' }
                    },
                    Attendance: {
                        where: { cancelled: false }
                    }
                }
            }
        },
        orderBy: { startDate: 'desc' }
    })

    return periods.map(period => {
        const tracks = period.CourseTrack.map(track => ({
            id: track.id,
            title: track.title,
            weekday: track.weekday,
            registrations: track.Registration.length,
            checkIns: track.Attendance.length,
            averageAttendance: track.Registration.length > 0
                ? Math.round((track.Attendance.length / (track.Registration.length * getSessionCount(period.startDate, period.endDate, track.weekday))) * 100)
                : 0
        }))

        const totalRegistrations = tracks.reduce((sum, t) => sum + t.registrations, 0)
        const totalCheckIns = tracks.reduce((sum, t) => sum + t.checkIns, 0)
        const totalExpectedSessions = tracks.reduce((sum, t) => 
            sum + t.registrations * getSessionCount(period.startDate, period.endDate, t.weekday), 0)

        return {
            periodId: period.id,
            periodName: period.name,
            organizerName: period.Organizer.name,
            startDate: period.startDate,
            endDate: period.endDate,
            totalTracks: tracks.length,
            totalRegistrations,
            totalCheckIns,
            totalExpectedSessions,
            averageAttendance: totalExpectedSessions > 0
                ? Math.round((totalCheckIns / totalExpectedSessions) * 100)
                : 0,
            tracks
        }
    })
}

/**
 * Get detailed attendance stats for a specific track
 */
export async function getTrackAttendanceStats(trackId: string): Promise<TrackAttendanceStats | null> {
    const track = await prisma.courseTrack.findUnique({
        where: { id: trackId },
        include: {
            CoursePeriod: {
                include: {
                    Organizer: { select: { id: true, name: true } },
                    PeriodBreak: true
                }
            },
            Registration: {
                where: { status: 'ACTIVE' },
                select: { id: true }
            },
            Attendance: {
                where: { cancelled: false },
                orderBy: { sessionDate: 'asc' }
            }
        }
    })

    if (!track) return null

    await requireOrgAdminForOrganizer(track.CoursePeriod.organizerId)

    const period = track.CoursePeriod
    const sessionDates = getSessionDates(period.startDate, period.endDate, track.weekday, period.PeriodBreak)
    const totalRegistrations = track.Registration.length

    // Group attendance by session date
    const attendanceByDate = new Map<string, number>()
    for (const att of track.Attendance) {
        const dateKey = att.sessionDate.toISOString().split('T')[0]
        attendanceByDate.set(dateKey, (attendanceByDate.get(dateKey) || 0) + 1)
    }

    const sessions: SessionStats[] = sessionDates.map(date => {
        const dateKey = date.toISOString().split('T')[0]
        const actual = attendanceByDate.get(dateKey) || 0
        return {
            date,
            expected: totalRegistrations,
            actual,
            attendanceRate: totalRegistrations > 0 ? Math.round((actual / totalRegistrations) * 100) : 0
        }
    })

    const totalCheckIns = track.Attendance.length
    const totalExpectedAttendance = totalRegistrations * sessionDates.length

    return {
        trackId: track.id,
        trackTitle: track.title,
        periodId: period.id,
        periodName: period.name,
        totalRegistrations,
        totalSessions: sessionDates.length,
        totalCheckIns,
        averageAttendance: totalExpectedAttendance > 0
            ? Math.round((totalCheckIns / totalExpectedAttendance) * 100)
            : 0,
        sessions
    }
}

/**
 * Get attendance list for a track (all participants with their attendance)
 */
export async function getTrackParticipantAttendance(trackId: string): Promise<ParticipantAttendanceRow[]> {
    const track = await prisma.courseTrack.findUnique({
        where: { id: trackId },
        include: {
            CoursePeriod: {
                include: {
                    Organizer: { select: { id: true } },
                    PeriodBreak: true
                }
            },
            Registration: {
                where: { status: 'ACTIVE' },
                include: {
                    PersonProfile: {
                        select: { firstName: true, lastName: true }
                    },
                    Attendance: {
                        where: { cancelled: false, trackId },
                        orderBy: { sessionDate: 'desc' }
                    }
                }
            }
        }
    })

    if (!track) return []

    await requireOrgAdminForOrganizer(track.CoursePeriod.organizerId)

    const period = track.CoursePeriod
    const totalSessions = getSessionCount(period.startDate, period.endDate, track.weekday)

    return track.Registration.map(reg => ({
        registrationId: reg.id,
        personName: `${reg.PersonProfile.firstName} ${reg.PersonProfile.lastName}`,
        chosenRole: reg.chosenRole,
        totalAttended: reg.Attendance.length,
        totalSessions,
        attendanceRate: totalSessions > 0 ? Math.round((reg.Attendance.length / totalSessions) * 100) : 0,
        lastCheckIn: reg.Attendance[0]?.sessionDate || null
    })).sort((a, b) => b.attendanceRate - a.attendanceRate)
}

// Helper: Count scheduled sessions for a weekday within a date range
function getSessionCount(startDate: Date, endDate: Date, weekday: number): number {
    let count = 0
    const current = new Date(startDate)
    const end = new Date(endDate)
    
    while (current <= end) {
        const jsDay = current.getDay()
        const isoDay = jsDay === 0 ? 7 : jsDay
        if (isoDay === weekday) {
            count++
        }
        current.setDate(current.getDate() + 1)
    }
    return count
}

// Helper: Get actual session dates, excluding breaks
function getSessionDates(
    startDate: Date, 
    endDate: Date, 
    weekday: number, 
    breaks: { startDate: Date; endDate: Date }[]
): Date[] {
    const dates: Date[] = []
    const current = new Date(startDate)
    const end = new Date(endDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    while (current <= end && current <= today) {
        const jsDay = current.getDay()
        const isoDay = jsDay === 0 ? 7 : jsDay
        
        if (isoDay === weekday) {
            // Check if this date falls in a break period
            const isBreak = breaks.some(b => 
                current >= new Date(b.startDate) && current <= new Date(b.endDate)
            )
            if (!isBreak) {
                dates.push(new Date(current))
            }
        }
        current.setDate(current.getDate() + 1)
    }
    return dates
}

/**
 * Participant's own attendance stats for a registration (no auth required beyond ownership)
 */
export interface MyAttendanceStats {
    registrationId: string
    trackTitle: string
    periodName: string
    totalAttended: number
    totalSessions: number
    attendanceRate: number
    lastCheckIn: Date | null
    upcomingSessions: number
}

export async function getMyAttendanceForRegistration(registrationId: string, userId: string): Promise<MyAttendanceStats | null> {
    const registration = await prisma.registration.findUnique({
        where: { id: registrationId },
        include: {
            PersonProfile: {
                include: {
                    UserAccount: { select: { supabaseUid: true } }
                }
            },
            CourseTrack: true,
            CoursePeriod: {
                include: { PeriodBreak: true }
            },
            Attendance: {
                where: { cancelled: false }
            }
        }
    })

    if (!registration) return null
    
    // Verify ownership
    if (registration.PersonProfile.UserAccount?.supabaseUid !== userId) {
        return null
    }

    const period = registration.CoursePeriod
    const track = registration.CourseTrack
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get past sessions (for attendance rate)
    const pastSessions = getSessionDates(period.startDate, period.endDate, track.weekday, period.PeriodBreak)
    
    // Count upcoming sessions
    let upcomingSessions = 0
    const current = new Date(today)
    current.setDate(current.getDate() + 1) // Start from tomorrow
    const end = new Date(period.endDate)
    while (current <= end) {
        const jsDay = current.getDay()
        const isoDay = jsDay === 0 ? 7 : jsDay
        if (isoDay === track.weekday) {
            const isBreak = period.PeriodBreak.some(b => 
                current >= new Date(b.startDate) && current <= new Date(b.endDate)
            )
            if (!isBreak) upcomingSessions++
        }
        current.setDate(current.getDate() + 1)
    }

    const totalAttended = registration.Attendance.length
    const totalSessions = pastSessions.length
    const lastCheckIn = registration.Attendance.length > 0 
        ? registration.Attendance.sort((a, b) => b.sessionDate.getTime() - a.sessionDate.getTime())[0].sessionDate
        : null

    return {
        registrationId: registration.id,
        trackTitle: track.title,
        periodName: period.name,
        totalAttended,
        totalSessions,
        attendanceRate: totalSessions > 0 ? Math.round((totalAttended / totalSessions) * 100) : 0,
        lastCheckIn,
        upcomingSessions
    }
}
