import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createClient } from '@/utils/supabase/server'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { CERTIFICATE_MIN_RATE, CERTIFICATE_MIN_SESSIONS } from '@/lib/attendance-certificate'

/**
 * GET /api/attendance-certificate?registrationId=<id>
 *
 * Returns a PDF attendance certificate for a participant's course registration.
 * The participant must be authenticated and the registration must belong to them.
 * Requires at least 75% attendance.
 */
export async function GET(req: Request) {
    const url = new URL(req.url)
    const registrationId = url.searchParams.get('registrationId')

    if (!registrationId) {
        return NextResponse.json({ error: 'registrationId required' }, { status: 400 })
    }

    // ── Auth ──────────────────────────────────────────────────────────────────
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: { PersonProfile: true }
    })
    if (!userAccount?.PersonProfile) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // ── Load registration ─────────────────────────────────────────────────────
    const registration = await prisma.registration.findUnique({
        where: { id: registrationId },
        include: {
            PersonProfile: true,
            CourseTrack: { include: { CoursePeriod: { include: { Organizer: true } } } },
            Attendance: { where: { cancelled: false }, select: { sessionDate: true } }
        }
    })

    if (!registration) {
        return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    }

    // Only the owner can download their own certificate
    if (registration.personId !== userAccount.PersonProfile.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ── Compute attendance ─────────────────────────────────────────────────────
    const today = new Date()
    const periodStart = registration.CourseTrack.CoursePeriod.startDate
    const periodEnd = registration.CourseTrack.CoursePeriod.endDate
    const periodEnded = periodEnd < today

    const refDate = periodEnd > today ? today : periodEnd
    const weeksElapsed = periodStart < refDate
        ? Math.max(Math.floor((refDate.getTime() - periodStart.getTime()) / (7 * 24 * 60 * 60 * 1000)), 0)
        : 0

    const attended = registration.Attendance.length
    const rate = weeksElapsed > 0 ? Math.round((attended / weeksElapsed) * 100) : 0

    if (weeksElapsed < CERTIFICATE_MIN_SESSIONS) {
        return NextResponse.json(
            { error: `Certificate available after ${CERTIFICATE_MIN_SESSIONS} sessions. Only ${weeksElapsed} sessions have elapsed.` },
            { status: 403 }
        )
    }

    if (rate < Math.round(CERTIFICATE_MIN_RATE * 100)) {
        return NextResponse.json(
            { error: `Attendance rate is ${rate}%. Certificate requires at least ${Math.round(CERTIFICATE_MIN_RATE * 100)}%.` },
            { status: 403 }
        )
    }

    // ── Generate PDF ──────────────────────────────────────────────────────────
    const profile = registration.PersonProfile
    const track = registration.CourseTrack
    const period = track.CoursePeriod
    const organizer = period.Organizer

    const participantName = `${profile.firstName} ${profile.lastName}`
    const issuedDate = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    const periodDateRange = `${periodStart.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} – ${periodEnd.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`

    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595, 842]) // A4
    const { width, height } = page.getSize()

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)

    const gold = rgb(0.8, 0.6, 0.1)
    const dark = rgb(0.1, 0.1, 0.15)
    const muted = rgb(0.4, 0.4, 0.45)

    // Background
    page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.99, 0.98, 0.95) })

    // Top border bar
    page.drawRectangle({ x: 0, y: height - 12, width, height: 12, color: gold })
    page.drawRectangle({ x: 0, y: 0, width, height: 12, color: gold })

    // Inner border
    page.drawRectangle({ x: 30, y: 30, width: width - 60, height: height - 60, borderColor: gold, borderWidth: 1.5, color: rgb(1, 1, 1) })

    // Title - centred
    const titleText = 'CERTIFICATE OF ATTENDANCE'
    const titleWidth = fontBold.widthOfTextAtSize(titleText, 22)
    page.drawText(titleText, { x: (width - titleWidth) / 2, y: height - 120, size: 22, font: fontBold, color: dark })

    // Subtitle
    const subtitleText = 'This is to certify that'
    const subW = fontRegular.widthOfTextAtSize(subtitleText, 13)
    page.drawText(subtitleText, { x: (width - subW) / 2, y: height - 165, size: 13, font: fontRegular, color: muted })

    // Participant name
    const nameW = fontBold.widthOfTextAtSize(participantName, 28)
    page.drawText(participantName, { x: (width - nameW) / 2, y: height - 220, size: 28, font: fontBold, color: dark })
    // Underline
    page.drawLine({ start: { x: (width - nameW) / 2, y: height - 225 }, end: { x: (width + nameW) / 2, y: height - 225 }, thickness: 1.2, color: gold })

    // Body text
    const bodyLines = [
        { text: 'has successfully attended', y: height - 270 },
        { text: track.title, bold: true, y: height - 305 },
        { text: period.name, y: height - 335 },
        { text: periodDateRange, y: height - 360 },
    ]
    for (const line of bodyLines) {
        const font = line.bold ? fontBold : fontRegular
        const size = line.bold ? 18 : 13
        const color = line.bold ? dark : muted
        const w = font.widthOfTextAtSize(line.text, size)
        page.drawText(line.text, { x: (width - w) / 2, y: line.y, size, font, color })
    }

    // Stats box
    const boxX = (width - 220) / 2
    page.drawRectangle({ x: boxX, y: height - 450, width: 220, height: 60, color: rgb(0.97, 0.95, 0.88), borderColor: gold, borderWidth: 1 })
    const statsLine1 = `${attended} sessions attended`
    const statsLine2 = `${rate}% attendance rate`
    const s1w = fontBold.widthOfTextAtSize(statsLine1, 13)
    const s2w = fontRegular.widthOfTextAtSize(statsLine2, 11)
    page.drawText(statsLine1, { x: boxX + (220 - s1w) / 2, y: height - 420, size: 13, font: fontBold, color: dark })
    page.drawText(statsLine2, { x: boxX + (220 - s2w) / 2, y: height - 438, size: 11, font: fontRegular, color: muted })

    // Issued by
    const issuedText = `Issued by ${organizer.name} on ${issuedDate}`
    const issuedW = fontRegular.widthOfTextAtSize(issuedText, 10)
    page.drawText(issuedText, { x: (width - issuedW) / 2, y: height - 510, size: 10, font: fontRegular, color: muted })

    // Status: completed or in progress
    const statusText = periodEnded ? '✓ Course completed' : '⏳ Course in progress'
    const statusW = fontRegular.widthOfTextAtSize(statusText, 10)
    page.drawText(statusText, { x: (width - statusW) / 2, y: height - 530, size: 10, font: fontRegular, color: muted })

    const pdfBytes = await pdfDoc.save()

    const safeFileName = `attendance-certificate-${participantName.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`

    return new Response(new Uint8Array(pdfBytes), {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${safeFileName}"`,
        },
    })
}
