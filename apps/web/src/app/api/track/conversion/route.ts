import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createHmac, timingSafeEqual } from 'crypto'

/**
 * POST /api/track/conversion
 *
 * Receives a conversion confirmation from an external ticketing platform
 * (e.g. letsreg) and stores a CONVERSION event in the database.
 *
 * Request body (JSON):
 * {
 *   organizerId: string   – identifies the organizer
 *   sessionId?: string    – the _rn_session value forwarded from the outbound link
 *   value?: number        – order value (e.g. ticket price in NOK)
 *   currency?: string     – ISO 4217 currency code, defaults to "NOK"
 *   externalRef?: string  – external order / booking ID
 * }
 *
 * Authentication:
 * Requests must include an HMAC-SHA256 signature in the
 * `X-RegiNor-Signature` header, computed over the raw request body
 * using the organizer's `conversionWebhookSecret`.
 *
 * Signature format: sha256=<hex digest>
 */
export async function POST(request: NextRequest) {
    const rawBody = await request.text()

    let body: {
        organizerId?: string
        sessionId?: string
        value?: number
        currency?: string
        externalRef?: string
    }

    try {
        body = JSON.parse(rawBody)
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const { organizerId, sessionId, value, currency = 'NOK', externalRef } = body

    if (!organizerId) {
        return NextResponse.json({ error: 'organizerId is required' }, { status: 400 })
    }

    // Fetch organizer and its webhook secret
    const organizer = await prisma.organizer.findUnique({
        where: { id: organizerId },
        select: { id: true, conversionWebhookSecret: true },
    })

    if (!organizer) {
        return NextResponse.json({ error: 'Organizer not found' }, { status: 404 })
    }

    // If the organizer has configured a webhook secret, verify the signature
    if (organizer.conversionWebhookSecret) {
        const signature = request.headers.get('x-reginor-signature') ?? ''
        const expectedHex = createHmac('sha256', organizer.conversionWebhookSecret)
            .update(rawBody)
            .digest('hex')
        const expected = `sha256=${expectedHex}`

        // Reject immediately if lengths differ to avoid timing leaks
        if (
            signature.length !== expected.length ||
            !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
        ) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
        }
    }

    await prisma.conversionEvent.create({
        data: {
            organizerId,
            eventType: 'CONVERSION',
            sessionId: sessionId ?? null,
            metadata: {
                value: value ?? null,
                currency,
                externalRef: externalRef ?? null,
            },
        },
    })

    return NextResponse.json({ success: true }, { status: 200 })
}
