'use server'

/* eslint-disable @typescript-eslint/no-explicit-any */
// Note: Using 'any' temporarily for PlannedAbsence model until Prisma client regenerates

import { prisma } from '@/lib/db'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import type { AbsenceReason } from '@/lib/absence-utils'

// Note: AbsenceReason type is exported from '@/lib/absence-utils', not here
// 'use server' files can only export async functions

export interface PlannedAbsenceData {
    id: string
    registrationId: string
    trackId: string
    sessionDate: Date
    reason: AbsenceReason
    reasonText: string | null
    notifiedAt: Date
    trackTitle?: string
    personName?: string
}

/**
 * Create a planned absence for a participant
 * Participants can only create absences for their own registrations
 */
export async function createPlannedAbsence(
    registrationId: string,
    trackId: string,
    sessionDate: Date,
    reason: AbsenceReason,
    reasonText?: string
): Promise<{ success: boolean; error?: string; absence?: PlannedAbsenceData }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, error: 'Not logged in' }
    }

    // Verify the registration belongs to this user
    const registration = await prisma.registration.findUnique({
        where: { id: registrationId },
        include: {
            PersonProfile: { 
                select: { 
                    UserAccount: { select: { supabaseUid: true } } 
                } 
            },
            CourseTrack: { select: { id: true, title: true, periodId: true } },
            CoursePeriod: { select: { startDate: true, endDate: true } }
        }
    })

    if (!registration) {
        return { success: false, error: 'Registration not found' }
    }

    if (registration.PersonProfile.UserAccount?.supabaseUid !== user.id) {
        return { success: false, error: 'You can only register absences for your own courses' }
    }

    if (registration.trackId !== trackId) {
        return { success: false, error: 'Course track does not match registration' }
    }

    // Validate the session date is within the period
    const sessionDateOnly = new Date(sessionDate)
    sessionDateOnly.setHours(0, 0, 0, 0)

    if (sessionDateOnly < registration.CoursePeriod.startDate || 
        sessionDateOnly > registration.CoursePeriod.endDate) {
        return { success: false, error: 'Date is outside the course period' }
    }

    // Check if absence already exists for this session
    const existing = await (prisma as any).plannedAbsence.findUnique({
        where: {
            registrationId_trackId_sessionDate: {
                registrationId,
                trackId,
                sessionDate: sessionDateOnly
            }
        }
    })

    if (existing) {
        return { success: false, error: 'You have already registered an absence for this session' }
    }

    // Check if already checked in for this session (can't mark absent if already present)
    const attendance = await prisma.attendance.findFirst({
        where: {
            registrationId,
            trackId,
            sessionDate: sessionDateOnly,
            cancelled: false
        }
    })

    if (attendance) {
        return { success: false, error: 'Cannot register absence - you are already checked in for this session' }
    }

    try {
        const absence = await (prisma as any).plannedAbsence.create({
            data: {
                registrationId,
                trackId,
                sessionDate: sessionDateOnly,
                reason,
                reasonText: reasonText || null
            }
        })

        revalidatePath('/my/courses')
        revalidatePath(`/staffadmin/attendance`)

        return {
            success: true,
            absence: {
                id: absence.id,
                registrationId: absence.registrationId,
                trackId: absence.trackId,
                sessionDate: absence.sessionDate,
                reason: absence.reason,
                reasonText: absence.reasonText,
                notifiedAt: absence.notifiedAt,
                trackTitle: registration.CourseTrack.title
            }
        }
    } catch (error) {
        console.error('Error creating planned absence:', error)
        return { success: false, error: 'Could not register absence' }
    }
}

/**
 * Delete a planned absence
 * Participants can only delete their own absences
 */
export async function deletePlannedAbsence(
    absenceId: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, error: 'Not logged in' }
    }

    const absence = await (prisma as any).plannedAbsence.findUnique({
        where: { id: absenceId },
        include: {
            Registration: {
                include: {
                    PersonProfile: { 
                        select: { 
                            UserAccount: { select: { supabaseUid: true } } 
                        } 
                    }
                }
            }
        }
    })

    if (!absence) {
        return { success: false, error: 'Absence not found' }
    }

    if (absence.Registration.PersonProfile.UserAccount?.supabaseUid !== user.id) {
        return { success: false, error: 'You can only delete your own absences' }
    }

    // Check if the session date is in the past (allow deletion up to session end)
    const now = new Date()
    const sessionDate = new Date(absence.sessionDate)
    sessionDate.setHours(23, 59, 59, 999) // End of day

    if (now > sessionDate) {
        return { success: false, error: 'Cannot delete absences for sessions that have already occurred' }
    }

    try {
        await (prisma as any).plannedAbsence.delete({
            where: { id: absenceId }
        })

        revalidatePath('/my/courses')
        revalidatePath(`/staffadmin/attendance`)

        return { success: true }
    } catch (error) {
        console.error('Error deleting planned absence:', error)
        return { success: false, error: 'Could not delete absence' }
    }
}

/**
 * Get all planned absences for a registration
 */
export async function getPlannedAbsencesForRegistration(
    registrationId: string
): Promise<PlannedAbsenceData[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return []
    }

    // Verify ownership
    const registration = await prisma.registration.findUnique({
        where: { id: registrationId },
        include: {
            PersonProfile: { 
                select: { 
                    UserAccount: { select: { supabaseUid: true } } 
                } 
            }
        }
    })

    if (!registration || registration.PersonProfile.UserAccount?.supabaseUid !== user.id) {
        return []
    }

    const absences = await (prisma as any).plannedAbsence.findMany({
        where: { registrationId },
        include: {
            CourseTrack: { select: { title: true } }
        },
        orderBy: { sessionDate: 'asc' }
    })

    return absences.map((a: any) => ({
        id: a.id,
        registrationId: a.registrationId,
        trackId: a.trackId,
        sessionDate: a.sessionDate,
        reason: a.reason,
        reasonText: a.reasonText,
        notifiedAt: a.notifiedAt,
        trackTitle: a.CourseTrack.title
    }))
}

/**
 * Get planned absences for a track session (organizer view)
 */
export async function getPlannedAbsencesForSession(
    trackId: string,
    sessionDate: Date
): Promise<PlannedAbsenceData[]> {
    const sessionDateOnly = new Date(sessionDate)
    sessionDateOnly.setHours(0, 0, 0, 0)

    const absences = await (prisma as any).plannedAbsence.findMany({
        where: {
            trackId,
            sessionDate: sessionDateOnly
        },
        include: {
            Registration: {
                include: {
                    PersonProfile: {
                        select: { firstName: true, lastName: true }
                    }
                }
            },
            CourseTrack: { select: { title: true } }
        },
        orderBy: {
            Registration: {
                PersonProfile: { firstName: 'asc' }
            }
        }
    })

    return absences.map((a: any) => ({
        id: a.id,
        registrationId: a.registrationId,
        trackId: a.trackId,
        sessionDate: a.sessionDate,
        reason: a.reason,
        reasonText: a.reasonText,
        notifiedAt: a.notifiedAt,
        trackTitle: a.CourseTrack.title,
        personName: `${a.Registration.PersonProfile.firstName} ${a.Registration.PersonProfile.lastName}`
    }))
}

/**
 * Get upcoming sessions for a registration where absence can be registered
 */
export async function getUpcomingSessionsForAbsence(
    registrationId: string
): Promise<{ date: Date; isBreak: boolean; hasAbsence: boolean; absenceId?: string }[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return []
    }

    const registration = await prisma.registration.findUnique({
        where: { id: registrationId },
        include: {
            PersonProfile: { 
                select: { 
                    UserAccount: { select: { supabaseUid: true } } 
                } 
            },
            CourseTrack: { 
                select: { 
                    id: true, 
                    weekday: true,
                    PeriodBreak: true
                } 
            },
            CoursePeriod: { select: { startDate: true, endDate: true } }
        }
    })

    if (!registration || registration.PersonProfile.UserAccount?.supabaseUid !== user.id) {
        return []
    }

    // Get existing absences and attendances separately
    const plannedAbsences = await (prisma as any).plannedAbsence.findMany({
        where: { registrationId }
    })

    const attendances = await prisma.attendance.findMany({
        where: { registrationId, cancelled: false }
    })

    const sessions: { date: Date; isBreak: boolean; hasAbsence: boolean; absenceId?: string }[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Generate all sessions from today until end of period
    const endDate = new Date(registration.CoursePeriod.endDate)
    const currentDate = new Date(Math.max(today.getTime(), registration.CoursePeriod.startDate.getTime()))

    while (currentDate <= endDate) {
        // Check if this day matches the track's weekday (0=Sunday in JS, but we store 1=Monday)
        const dayOfWeek = currentDate.getDay()
        const trackWeekday = registration.CourseTrack.weekday // 1=Monday, 7=Sunday
        const jsWeekday = trackWeekday === 7 ? 0 : trackWeekday // Convert to JS format

        if (dayOfWeek === jsWeekday) {
            const sessionDate = new Date(currentDate)
            sessionDate.setHours(0, 0, 0, 0)

            // Check if it's a break day
            const isBreak = registration.CourseTrack.PeriodBreak.some((b: any) => 
                sessionDate >= new Date(b.startDate) && sessionDate <= new Date(b.endDate)
            )

            // Check if already has an absence registered
            const existingAbsence = plannedAbsences.find((a: any) => {
                const absenceDate = new Date(a.sessionDate)
                absenceDate.setHours(0, 0, 0, 0)
                return absenceDate.getTime() === sessionDate.getTime()
            })

            // Check if already checked in (can't register absence)
            const hasAttendance = attendances.some((a: any) => {
                const attendanceDate = new Date(a.sessionDate)
                attendanceDate.setHours(0, 0, 0, 0)
                return attendanceDate.getTime() === sessionDate.getTime()
            })

            // Only include future sessions where absence can still be registered
            if (!hasAttendance && sessionDate >= today) {
                sessions.push({
                    date: sessionDate,
                    isBreak,
                    hasAbsence: !!existingAbsence,
                    absenceId: existingAbsence?.id
                })
            }
        }

        currentDate.setDate(currentDate.getDate() + 1)
    }

    return sessions
}

export interface GroupedAbsence {
    sessionDate: Date
    absences: {
        id: string
        personName: string
        reason: AbsenceReason
        reasonText: string | null
    }[]
}

/**
 * Get upcoming planned absences for a track (organizer view)
 * Groups absences by session date
 */
export async function getUpcomingAbsencesForTrack(
    trackId: string
): Promise<GroupedAbsence[]> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const absences = await (prisma as any).plannedAbsence.findMany({
        where: {
            trackId,
            sessionDate: { gte: today }
        },
        include: {
            Registration: {
                include: {
                    PersonProfile: {
                        select: { firstName: true, lastName: true }
                    }
                }
            }
        },
        orderBy: [
            { sessionDate: 'asc' },
            { Registration: { PersonProfile: { firstName: 'asc' } } }
        ]
    })

    // Group by session date
    const grouped: Map<string, GroupedAbsence> = new Map()

    for (const absence of absences) {
        const dateKey = absence.sessionDate.toISOString().split('T')[0]
        
        if (!grouped.has(dateKey)) {
            grouped.set(dateKey, {
                sessionDate: absence.sessionDate,
                absences: []
            })
        }

        grouped.get(dateKey)!.absences.push({
            id: absence.id,
            personName: `${absence.Registration.PersonProfile.firstName} ${absence.Registration.PersonProfile.lastName}`,
            reason: absence.reason,
            reasonText: absence.reasonText
        })
    }

    return Array.from(grouped.values())
}

/**
 * Get count of planned absences for the next session
 */
export async function getAbsenceCountForNextSession(
    trackId: string
): Promise<{ date: Date | null; count: number }> {
    // Get track weekday and period end date
    const track = await prisma.courseTrack.findUnique({
        where: { id: trackId },
        select: { 
            weekday: true, 
            CoursePeriod: { 
                select: { endDate: true } 
            } 
        }
    }) as { weekday: number; CoursePeriod: { endDate: Date } | null } | null

    if (!track || !track.CoursePeriod) {
        return { date: null, count: 0 }
    }

    const periodEndDate = track.CoursePeriod.endDate

    // Find next session date
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const nextSessionDate = new Date(today)
    const trackWeekday = track.weekday
    const jsWeekday = trackWeekday === 7 ? 0 : trackWeekday

    // Find next occurrence of the track's weekday
    while (nextSessionDate.getDay() !== jsWeekday || nextSessionDate <= today) {
        nextSessionDate.setDate(nextSessionDate.getDate() + 1)
        if (nextSessionDate > periodEndDate) {
            return { date: null, count: 0 }
        }
    }

    const count = await (prisma as any).plannedAbsence.count({
        where: {
            trackId,
            sessionDate: nextSessionDate
        }
    })

    return { date: nextSessionDate, count }
}
