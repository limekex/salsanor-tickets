import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createClient } from '@/utils/supabase/server'

/**
 * GET /api/staffadmin/analytics/conversions?organizerId=<id>&days=30
 *
 * Returns aggregated conversion tracking data for an organizer.
 * Requires the caller to be authenticated as ORG_ADMIN for the given organizer.
 */
export async function GET(request: NextRequest) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const organizerId = searchParams.get('organizerId')
    const days = Math.min(Math.max(Number(searchParams.get('days') ?? '30'), 1), 365)

    if (!organizerId) {
        return NextResponse.json({ error: 'organizerId is required' }, { status: 400 })
    }

    // Verify the user has ORG_ADMIN (or global ADMIN) access
    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: {
            UserAccountRole: {
                where: {
                    OR: [
                        { role: 'ADMIN' },
                        { role: 'ORG_ADMIN', organizerId },
                    ],
                },
            },
        },
    })

    if (!userAccount?.UserAccountRole.length) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const since = new Date()
    since.setDate(since.getDate() - days)

    const events = await prisma.conversionEvent.findMany({
        where: {
            organizerId,
            createdAt: { gte: since },
        },
        orderBy: { createdAt: 'asc' },
        select: {
            id: true,
            eventType: true,
            sessionId: true,
            utmSource: true,
            utmMedium: true,
            utmCampaign: true,
            externalUrl: true,
            metadata: true,
            createdAt: true,
        },
    })

    const clicks = events.filter((e) => e.eventType === 'OUTBOUND_CLICK')
    const conversions = events.filter((e) => e.eventType === 'CONVERSION')

    // Correlate conversions to clicks by sessionId
    const convertedSessions = new Set(
        conversions.map((c) => c.sessionId).filter(Boolean)
    )
    const correlatedCount = clicks.filter(
        (c) => c.sessionId && convertedSessions.has(c.sessionId)
    ).length

    // UTM source breakdown for clicks
    const utmBreakdown: Record<string, number> = {}
    for (const click of clicks) {
        const key = click.utmSource ?? '(direct)'
        utmBreakdown[key] = (utmBreakdown[key] ?? 0) + 1
    }

    return NextResponse.json({
        period: { days, since: since.toISOString() },
        summary: {
            totalClicks: clicks.length,
            totalConversions: conversions.length,
            correlatedConversions: correlatedCount,
            conversionRate:
                clicks.length > 0
                    ? Math.round((correlatedCount / clicks.length) * 10000) / 100
                    : 0,
        },
        utmBreakdown,
        events,
    })
}
