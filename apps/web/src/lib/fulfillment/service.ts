
import { prisma } from '@/lib/db'
import { randomUUID } from 'crypto'
import { generateQRToken } from '@/lib/tickets/qr-generator'

export async function fulfillOrder(orderId: string, providerRef: string, stripeChargeId?: string, stripeTransactionId?: string) {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { 
            Registration: true,
            EventRegistration: true,
            Membership: true,
            Organizer: true,
            PersonProfile: true
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
        // 1. Generate order number if not exists
        let orderNumber = order.orderNumber
        if (!orderNumber) {
            const organizer = order.Organizer
            const prefix = organizer.orderPrefix || 'ORD'
            const nextNum = organizer.nextOrderNumber
            orderNumber = `${prefix}-${String(nextNum).padStart(5, '0')}`
            
            // Update organizer's next order number
            await tx.organizer.update({
                where: { id: organizer.id },
                data: { nextOrderNumber: nextNum + 1 }
            })
        }
        
        // 2. Create Payment record
        await tx.payment.create({
            data: {
                id: randomUUID(),
                orderId: orderId,
                provider: 'STRIPE',
                providerPaymentRef: providerRef,
                amountCents: order.totalCents,
                status: 'SUCCEEDED',
                rawPayload: {}, // could store webhook body if passed
            }
        })
        
        // 2. Create Invoice for the order
        const purchaser = order.PersonProfile
        const customerName = `${purchaser.firstName} ${purchaser.lastName}`.trim() || 'N/A'
        const customerEmail = purchaser.email || 'no-email@provided.com'
        
        await tx.invoice.create({
            data: {
                id: randomUUID(),
                orderId: orderId,
                organizerId: order.organizerId,
                invoiceNumber: `INV-${Date.now()}-${orderId.slice(0, 8).toUpperCase()}`,
                invoiceDate: new Date(),
                dueDate: new Date(), // Due upon receipt
                customerName,
                customerEmail,
                subtotalCents: order.subtotalAfterDiscountCents,
                mvaRate: order.mvaRate,
                mvaCents: order.mvaCents,
                totalCents: order.totalCents,
                status: 'PAID', // Order is already paid at this point
                paidAt: new Date(),
                paidAmount: order.totalCents
            }
        })
        
        // 3. Update Order status with order number and Stripe references
        await tx.order.update({
            where: { id: orderId },
            data: {
                status: 'PAID',
                orderNumber,
                stripeChargeId,
                stripeTransactionId,
            }
        })

        // 4. Handle fulfillment based on order type
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
                    const qrToken = generateQRToken('COURSE_PERIOD', order.periodId, order.purchaserPersonId)

                    await tx.ticket.create({
                        data: {
                            id: randomUUID(),
                            periodId: order.periodId,
                            personId: order.purchaserPersonId,
                            qrTokenHash: qrToken,
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
                include: { MembershipTier: true }
            })

            console.log('[Fulfillment] Processing memberships:', {
                orderId,
                count: memberships.length,
                memberships: memberships.map(m => ({
                    id: m.id,
                    tierName: m.MembershipTier.name,
                    validationRequired: m.MembershipTier.validationRequired,
                    currentStatus: m.status
                }))
            })

            for (const membership of memberships) {
                // If tier requires validation, keep status as PENDING_PAYMENT for admin review
                // Otherwise, activate immediately
                const newStatus = membership.MembershipTier.validationRequired ? 'PENDING_PAYMENT' : 'ACTIVE'
                
                console.log('[Fulfillment] Updating membership:', {
                    membershipId: membership.id,
                    tierName: membership.MembershipTier.name,
                    validationRequired: membership.MembershipTier.validationRequired,
                    oldStatus: membership.status,
                    newStatus
                })
                
                await tx.membership.update({
                    where: { id: membership.id },
                    data: { status: newStatus }
                })
            }
        } else if (order.orderType === 'EVENT') {
            // Activate event registrations
            await tx.eventRegistration.updateMany({
                where: { orderId: orderId },
                data: { status: 'ACTIVE' }
            })

            // Generate unique EventTicket for EACH ticket in the order (quantity)
            for (const eventReg of order.EventRegistration) {
                // Generate quantity number of tickets, each with unique QR code
                for (let i = 0; i < eventReg.quantity; i++) {
                    const qrToken = generateQRToken('EVENT', eventReg.eventId, order.purchaserPersonId, randomUUID())

                    await tx.eventTicket.create({
                        data: {
                            id: randomUUID(),
                            eventId: eventReg.eventId,
                            personId: order.purchaserPersonId,
                            registrationId: eventReg.id,
                            ticketNumber: i + 1,
                            qrTokenHash: qrToken,
                            status: 'ACTIVE'
                        }
                    })
                }
            }
        }
    })

    console.log(`Fulfillment: Order ${orderId} (${order.orderType}) fulfilled successfully.`)
}
