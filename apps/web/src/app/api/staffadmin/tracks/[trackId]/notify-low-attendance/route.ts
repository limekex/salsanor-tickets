import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createClient } from '@/utils/supabase/server'
import { emailService } from '@/lib/email/email-service'

/**
 * POST /api/staffadmin/tracks/[trackId]/notify-low-attendance
 *
 * Sends an attendance warning email to every active participant whose
 * attendance is below the given threshold (default 75%).
 *
 * Body (optional): { threshold: number }  — a value between 0 and 1
 */
export async function POST(
    req: Request,
    { params }: { params: Promise<{ trackId: string }> }
) {
    const { trackId } = await params

    // ── Auth ─────────────────────────────────────────────────────────────────
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: { UserAccountRole: true }
    })
    if (!userAccount) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = userAccount.UserAccountRole.some(r => r.role === 'ADMIN')
    const orgAdminIds = userAccount.UserAccountRole
        .filter(r => ['ORG_ADMIN', 'ORG_CHECKIN'].includes(r.role) && r.organizerId)
        .map(r => r.organizerId!)

    // ── Load track ────────────────────────────────────────────────────────────
    const track = await prisma.courseTrack.findUnique({
        where: { id: trackId },
        include: {
            CoursePeriod: { include: { Organizer: true } },
            Registration: {
                where: { status: 'ACTIVE' },
                include: {
                    PersonProfile: true,
                    Attendance: { where: { cancelled: false }, select: { id: true } }
                }
            }
        }
    })

    if (!track) return NextResponse.json({ error: 'Track not found' }, { status: 404 })

    if (!isAdmin && !orgAdminIds.includes(track.CoursePeriod.organizerId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ── Parse threshold ───────────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}))
    const threshold: number = typeof body.threshold === 'number'
        ? Math.min(Math.max(body.threshold, 0), 1)
        : 0.75

    // ── Compute scheduled sessions so far ────────────────────────────────────
    const today = new Date()
    const periodEnd = track.CoursePeriod.endDate > today ? today : track.CoursePeriod.endDate
    const weeksElapsed = track.CoursePeriod.startDate < periodEnd
        ? Math.max(Math.floor(
            (periodEnd.getTime() - track.CoursePeriod.startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
          ), 0)
        : 0

    if (weeksElapsed === 0) {
        return NextResponse.json({ message: 'No sessions yet — no emails sent', sent: 0, failed: 0 })
    }

    // ── Find low-attendance participants ──────────────────────────────────────
    const lowParticipants = track.Registration.filter(
        r => (r.Attendance.length / weeksElapsed) < threshold
    )

    if (lowParticipants.length === 0) {
        return NextResponse.json({ message: 'All participants meet the attendance threshold', sent: 0, failed: 0 })
    }

    // ── Send emails ───────────────────────────────────────────────────────────
    const thresholdPct = Math.round(threshold * 100)
    const organizerName = track.CoursePeriod.Organizer.name
    let sent = 0
    let failed = 0

    for (const reg of lowParticipants) {
        const attended = reg.Attendance.length
        const rate = Math.round((attended / weeksElapsed) * 100)
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
                organizerName,
                attended: String(attended),
                totalSessions: String(weeksElapsed),
                attendanceRate: String(rate),
                threshold: String(thresholdPct),
            },
        })
        if (result.success) {
            sent++
        } else {
            failed++
        }
    }

    return NextResponse.json({ sent, failed, total: lowParticipants.length })
}
