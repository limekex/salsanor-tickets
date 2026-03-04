import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { randomUUID } from 'crypto'

/**
 * GET /api/track/outbound?url=<dest>&organizerId=<id>&utm_source=...
 *
 * Records an outbound link click as a ConversionEvent and redirects the user
 * to the destination URL. A session ID is generated so that a later conversion
 * webhook (POST /api/track/conversion) can be correlated with this click.
 *
 * The session ID is appended to the destination URL as `_rn_session` so
 * organizers can forward it from their external ticketing platform back to
 * the conversion webhook.
 */
export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl

    const url = searchParams.get('url')
    const organizerId = searchParams.get('organizerId')

    if (!url || !organizerId) {
        return NextResponse.json(
            { error: 'url and organizerId are required' },
            { status: 400 }
        )
    }

    // Basic URL validation – only allow http/https destinations
    let destination: URL
    try {
        destination = new URL(url)
        if (destination.protocol !== 'http:' && destination.protocol !== 'https:') {
            throw new Error('Invalid protocol')
        }
    } catch {
        return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
    }

    // Verify organizer exists
    const organizer = await prisma.organizer.findUnique({
        where: { id: organizerId },
        select: { id: true },
    })

    if (!organizer) {
        return NextResponse.json({ error: 'Organizer not found' }, { status: 404 })
    }

    const sessionId = randomUUID()

    // Append session ID to destination so external services can echo it back
    destination.searchParams.set('_rn_session', sessionId)

    const utmSource = searchParams.get('utm_source') ?? undefined
    const utmMedium = searchParams.get('utm_medium') ?? undefined
    const utmCampaign = searchParams.get('utm_campaign') ?? undefined
    const utmContent = searchParams.get('utm_content') ?? undefined
    const utmTerm = searchParams.get('utm_term') ?? undefined
    const referrer = request.headers.get('referer') ?? undefined

    // Persist the click asynchronously (fire-and-forget with error swallowing
    // so a DB issue never blocks the redirect)
    prisma.conversionEvent
        .create({
            data: {
                organizerId,
                eventType: 'OUTBOUND_CLICK',
                sessionId,
                externalUrl: url,
                utmSource,
                utmMedium,
                utmCampaign,
                utmContent,
                utmTerm,
                referrer,
            },
        })
        .catch((err) => console.error('[track/outbound] Failed to persist click:', err))

    return NextResponse.redirect(destination.toString(), { status: 302 })
}
