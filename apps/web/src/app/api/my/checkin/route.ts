import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { validateCheckInWindow } from '@/lib/checkin-window'

/**
 * GET /api/my/checkin
 * 
 * Returns the currently authenticated user's course tracks scheduled for today
 * that have self check-in enabled, along with their check-in status.
 */
export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const now = new Date()
        const jsDayOfWeek = now.getDay()
        const isoDayOfWeek = jsDayOfWeek === 0 ? 7 : jsDayOfWeek
        const sessionDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

        // Find user's person profile
        const userAccount = await prisma.userAccount.findUnique({
            where: { supabaseUid: user.id },
            select: { 
                id: true,
                PersonProfile: { 
                    select: { id: true } 
                }
            }
        })

        if (!userAccount?.PersonProfile) {
            return NextResponse.json({ tracks: [] })
        }

        // Get active registrations for tracks that:
        // 1. Allow dashboard check-in (button on /my)
        // 2. Are scheduled for today's weekday
        // 3. Period is currently active
        const registrations = await prisma.registration.findMany({
            where: {
                personId: userAccount.PersonProfile.id,
                status: 'ACTIVE',
                CourseTrack: {
                    allowDashboardCheckIn: true,
                    weekday: isoDayOfWeek
                },
                CoursePeriod: {
                    startDate: { lte: sessionDate },
                    endDate: { gte: sessionDate }
                }
            },
            include: {
                CourseTrack: {
                    select: {
                        id: true,
                        title: true,
                        weekday: true,
                        timeStart: true,
                        checkInWindowBefore: true,
                        checkInWindowAfter: true,
                        geofenceEnabled: true,
                        geofenceRadius: true,
                        latitude: true,
                        longitude: true
                    }
                },
                CoursePeriod: {
                    select: {
                        id: true,
                        name: true,
                        startDate: true,
                        endDate: true
                    }
                },
                Attendance: {
                    where: {
                        sessionDate,
                        cancelled: false
                    },
                    select: {
                        id: true,
                        checkInTime: true
                    }
                }
            }
        })

        // Check for breaks
        const tracksWithBreakCheck = await Promise.all(
            registrations.map(async (reg) => {
                const activeBreak = await prisma.periodBreak.findFirst({
                    where: {
                        OR: [
                            { periodId: reg.CoursePeriod.id, trackId: null },
                            { trackId: reg.CourseTrack.id }
                        ],
                        startDate: { lte: sessionDate },
                        endDate: { gte: sessionDate }
                    }
                })

                if (activeBreak) {
                    return null // Skip tracks on break
                }

                const attendance = reg.Attendance[0]
                const checkedInTime = attendance 
                    ? new Intl.DateTimeFormat('en-GB', { timeStyle: 'short' }).format(attendance.checkInTime)
                    : undefined

                return {
                    id: reg.CourseTrack.id,
                    title: reg.CourseTrack.title,
                    periodName: reg.CoursePeriod.name,
                    weekday: reg.CourseTrack.weekday,
                    timeStart: reg.CourseTrack.timeStart,
                    checkInWindowBefore: reg.CourseTrack.checkInWindowBefore ?? 30,
                    checkInWindowAfter: reg.CourseTrack.checkInWindowAfter ?? 30,
                    geofenceEnabled: reg.CourseTrack.geofenceEnabled,
                    geofenceRadius: reg.CourseTrack.geofenceRadius,
                    latitude: reg.CourseTrack.latitude,
                    longitude: reg.CourseTrack.longitude,
                    registrationId: reg.id,
                    alreadyCheckedIn: !!attendance,
                    checkedInTime,
                    periodStartDate: reg.CoursePeriod.startDate.toISOString(),
                    periodEndDate: reg.CoursePeriod.endDate.toISOString()
                }
            })
        )

        // Filter out null entries (tracks on break) and sort by class time
        const tracks = tracksWithBreakCheck
            .filter((t): t is NonNullable<typeof t> => t !== null)
            .sort((a, b) => a.timeStart.localeCompare(b.timeStart))

        return NextResponse.json({ tracks })
    } catch (error) {
        console.error('Error fetching check-in status:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

/**
 * POST /api/my/checkin
 * 
 * Performs self check-in for the authenticated user
 * Body: { trackId: string }
 */
export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { trackId, userLatitude, userLongitude } = body as { 
            trackId: string
            userLatitude?: number
            userLongitude?: number
        }

        if (!trackId) {
            return NextResponse.json({ error: 'trackId required' }, { status: 400 })
        }

        const now = new Date()
        const jsDayOfWeek = now.getDay()
        const isoDayOfWeek = jsDayOfWeek === 0 ? 7 : jsDayOfWeek
        const sessionDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

        // Find user's person profile and account ID
        const userAccount = await prisma.userAccount.findUnique({
            where: { supabaseUid: user.id },
            select: { 
                id: true,
                PersonProfile: { 
                    select: { id: true, firstName: true, lastName: true } 
                }
            }
        })

        if (!userAccount?.PersonProfile) {
            return NextResponse.json({ 
                success: false, 
                error: 'Profile not found. Please complete onboarding first.' 
            }, { status: 400 })
        }

        // Get track details
        const track = await prisma.courseTrack.findUnique({
            where: { id: trackId },
            select: {
                id: true,
                title: true,
                allowSelfCheckIn: true,
                allowDashboardCheckIn: true,
                geofenceEnabled: true,
                geofenceRadius: true,
                latitude: true,
                longitude: true,
                weekday: true,
                timeStart: true,
                checkInWindowBefore: true,
                checkInWindowAfter: true,
                CoursePeriod: {
                    select: { id: true, startDate: true, endDate: true }
                }
            }
        })

        if (!track) {
            return NextResponse.json({ success: false, error: 'Track not found' }, { status: 404 })
        }

        if (!track.allowDashboardCheckIn) {
            return NextResponse.json({ 
                success: false, 
                error: 'Dashboard check-in is not enabled for this course' 
            }, { status: 403 })
        }

        // Day-of-week check
        if (track.weekday !== isoDayOfWeek) {
            const weekdays = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            return NextResponse.json({
                success: false,
                error: `This class is on ${weekdays[track.weekday]}s, not today.`
            })
        }

        // Period check
        if (sessionDate < track.CoursePeriod.startDate || sessionDate > track.CoursePeriod.endDate) {
            return NextResponse.json({
                success: false,
                error: 'The course period is not currently active.'
            })
        }

        // Check-in window enforcement (includes period date validation)
        const windowError = validateCheckInWindow(
            track.timeStart, 
            track.checkInWindowBefore, 
            track.checkInWindowAfter,
            track.CoursePeriod.startDate,
            track.CoursePeriod.endDate
        )
        if (windowError) {
            return NextResponse.json({ success: false, error: windowError })
        }

        // Geofence validation
        if (track.geofenceEnabled) {
            if (!track.latitude || !track.longitude) {
                return NextResponse.json({
                    success: false,
                    error: 'Venue location not configured. Please contact the organizer.'
                })
            }

            if (userLatitude === undefined || userLongitude === undefined) {
                return NextResponse.json({
                    success: false,
                    error: 'Location required for check-in. Please enable location services.',
                    requiresLocation: true
                })
            }

            // Calculate distance using Haversine formula
            const R = 6371000 // Earth radius in meters
            const dLat = (userLatitude - track.latitude) * Math.PI / 180
            const dLon = (userLongitude - track.longitude) * Math.PI / 180
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(track.latitude * Math.PI / 180) * Math.cos(userLatitude * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2)
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
            const distance = R * c // Distance in meters

            const radius = track.geofenceRadius ?? 100
            if (distance > radius) {
                return NextResponse.json({
                    success: false,
                    error: `You are too far from the venue (${Math.round(distance)}m away). Check-in is only allowed within ${radius}m.`,
                    distance: Math.round(distance),
                    maxDistance: radius
                })
            }
        }

        // Check for break week
        const activeBreak = await prisma.periodBreak.findFirst({
            where: {
                OR: [
                    { periodId: track.CoursePeriod.id, trackId: null },
                    { trackId: track.id }
                ],
                startDate: { lte: sessionDate },
                endDate: { gte: sessionDate }
            }
        })

        if (activeBreak) {
            const desc = activeBreak.description ? ` (${activeBreak.description})` : ''
            return NextResponse.json({
                success: false,
                error: `No class today — this is a break week${desc}.`
            })
        }

        // Find user's registration for this track
        const registration = await prisma.registration.findFirst({
            where: {
                personId: userAccount.PersonProfile.id,
                trackId,
                status: 'ACTIVE'
            }
        })

        if (!registration) {
            return NextResponse.json({
                success: false,
                error: 'You are not registered for this course.'
            })
        }

        // Duplicate check
        const existing = await prisma.attendance.findUnique({
            where: {
                registrationId_trackId_sessionDate: {
                    registrationId: registration.id,
                    trackId,
                    sessionDate
                }
            }
        })

        if (existing && !existing.cancelled) {
            const checkedInTime = new Intl.DateTimeFormat('en-GB', { timeStyle: 'short' }).format(existing.checkInTime)
            return NextResponse.json({
                success: false,
                error: `Already checked in today at ${checkedInTime}`,
                alreadyCheckedIn: true
            })
        }

        // Record attendance
        const attendance = await prisma.attendance.create({
            data: {
                registrationId: registration.id,
                trackId,
                periodId: registration.periodId,
                sessionDate,
                checkInTime: now,
                checkedInBy: userAccount.id,
                method: 'SELF_CHECKIN'
            }
        })

        const checkedInTime = new Intl.DateTimeFormat('en-GB', { timeStyle: 'short' }).format(attendance.checkInTime)

        return NextResponse.json({
            success: true,
            message: 'Check-in successful!',
            trackTitle: track.title,
            checkedInTime,
            personName: `${userAccount.PersonProfile.firstName} ${userAccount.PersonProfile.lastName}`
        })
    } catch (error) {
        console.error('Self check-in error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
