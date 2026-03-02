import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createClient } from '@/utils/supabase/server'

async function authorizeCheckinUser() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: {
            UserAccountRole: {
                where: {
                    OR: [
                        { role: 'ADMIN' },
                        { role: 'ORG_ADMIN' },
                        { role: 'ORG_CHECKIN' }
                    ]
                }
            }
        }
    })

    if (!userAccount || userAccount.UserAccountRole.length === 0) return null
    return userAccount
}

export async function GET(req: Request) {
    try {
        const userAccount = await authorizeCheckinUser()
        if (!userAccount) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const trackId = searchParams.get('trackId')

        if (!trackId) {
            return NextResponse.json({ error: 'trackId required' }, { status: 400 })
        }

        // Session date = start of today in UTC (matches how attendance records are stored in validate route)
        const now = new Date()
        const sessionDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

        // Fetch today's check-ins and all active registrations in parallel
        const [attendances, registrations] = await Promise.all([
            prisma.attendance.findMany({
                where: { trackId, sessionDate, cancelled: false },
                include: {
                    Registration: {
                        include: {
                            PersonProfile: { select: { firstName: true, lastName: true } }
                        }
                    }
                },
                orderBy: { checkInTime: 'asc' }
            }),
            prisma.registration.findMany({
                where: { trackId, status: 'ACTIVE' },
                include: {
                    PersonProfile: { select: { firstName: true, lastName: true } }
                },
                orderBy: [
                    { PersonProfile: { lastName: 'asc' } },
                    { PersonProfile: { firstName: 'asc' } }
                ]
            })
        ])

        const checkedInRegistrationIds = new Set(attendances.map(a => a.registrationId))

        const notCheckedIn = registrations
            .filter(r => !checkedInRegistrationIds.has(r.id))
            .map(r => ({
                registrationId: r.id,
                personName: `${r.PersonProfile.firstName} ${r.PersonProfile.lastName}`,
                chosenRole: r.chosenRole
            }))

        return NextResponse.json({
            sessionDate: sessionDate.toISOString(),
            totalRegistered: registrations.length,
            attendances: attendances.map(a => ({
                id: a.id,
                personName: `${a.Registration.PersonProfile.firstName} ${a.Registration.PersonProfile.lastName}`,
                checkInTime: a.checkInTime.toISOString(),
                chosenRole: a.Registration.chosenRole
            })),
            notCheckedIn
        })
    } catch (error) {
        console.error('Error fetching attendance:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const userAccount = await authorizeCheckinUser()
        if (!userAccount) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { registrationId, trackId } = await req.json()

        if (!registrationId || !trackId) {
            return NextResponse.json({ error: 'registrationId and trackId required' }, { status: 400 })
        }

        const registration = await prisma.registration.findUnique({
            where: { id: registrationId },
            include: {
                PersonProfile: { select: { firstName: true, lastName: true } },
                CourseTrack: true
            }
        })

        if (!registration || registration.status !== 'ACTIVE') {
            return NextResponse.json({ error: 'Registration not found or inactive' }, { status: 404 })
        }

        if (registration.trackId !== trackId) {
            return NextResponse.json({ error: 'Registration does not belong to this track' }, { status: 400 })
        }

        // Apply the same day-of-week restriction as QR check-in
        const now = new Date()
        const jsDayOfWeek = now.getDay()
        const isoDayOfWeek = jsDayOfWeek === 0 ? 7 : jsDayOfWeek
        const track = registration.CourseTrack

        if (track.weekday !== isoDayOfWeek) {
            const weekdays = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            const scheduledDay = weekdays[track.weekday] ?? `day ${track.weekday}`
            return NextResponse.json({
                success: false,
                message: `Check-in is only available on ${scheduledDay}s.`,
                wrongDay: true
            }, { status: 422 })
        }

        const sessionDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

        // Prevent duplicates
        const existing = await prisma.attendance.findUnique({
            where: {
                registrationId_trackId_sessionDate: { registrationId, trackId, sessionDate }
            }
        })

        if (existing && !existing.cancelled) {
            const checkedInTime = new Intl.DateTimeFormat('en-GB', {
                dateStyle: 'short',
                timeStyle: 'short'
            }).format(existing.checkInTime)
            return NextResponse.json({
                success: false,
                message: `Already checked in today at ${checkedInTime}`,
                alreadyCheckedIn: true
            }, { status: 409 })
        }

        await prisma.attendance.create({
            data: {
                registrationId,
                trackId,
                periodId: registration.periodId,
                sessionDate,
                checkInTime: now,
                checkedInBy: userAccount.id,
                method: 'MANUAL'
            }
        })

        return NextResponse.json({
            success: true,
            personName: `${registration.PersonProfile.firstName} ${registration.PersonProfile.lastName}`
        })
    } catch (error) {
        console.error('Error recording manual check-in:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
