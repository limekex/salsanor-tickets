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

        return NextResponse.json({
            tracks: tracks.map(track => ({
                id: track.id,
                title: track.title,
                periodName: `${track.CoursePeriod.Organizer.name} - ${track.CoursePeriod.name}`,
                organizerId: track.CoursePeriod.organizerId
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
