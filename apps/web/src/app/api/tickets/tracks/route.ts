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
                roles: {
                    where: {
                        OR: [
                            { role: 'ADMIN' },
                            { role: 'ORG_ADMIN' },
                            { role: 'ORG_CHECKIN' }
                        ]
                    },
                    include: {
                        organizer: true
                    }
                }
            }
        })

        if (!userAccount || userAccount.roles.length === 0) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        // Check if global admin
        const isGlobalAdmin = userAccount.roles.some(r => r.role === 'ADMIN')
        
        // Get organizer IDs for org-specific roles
        const organizerIds = userAccount.roles
            .filter(r => r.organizerId)
            .map(r => r.organizerId!)

        // Build where clause based on admin type
        // Filter for active periods (currently ongoing or future)
        const now = new Date()
        const whereClause = isGlobalAdmin 
            ? {
                period: {
                    endDate: { gte: now } // Period hasn't ended yet
                }
            }
            : {
                period: {
                    endDate: { gte: now },
                    organizerId: { in: organizerIds }
                }
            }

        const tracks = await prisma.courseTrack.findMany({
            where: whereClause,
            include: {
                period: {
                    select: {
                        name: true,
                        organizerId: true,
                        organizer: {
                            select: {
                                name: true
                            }
                        }
                    }
                }
            },
            orderBy: [
                { period: { startDate: 'desc' } },
                { title: 'asc' }
            ]
        })

        return NextResponse.json({
            tracks: tracks.map(track => ({
                id: track.id,
                title: track.title,
                periodName: `${track.period.organizer.name} - ${track.period.name}`,
                organizerId: track.period.organizerId
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
