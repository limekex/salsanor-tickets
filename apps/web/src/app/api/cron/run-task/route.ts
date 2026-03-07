import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { emailService } from '@/lib/email/email-service'

// Cron secret for authentication - should be set in environment variables
const CRON_SECRET = process.env.CRON_SECRET

/**
 * POST /api/cron/run-task
 * 
 * Execute a specific scheduled task. Can be called:
 * 1. By manual trigger from the UI (with runId already created)
 * 2. By external cron service (creates runId automatically)
 * 
 * Body: { taskId: string, runId?: string }
 * Header: Authorization: Bearer <CRON_SECRET>
 */
export async function POST(req: Request) {
    // Verify cron secret for automated calls
    const authHeader = req.headers.get('authorization')
    const body = await req.json().catch(() => ({}))
    const { taskId, runId: existingRunId } = body

    // Allow both cron secret auth and internal calls (which won't have the header but have runId)
    if (!existingRunId) {
        // If no runId, this is an external cron call - verify secret
        if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
    }

    if (!taskId) {
        return NextResponse.json({ error: 'taskId required' }, { status: 400 })
    }

    // Get the task
    const task = await prisma.scheduledTask.findUnique({
        where: { id: taskId },
        include: { Organizer: true },
    })

    if (!task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (!task.isActive) {
        return NextResponse.json({ error: 'Task is not active' }, { status: 400 })
    }

    // Create or get run record
    let run
    if (existingRunId) {
        run = await prisma.scheduledTaskRun.findUnique({ where: { id: existingRunId } })
        if (!run) {
            return NextResponse.json({ error: 'Run not found' }, { status: 404 })
        }
    } else {
        run = await prisma.scheduledTaskRun.create({
            data: {
                taskId,
                status: 'RUNNING',
            },
        })
    }

    try {
        let result: { processed: number; failed: number; message: string }

        // Execute based on task type
        switch (task.taskType) {
            case 'SESSION_REMINDER':
                result = await runSessionReminders(task.organizerId, task.config as Record<string, unknown> | null)
                break
            case 'BREAK_REMINDER':
                result = await runBreakReminders(task.organizerId)
                break
            case 'LOW_ATTENDANCE_WARN':
                result = await runLowAttendanceWarnings(task.organizerId, task.config as Record<string, unknown> | null)
                break
            case 'MEMBERSHIP_EXPIRY_WARN':
                result = await runMembershipExpiryWarnings(task.organizerId, task.config as Record<string, unknown> | null)
                break
            case 'WAITLIST_CLEANUP':
                result = await runWaitlistCleanup(task.organizerId)
                break
            case 'MISSED_SESSION_NOTIFY':
                result = await runMissedSessionNotifications(task.organizerId, task.config as Record<string, unknown> | null)
                break
            default:
                result = { processed: 0, failed: 0, message: `Unknown task type: ${task.taskType}` }
        }

        // Update run record
        const status = result.failed === 0 ? 'SUCCESS' : result.processed > 0 ? 'PARTIAL' : 'FAILED'
        await prisma.scheduledTaskRun.update({
            where: { id: run.id },
            data: {
                completedAt: new Date(),
                status,
                message: result.message,
                itemsProcessed: result.processed,
                itemsFailed: result.failed,
            },
        })

        // Update task record
        await prisma.scheduledTask.update({
            where: { id: taskId },
            data: {
                lastRunAt: new Date(),
                lastRunStatus: status,
                lastRunMessage: result.message,
                runCount: { increment: 1 },
                failCount: status === 'FAILED' ? { increment: 1 } : undefined,
            },
        })

        return NextResponse.json({ success: true, ...result })
    } catch (error) {
        console.error('Task execution error:', error)
        
        // Update run record with failure
        await prisma.scheduledTaskRun.update({
            where: { id: run.id },
            data: {
                completedAt: new Date(),
                status: 'FAILED',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
        })

        // Update task record
        await prisma.scheduledTask.update({
            where: { id: taskId },
            data: {
                lastRunAt: new Date(),
                lastRunStatus: 'FAILED',
                lastRunMessage: error instanceof Error ? error.message : 'Unknown error',
                runCount: { increment: 1 },
                failCount: { increment: 1 },
            },
        })

        return NextResponse.json({ error: 'Task execution failed' }, { status: 500 })
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Task Implementations
// ─────────────────────────────────────────────────────────────────────────────

async function runSessionReminders(
    organizerId: string | null,
    config: Record<string, unknown> | null
): Promise<{ processed: number; failed: number; message: string }> {
    const hoursBefore = (config?.hoursBefore as number) ?? 4 // Default 4 hours before
    const now = new Date()
    const reminderTime = new Date(now.getTime() + hoursBefore * 60 * 60 * 1000)
    
    // Get today's day of week (0 = Sunday, 1 = Monday, etc.)
    const todayDow = now.getDay()

    // Find all tracks that run today and are within the reminder window
    const tracks = await prisma.courseTrack.findMany({
        where: {
            weekday: todayDow,
            CoursePeriod: {
                organizerId: organizerId ?? undefined,
                startDate: { lte: now },
                endDate: { gte: now },
            },
        },
        include: {
            CoursePeriod: {
                include: { Organizer: true },
            },
            Registration: {
                where: { status: 'ACTIVE' },
                include: { PersonProfile: true },
            },
        },
    })

    // Filter tracks whose start time is within the reminder window
    const tracksToNotify = tracks.filter(track => {
        const [hours, minutes] = (track.timeStart || '19:00').split(':').map(Number)
        const sessionStart = new Date(now)
        sessionStart.setHours(hours, minutes, 0, 0)
        
        // Check if session is between now and reminderTime
        return sessionStart > now && sessionStart <= reminderTime
    })

    let processed = 0
    let failed = 0

    for (const track of tracksToNotify) {
        // Check for break periods
        const isBreak = await prisma.periodBreak.findFirst({
            where: {
                OR: [
                    { periodId: track.periodId },
                    { trackId: track.id },
                ],
                startDate: { lte: now },
                endDate: { gte: now },
            },
        })

        if (isBreak) continue // Skip if today is a break

        const checkInWindow = track.checkInWindowBefore ?? 30

        for (const reg of track.Registration) {
            if (!reg.PersonProfile?.email) continue

            try {
                const result = await emailService.sendTransactional({
                    organizerId: track.CoursePeriod.organizerId,
                    templateSlug: 'session-reminder',
                    recipientEmail: reg.PersonProfile.email,
                    recipientName: `${reg.PersonProfile.firstName} ${reg.PersonProfile.lastName}`,
                    variables: {
                        firstName: reg.PersonProfile.firstName,
                        courseName: track.title,
                        sessionTime: track.timeStart || '19:00',
                        location: track.locationName || 'TBA',
                        periodName: track.CoursePeriod.name,
                        checkInWindow: `${checkInWindow} minutes`,
                        myCoursesUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/my/courses`,
                        organizerName: track.CoursePeriod.Organizer.name,
                        currentYear: new Date().getFullYear().toString(),
                    },
                })

                if (result.success) {
                    processed++
                } else {
                    failed++
                }
            } catch {
                failed++
            }
        }
    }

    return {
        processed,
        failed,
        message: `Sent ${processed} session reminders, ${failed} failed`,
    }
}

async function runBreakReminders(
    organizerId: string | null
): Promise<{ processed: number; failed: number; message: string }> {
    const now = new Date()
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    // Find breaks starting in the next week
    const upcomingBreaks = await prisma.periodBreak.findMany({
        where: {
            startDate: { gte: now, lte: nextWeek },
            CoursePeriod: organizerId ? { organizerId } : undefined,
        },
        include: {
            CoursePeriod: {
                include: { Organizer: true },
            },
            CourseTrack: {
                include: {
                    Registration: {
                        where: { status: 'ACTIVE' },
                        include: { PersonProfile: true },
                    },
                },
            },
        },
    })

    let processed = 0
    let failed = 0

    for (const breakPeriod of upcomingBreaks) {
        // Get registrations to notify - either from specific track or all in period
        const registrations = breakPeriod.CourseTrack?.Registration ?? []
        
        // If no specific track, get all registrations in the period
        let allRegistrations = registrations
        if (!breakPeriod.trackId && breakPeriod.periodId) {
            const periodRegs = await prisma.registration.findMany({
                where: {
                    CourseTrack: { periodId: breakPeriod.periodId },
                    status: 'ACTIVE',
                },
                include: { PersonProfile: true, CourseTrack: true },
            })
            allRegistrations = periodRegs
        }

        const breakDates = `${formatDateShort(breakPeriod.startDate)} - ${formatDateShort(breakPeriod.endDate)}`
        const nextSessionDate = formatDateShort(new Date(breakPeriod.endDate.getTime() + 24 * 60 * 60 * 1000))

        for (const reg of allRegistrations) {
            if (!reg.PersonProfile?.email) continue

            try {
                const result = await emailService.sendTransactional({
                    organizerId: breakPeriod.CoursePeriod?.organizerId ?? '',
                    templateSlug: 'break-reminder',
                    recipientEmail: reg.PersonProfile.email,
                    recipientName: `${reg.PersonProfile.firstName} ${reg.PersonProfile.lastName}`,
                    variables: {
                        firstName: reg.PersonProfile.firstName,
                        courseName: breakPeriod.CourseTrack?.title ?? 'your course',
                        breakDates,
                        breakReason: breakPeriod.description || 'Scheduled break',
                        nextSessionDate,
                        organizerName: breakPeriod.CoursePeriod?.Organizer.name ?? 'Your organizer',
                        currentYear: new Date().getFullYear().toString(),
                    },
                })

                if (result.success) {
                    processed++
                } else {
                    failed++
                }
            } catch {
                failed++
            }
        }
    }

    return {
        processed,
        failed,
        message: `Sent ${processed} break reminders, ${failed} failed`,
    }
}

async function runLowAttendanceWarnings(
    organizerId: string | null,
    config: Record<string, unknown> | null
): Promise<{ processed: number; failed: number; message: string }> {
    const threshold = (config?.threshold as number) ?? 0.75

    // Get active tracks
    const tracks = await prisma.courseTrack.findMany({
        where: {
            CoursePeriod: {
                organizerId: organizerId ?? undefined,
                startDate: { lte: new Date() },
                endDate: { gte: new Date() },
            },
        },
        include: {
            CoursePeriod: { include: { Organizer: true } },
            Registration: {
                where: { status: 'ACTIVE' },
                include: {
                    PersonProfile: true,
                    Attendance: { where: { cancelled: false } },
                },
            },
        },
    })

    let processed = 0
    let failed = 0

    for (const track of tracks) {
        const today = new Date()
        const periodEnd = track.CoursePeriod.endDate > today ? today : track.CoursePeriod.endDate
        const weeksElapsed = Math.max(
            Math.floor((periodEnd.getTime() - track.CoursePeriod.startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)),
            0
        )

        if (weeksElapsed === 0) continue

        for (const reg of track.Registration) {
            const attended = reg.Attendance.length
            const rate = attended / weeksElapsed

            if (rate >= threshold) continue
            if (!reg.PersonProfile?.email) continue

            try {
                const result = await emailService.sendTransactional({
                    organizerId: track.CoursePeriod.organizerId,
                    templateSlug: 'attendance-low-warning',
                    recipientEmail: reg.PersonProfile.email,
                    recipientName: `${reg.PersonProfile.firstName} ${reg.PersonProfile.lastName}`,
                    variables: {
                        firstName: reg.PersonProfile.firstName,
                        lastName: reg.PersonProfile.lastName,
                        courseName: track.title,
                        periodName: track.CoursePeriod.name,
                        attended: String(attended),
                        totalSessions: String(weeksElapsed),
                        attendanceRate: String(Math.round(rate * 100)),
                        threshold: String(Math.round(threshold * 100)),
                        myAttendanceUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/my/attendance`,
                        organizerName: track.CoursePeriod.Organizer.name,
                        currentYear: new Date().getFullYear().toString(),
                    },
                })

                if (result.success) {
                    processed++
                } else {
                    failed++
                }
            } catch {
                failed++
            }
        }
    }

    return {
        processed,
        failed,
        message: `Sent ${processed} low attendance warnings, ${failed} failed`,
    }
}

async function runMembershipExpiryWarnings(
    organizerId: string | null,
    config: Record<string, unknown> | null
): Promise<{ processed: number; failed: number; message: string }> {
    const daysBefore = (config?.daysBefore as number) ?? 30
    const now = new Date()
    const warningDate = new Date(now.getTime() + daysBefore * 24 * 60 * 60 * 1000)

    const expiringMemberships = await prisma.membership.findMany({
        where: {
            organizerId: organizerId ?? undefined,
            status: 'ACTIVE',
            validTo: { gte: now, lte: warningDate },
        },
        include: {
            PersonProfile: true,
            MembershipTier: true,
            Organizer: true,
        },
    })

    let processed = 0
    let failed = 0

    for (const membership of expiringMemberships) {
        if (!membership.PersonProfile?.email) continue

        try {
            const result = await emailService.sendTransactional({
                organizerId: membership.organizerId,
                templateSlug: 'membership-renewal-reminder',
                recipientEmail: membership.PersonProfile.email,
                recipientName: `${membership.PersonProfile.firstName} ${membership.PersonProfile.lastName}`,
                variables: {
                    recipientName: membership.PersonProfile.firstName,
                    tierName: membership.MembershipTier.name,
                    memberNumber: membership.memberNumber,
                    expiryDate: formatDateShort(membership.validTo),
                    renewalUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/org/${membership.Organizer.slug}/membership`,
                    currentYear: new Date().getFullYear().toString(),
                },
            })

            if (result.success) {
                processed++
            } else {
                failed++
            }
        } catch {
            failed++
        }
    }

    return {
        processed,
        failed,
        message: `Sent ${processed} membership expiry warnings, ${failed} failed`,
    }
}

async function runWaitlistCleanup(
    organizerId: string | null
): Promise<{ processed: number; failed: number; message: string }> {
    const now = new Date()

    // Find expired offers
    const expiredOffers = await prisma.waitlistEntry.findMany({
        where: {
            status: 'OFFERED',
            offeredUntil: { lt: now },
            Registration: organizerId ? {
                CourseTrack: {
                    CoursePeriod: { organizerId },
                },
            } : undefined,
        },
    })

    let processed = 0

    for (const entry of expiredOffers) {
        try {
            await prisma.waitlistEntry.update({
                where: { id: entry.id },
                data: { status: 'EXPIRED' },
            })
            processed++
        } catch {
            // Ignore individual failures
        }
    }

    return {
        processed,
        failed: 0,
        message: `Cleaned up ${processed} expired waitlist offers`,
    }
}

async function runMissedSessionNotifications(
    organizerId: string | null,
    config: Record<string, unknown> | null
): Promise<{ processed: number; failed: number; message: string }> {
    const hoursAfter = (config?.hoursAfter as number) ?? 2 // Default: 2 hours after session ends
    const now = new Date()
    const todayDow = now.getDay()
    
    // Get today's date at midnight for session lookup
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(now)
    todayEnd.setHours(23, 59, 59, 999)

    // Find tracks that had a session today
    const tracks = await prisma.courseTrack.findMany({
        where: {
            weekday: todayDow,
            CoursePeriod: {
                organizerId: organizerId ?? undefined,
                startDate: { lte: now },
                endDate: { gte: now },
            },
        },
        include: {
            CoursePeriod: {
                include: { Organizer: true },
            },
            Registration: {
                where: { status: 'ACTIVE' },
                include: { PersonProfile: true },
            },
            Attendance: {
                where: {
                    sessionDate: { gte: todayStart, lte: todayEnd },
                    cancelled: false,
                },
                select: { registrationId: true },
            },
        },
    })

    // Filter tracks whose session has ended + hoursAfter buffer
    const tracksToNotify = tracks.filter(track => {
        const [hours, minutes] = (track.timeEnd || track.timeStart || '21:00').split(':').map(Number)
        const sessionEnd = new Date(now)
        sessionEnd.setHours(hours, minutes, 0, 0)
        sessionEnd.setTime(sessionEnd.getTime() + hoursAfter * 60 * 60 * 1000)
        
        return now >= sessionEnd
    })

    let processed = 0
    let failed = 0

    for (const track of tracksToNotify) {
        // Check for break periods
        const isBreak = await prisma.periodBreak.findFirst({
            where: {
                OR: [
                    { periodId: track.periodId },
                    { trackId: track.id },
                ],
                startDate: { lte: now },
                endDate: { gte: now },
            },
        })

        if (isBreak) continue // Skip if today is a break

        // Get registration IDs that already checked in
        const checkedInIds = new Set(track.Attendance.map(a => a.registrationId))

        // Find participants who didn't check in
        const missedParticipants = track.Registration.filter(
            reg => !checkedInIds.has(reg.id)
        )

        for (const reg of missedParticipants) {
            if (!reg.PersonProfile?.email) continue

            // Check if already has a planned absence
            const hasAbsence = await prisma.plannedAbsence.findFirst({
                where: {
                    registrationId: reg.id,
                    sessionDate: { gte: todayStart, lte: todayEnd },
                },
            })

            if (hasAbsence) continue // Don't notify if absence was planned

            try {
                const result = await emailService.sendTransactional({
                    organizerId: track.CoursePeriod.organizerId,
                    templateSlug: 'missed-session',
                    recipientEmail: reg.PersonProfile.email,
                    recipientName: `${reg.PersonProfile.firstName} ${reg.PersonProfile.lastName}`,
                    variables: {
                        firstName: reg.PersonProfile.firstName,
                        courseName: track.title,
                        sessionDate: formatDateShort(now),
                        sessionTime: track.timeStart || '19:00',
                        location: track.locationName || 'TBA',
                        periodName: track.CoursePeriod.name,
                        myCoursesUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/my/courses`,
                        myAttendanceUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/my/attendance`,
                        organizerName: track.CoursePeriod.Organizer.name,
                        currentYear: new Date().getFullYear().toString(),
                    },
                })

                if (result.success) {
                    processed++
                } else {
                    failed++
                }
            } catch {
                failed++
            }
        }
    }

    return {
        processed,
        failed,
        message: `Sent ${processed} missed session notifications, ${failed} failed`,
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDateShort(date: Date): string {
    return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(date))
}
