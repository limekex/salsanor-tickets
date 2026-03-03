import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createClient } from '@/utils/supabase/server'

export async function GET(req: Request) {
    try {
        // Auth check
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const trackId = searchParams.get('trackId')

        if (!trackId) {
            return NextResponse.json({ error: 'trackId required' }, { status: 400 })
        }

        // Fetch track with org access check
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
                    include: {
                        PersonProfile: {
                            select: { firstName: true, lastName: true, email: true }
                        },
                        Attendance: {
                            where: { cancelled: false, trackId },
                            orderBy: { sessionDate: 'asc' }
                        }
                    }
                }
            }
        })

        if (!track) {
            return NextResponse.json({ error: 'Track not found' }, { status: 404 })
        }

        // Verify user has org access
        const userAccount = await prisma.userAccount.findUnique({
            where: { supabaseUid: user.id },
            include: {
                UserAccountRole: {
                    where: {
                        organizerId: track.CoursePeriod.organizerId,
                        role: { in: ['ORG_ADMIN', 'ORG_FINANCE'] }
                    }
                }
            }
        })

        if (!userAccount?.UserAccountRole.length) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        const period = track.CoursePeriod
        
        // Get all session dates (past only)
        const sessionDates = getSessionDates(
            period.startDate, 
            period.endDate, 
            track.weekday, 
            period.PeriodBreak
        )

        // Build CSV
        const headers = [
            'Participant',
            'Email',
            'Role',
            ...sessionDates.map(d => formatDate(d)),
            'Total Attended',
            'Attendance %'
        ]

        const rows = track.Registration.map(reg => {
            const attendanceDates = new Set(
                reg.Attendance.map(a => a.sessionDate.toISOString().split('T')[0])
            )
            
            const sessionColumns = sessionDates.map(d => {
                const dateKey = d.toISOString().split('T')[0]
                return attendanceDates.has(dateKey) ? 'Yes' : 'No'
            })

            const totalAttended = reg.Attendance.length
            const attendanceRate = sessionDates.length > 0 
                ? Math.round((totalAttended / sessionDates.length) * 100) 
                : 0

            return [
                `${reg.PersonProfile.firstName} ${reg.PersonProfile.lastName}`,
                reg.PersonProfile.email || '',
                reg.chosenRole,
                ...sessionColumns,
                totalAttended.toString(),
                `${attendanceRate}%`
            ]
        })

        // Sort by attendance rate (highest first)
        rows.sort((a, b) => {
            const rateA = parseInt(a[a.length - 1]) || 0
            const rateB = parseInt(b[b.length - 1]) || 0
            return rateB - rateA
        })

        // Generate CSV content
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
        ].join('\n')

        return new NextResponse(csvContent, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="attendance.csv"`
            }
        })
    } catch (error) {
        console.error('Export error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(date)
}

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
