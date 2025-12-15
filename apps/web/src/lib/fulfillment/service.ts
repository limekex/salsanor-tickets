
import { prisma } from '@/lib/db'

export async function fulfillOrder(orderId: string, providerRef: string) {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { registrations: true }
    })

    if (!order) {
        console.error(`Fulfillment: Order ${orderId} not found`)
        return
    }

    if (order.status === 'PAID') {
        console.log(`Fulfillment: Order ${orderId} already paid`)
        return
    }

    // atomic transaction
    await prisma.$transaction(async (tx) => {
        // 1. Update Order
        await tx.order.update({
            where: { id: orderId },
            data: {
                status: 'PAID',
                payments: {
                    create: {
                        provider: 'STRIPE',
                        providerPaymentRef: providerRef,
                        amountCents: order.totalCents,
                        status: 'SUCCEEDED',
                        rawPayload: {}, // could store webhook body if passed
                    }
                }
            }
        })

        // 2. Activate Registrations
        await tx.registration.updateMany({
            where: { orderId: orderId },
            data: { status: 'ACTIVE' }
        })

        // 3. Generate Ticket(s)?
        // For MVP, one ticket per person per period.
        // If order covers multiple people (future), we loop.
        // For now, assume Single Purchaser = Person.
        // Spec says: Ticket @@unique([periodId, personId]).
        // If user buys 2 tracks in same period, they get ONE ticket that grants access to both?
        // Or check-in app checks registrations directly? 
        // Spec: "Ticket: QR entitlement linked to a person and period".
        // SO: We check if ticket exists, if not create it.

        const existingTicket = await tx.ticket.findUnique({
            where: {
                periodId_personId: {
                    periodId: order.periodId,
                    personId: order.purchaserPersonId
                }
            }
        })

        if (!existingTicket) {
            const qrPayload = `${order.periodId}:${order.purchaserPersonId}:${Date.now()}`
            // In real app, sign this jwt/hash.
            const hash = qrPayload // simplified

            await tx.ticket.create({
                data: {
                    periodId: order.periodId,
                    personId: order.purchaserPersonId,
                    qrTokenHash: hash,
                    status: 'ACTIVE'
                }
            })
        }
    })

    console.log(`Fulfillment: Order ${orderId} fulfilled successfully.`)
}
