import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { validateCheckInWindow } from '@/lib/checkin-window'

/**
 * POST /api/selfcheckin
 *
 * Participant self check-in endpoint — no staff auth required.
 * The track must have `allowSelfCheckIn = true`.
 *
 * Body (one of):
 *   { token: string, trackId: string }  — QR ticket token
 *   { phone: string, trackId: string }  — phone number lookup
 */
export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { token, phone, trackId } = body as {
            token?: string
            phone?: string
            trackId: string
        }

        if (!trackId) {
            return NextResponse.json({ error: 'trackId required' }, { status: 400 })
        }
        if (!token && !phone) {
            return NextResponse.json({ error: 'token or phone required' }, { status: 400 })
        }

        // Validate track
        const track = await prisma.courseTrack.findUnique({
            where: { id: trackId },
            include: { CoursePeriod: { select: { id: true, name: true, startDate: true, endDate: true } } }
        })

        if (!track) {
            return NextResponse.json({ valid: false, message: 'Track not found' }, { status: 404 })
        }
        if (!track.allowSelfCheckIn) {
            return NextResponse.json({
                valid: false,
                message: 'Self check-in is not enabled for this course'
            }, { status: 403 })
        }

        // Day-of-week check
        const now = new Date()
        const jsDayOfWeek = now.getDay()
        const isoDayOfWeek = jsDayOfWeek === 0 ? 7 : jsDayOfWeek

        if (track.weekday !== isoDayOfWeek) {
            const weekdays = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            const scheduledDay = weekdays[track.weekday] ?? `day ${track.weekday}`
            return NextResponse.json({
                valid: false,
                message: `Check-in is only available on ${scheduledDay}s.`,
                wrongDay: true
            })
        }

        const sessionDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

        // Check-in window enforcement (includes period date validation)
        const windowError = validateCheckInWindow(
            track.timeStart, 
            track.checkInWindowBefore, 
            track.checkInWindowAfter,
            track.CoursePeriod.startDate,
            track.CoursePeriod.endDate
        )
        if (windowError) {
            return NextResponse.json({ valid: false, message: windowError, outsideWindow: true })
        }

        // Break week check (period-wide or track-specific)
        const activeBreak = await prisma.periodBreak.findFirst({
            where: {
                OR: [
                    // Period-wide break (no specific track)
                    { periodId: track.CoursePeriod.id, trackId: null },
                    // Track-specific break
                    { trackId: track.id }
                ],
                startDate: { lte: sessionDate },
                endDate: { gte: sessionDate }
            }
        })
        if (activeBreak) {
            const desc = activeBreak.description ? ` (${activeBreak.description})` : ''
            return NextResponse.json({
                valid: false,
                message: `No class today — this is a break week${desc}.`,
                wrongDay: true
            })
        }

        // Resolve registration from token or phone
        let personId: string | null = null

        if (token) {
            const ticket = await prisma.ticket.findFirst({
                where: { qrTokenHash: token },
                select: { personId: true }
            })
            if (!ticket) {
                return NextResponse.json({ valid: false, message: 'Invalid QR code' })
            }
            personId = ticket.personId
        } else if (phone) {
            // Normalize input phone to digits only (keep leading country code digits)
            const normalizedInput = phone.replace(/[\s\-().\+]/g, '')
            
            // Find person by checking registrations for this track - more efficient than scanning all profiles
            const trackRegistrations = await prisma.registration.findMany({
                where: {
                    trackId,
                    status: 'ACTIVE',
                    PersonProfile: { phone: { not: null } }
                },
                select: {
                    id: true,
                    PersonProfile: { select: { id: true, phone: true } }
                }
            })
            
            const matchingReg = trackRegistrations.find(r => {
                if (!r.PersonProfile.phone) return false
                const normalizedDb = r.PersonProfile.phone.replace(/[\s\-().\+]/g, '')
                // Match if normalized values are equal, or if one ends with the other (for country code variations)
                return normalizedDb === normalizedInput || 
                       normalizedDb.endsWith(normalizedInput) || 
                       normalizedInput.endsWith(normalizedDb)
            })
            
            if (!matchingReg) {
                return NextResponse.json({
                    valid: false,
                    message: 'No active registration found for this track with that phone number'
                })
            }
            personId = matchingReg.PersonProfile.id
        }

        if (!personId) {
            return NextResponse.json({ valid: false, message: 'Could not identify participant' })
        }

        // Find active registration for this track
        const registration = await prisma.registration.findFirst({
            where: { personId, trackId, status: 'ACTIVE' },
            include: {
                PersonProfile: {
                    select: { firstName: true, lastName: true, userId: true }
                }
            }
        })

        if (!registration) {
            return NextResponse.json({
                valid: false,
                message: 'No active registration found for this track'
            })
        }

        const userAccountId = registration.PersonProfile.userId
        if (!userAccountId) {
            return NextResponse.json({
                valid: false,
                message: 'Participant account not linked. Please ask staff to check you in.'
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
                valid: false,
                message: `Already checked in today at ${checkedInTime}`,
                alreadyCheckedIn: true,
                personName: `${registration.PersonProfile.firstName} ${registration.PersonProfile.lastName}`
            })
        }

        // Record attendance
        await prisma.attendance.create({
            data: {
                registrationId: registration.id,
                trackId,
                periodId: registration.periodId,
                sessionDate,
                checkInTime: now,
                checkedInBy: userAccountId,
                method: 'SELF_CHECKIN'
            }
        })

        return NextResponse.json({
            valid: true,
            personName: `${registration.PersonProfile.firstName} ${registration.PersonProfile.lastName}`,
            message: 'Check-in successful! Welcome to class 🎉'
        })
    } catch (error) {
        console.error('Self check-in error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

/**
 * GET /api/selfcheckin?trackId=xxx
 *
 * Returns basic info about the track (title, period) to display on the self check-in page.
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const trackId = searchParams.get('trackId')

        if (!trackId) {
            return NextResponse.json({ error: 'trackId required' }, { status: 400 })
        }

        const track = await prisma.courseTrack.findUnique({
            where: { id: trackId },
            select: {
                id: true,
                title: true,
                allowSelfCheckIn: true,
                weekday: true,
                timeStart: true,
                checkInWindowBefore: true,
                checkInWindowAfter: true,
                CoursePeriod: { select: { name: true, startDate: true, endDate: true } }
            }
        })

        if (!track) {
            return NextResponse.json({ error: 'Track not found' }, { status: 404 })
        }

        return NextResponse.json({
            id: track.id,
            title: track.title,
            periodName: track.CoursePeriod.name,
            allowSelfCheckIn: track.allowSelfCheckIn,
            weekday: track.weekday,
            timeStart: track.timeStart,
            checkInWindowBefore: track.checkInWindowBefore ?? 30,
            checkInWindowAfter: track.checkInWindowAfter ?? 30,
            periodStartDate: track.CoursePeriod.startDate,
            periodEndDate: track.CoursePeriod.endDate
        })
    } catch (error) {
        console.error('Self check-in track lookup error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
