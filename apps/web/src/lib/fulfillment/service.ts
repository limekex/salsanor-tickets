
import { prisma } from '@/lib/db'

export async function fulfillOrder(orderId: string, providerRef: string) {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { 
            registrations: true,
            memberships: true
        }
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

        // 2. Handle fulfillment based on order type
        if (order.orderType === 'COURSE_PERIOD') {
            // Activate course registrations
            await tx.registration.updateMany({
                where: { orderId: orderId },
                data: { status: 'ACTIVE' }
            })

            // Generate Ticket for period access
            // For MVP, one ticket per person per period.
            // Spec: Ticket @@unique([periodId, personId]).
            // If user buys 2 tracks in same period, they get ONE ticket that grants access to both.
            
            if (order.periodId) {
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
            }
        } else if (order.orderType === 'MEMBERSHIP') {
            // For memberships, check if validation is required
            // Get the membership(s) to check tier settings
            const memberships = await tx.membership.findMany({
                where: { orderId: orderId },
                include: { tier: true }
            })

            console.log('[Fulfillment] Processing memberships:', {
                orderId,
                count: memberships.length,
                memberships: memberships.map(m => ({
                    id: m.id,
                    tierName: m.tier.name,
                    validationRequired: m.tier.validationRequired,
                    currentStatus: m.status
                }))
            })

            for (const membership of memberships) {
                // If tier requires validation, keep status as PENDING_PAYMENT for admin review
                // Otherwise, activate immediately
                const newStatus = membership.tier.validationRequired ? 'PENDING_PAYMENT' : 'ACTIVE'
                
                console.log('[Fulfillment] Updating membership:', {
                    membershipId: membership.id,
                    tierName: membership.tier.name,
                    validationRequired: membership.tier.validationRequired,
                    oldStatus: membership.status,
                    newStatus
                })
                
                await tx.membership.update({
                    where: { id: membership.id },
                    data: { status: newStatus }
                })
            }
        } else if (order.orderType === 'EVENT') {
            // Future: Handle event registrations
            await tx.eventRegistration.updateMany({
                where: { orderId: orderId },
                data: { status: 'ACTIVE' }
            })
        }
    })

    console.log(`Fulfillment: Order ${orderId} (${order.orderType}) fulfilled successfully.`)
}
