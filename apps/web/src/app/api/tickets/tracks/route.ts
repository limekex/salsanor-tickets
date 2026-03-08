import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
    try {
        // Get user and their organization roles
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

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
                    },
                    include: {
                        Organizer: true
                    }
                }
            }
        })

        if (!userAccount || userAccount.UserAccountRole.length === 0) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        // Check if global admin
        const isGlobalAdmin = userAccount.UserAccountRole.some(r => r.role === 'ADMIN')
        
        // Get organizer IDs for org-specific roles
        const organizerIds = userAccount.UserAccountRole
            .filter(r => r.organizerId)
            .map(r => r.organizerId!)

        // Build where clause based on admin type
        // Filter for active periods (currently ongoing or future)
        const now = new Date()
        const whereClause = isGlobalAdmin 
            ? {
                CoursePeriod: {
                    endDate: { gte: now } // Period hasn't ended yet
                }
            }
            : {
                CoursePeriod: {
                    endDate: { gte: now },
                    organizerId: { in: organizerIds }
                }
            }

        const tracks = await prisma.courseTrack.findMany({
            where: whereClause,
            include: {
                CoursePeriod: {
                    select: {
                        name: true,
                        organizerId: true,
                        Organizer: {
                            select: {
                                name: true
                            }
                        }
                    }
                }
            },
            orderBy: [
                { CoursePeriod: { startDate: 'desc' } },
                { title: 'asc' }
            ]
        })

        // ================================================================
        // FETCH EVENTS FOR CHECK-IN
        // ================================================================
        // Filter for upcoming or ongoing events (started within last 24h or future)
        const eventCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000) // 24 hours ago
        
        const eventWhereClause = isGlobalAdmin
            ? {
                status: 'PUBLISHED' as const,
                startDateTime: { gte: eventCutoff }
            }
            : {
                status: 'PUBLISHED' as const,
                startDateTime: { gte: eventCutoff },
                organizerId: { in: organizerIds }
            }

        const events = await prisma.event.findMany({
            where: eventWhereClause,
            include: {
                Organizer: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                _count: {
                    select: {
                        EventTicket: true
                    }
                }
            },
            orderBy: [
                { startDateTime: 'asc' }
            ]
        })

        // Current ISO weekday: JS getDay() 0=Sun → ISO 7=Sun, 1-6 unchanged
        const jsDayOfWeek = now.getDay()
        const todayIsoWeekday = jsDayOfWeek === 0 ? 7 : jsDayOfWeek

        return NextResponse.json({
            tracks: tracks.map(track => ({
                id: track.id,
                title: track.title,
                periodName: `${track.CoursePeriod.Organizer.name} - ${track.CoursePeriod.name}`,
                organizerId: track.CoursePeriod.organizerId,
                weekday: track.weekday,
                timeStart: track.timeStart,
                availableToday: track.weekday === todayIsoWeekday,
                type: 'track'
            })),
            events: events.map(event => ({
                id: event.id,
                title: event.title,
                startDateTime: event.startDateTime,
                locationName: event.locationName,
                city: event.city,
                organizerName: event.Organizer.name,
                organizerId: event.organizerId,
                ticketCount: event._count.EventTicket,
                type: 'event'
            }))
        })
    } catch (error) {
        console.error('Error fetching tracks:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        return NextResponse.json({ 
            error: 'Internal server error', 
            tracks: [],
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
