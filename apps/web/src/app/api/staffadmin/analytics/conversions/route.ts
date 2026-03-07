import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createClient } from '@/utils/supabase/server'

/**
 * GET /api/staffadmin/analytics/conversions?organizerId=<id>&days=30
 *
 * Returns aggregated UTM attribution data for paid orders belonging to an
 * organizer. Requires the caller to be authenticated as ORG_ADMIN (or global
 * ADMIN) for the given organizer.
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

    const orders = await prisma.order.findMany({
        where: {
            organizerId,
            status: 'PAID',
            createdAt: { gte: since },
        },
        select: {
            id: true,
            orderNumber: true,
            totalCents: true,
            currency: true,
            utmSource: true,
            utmMedium: true,
            utmCampaign: true,
            utmContent: true,
            utmTerm: true,
            utmReferrer: true,
            createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
    })

    const totalRevenue = orders.reduce((sum, o) => sum + o.totalCents, 0)
    const ordersWithUtm = orders.filter((o) => o.utmSource)

    // UTM source breakdown
    const utmBreakdown: Record<string, { count: number; revenueCents: number }> = {}
    for (const order of orders) {
        const key = order.utmSource ?? '(direct)'
        if (!utmBreakdown[key]) utmBreakdown[key] = { count: 0, revenueCents: 0 }
        utmBreakdown[key].count++
        utmBreakdown[key].revenueCents += order.totalCents
    }

    return NextResponse.json({
        period: { days, since: since.toISOString() },
        summary: {
            totalOrders: orders.length,
            totalRevenueCents: totalRevenue,
            ordersWithUtm: ordersWithUtm.length,
            attributedRevenueCents: ordersWithUtm.reduce((s, o) => s + o.totalCents, 0),
        },
        utmBreakdown,
        orders,
    })
}
