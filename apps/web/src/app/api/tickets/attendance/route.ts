import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createClient } from '@/utils/supabase/server'

export async function GET(req: Request) {
    try {
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
                    }
                }
            }
        })

        if (!userAccount || userAccount.UserAccountRole.length === 0) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        const { searchParams } = new URL(req.url)
        const trackId = searchParams.get('trackId')

        if (!trackId) {
            return NextResponse.json({ error: 'trackId required' }, { status: 400 })
        }

        // Session date = start of today in UTC (matches how attendance records are stored in validate route)
        const now = new Date()
        const sessionDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

        const attendances = await prisma.attendance.findMany({
            where: {
                trackId,
                sessionDate,
                cancelled: false
            },
            include: {
                Registration: {
                    include: {
                        PersonProfile: {
                            select: {
                                firstName: true,
                                lastName: true
                            }
                        }
                    }
                }
            },
            orderBy: { checkInTime: 'asc' }
        })

        // Total registered (active) for this track
        const totalRegistered = await prisma.registration.count({
            where: { trackId, status: 'ACTIVE' }
        })

        return NextResponse.json({
            sessionDate: sessionDate.toISOString(),
            totalRegistered,
            attendances: attendances.map(a => ({
                id: a.id,
                personName: `${a.Registration.PersonProfile.firstName} ${a.Registration.PersonProfile.lastName}`,
                checkInTime: a.checkInTime.toISOString(),
                chosenRole: a.Registration.chosenRole
            }))
        })
    } catch (error) {
        console.error('Error fetching attendance:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
