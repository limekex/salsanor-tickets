'use server'

import { prisma } from '@/lib/db'
import { requireAdmin } from '@/utils/auth-admin'
import { createAuditLog } from '@/lib/audit'

/**
 * Generate invoice for a paid order
 * 
 * Norwegian requirements:
 * - Sequential invoice numbers per organization
 * - Organization number for B2B customers
 * - Clear MVA breakdown
 * - Due date and payment terms
 * - Bank account information
 */
export async function generateInvoice(orderId: string) {
    // Get order with all related data
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
            CoursePeriod: {
                include: {
                    Organizer: true
                }
            },
            PersonProfile: {
                include: {
                    UserAccount: true
                }
            },
            Registration: {
                include: {
                    CourseTrack: true
                }
            },
            Payment: true
        }
    })

    if (!order) {
        throw new Error('Order not found')
    }

    if (order.status !== 'PAID') {
        throw new Error('Can only generate invoice for paid orders')
    }

    if (!order.CoursePeriod) {
        throw new Error('Order has no associated period')
    }

    // Check if invoice already exists
    const existingInvoice = await prisma.invoice.findUnique({
        where: { orderId }
    })

    if (existingInvoice) {
        return existingInvoice
    }

    // Get next invoice number for this organizer (atomic increment)
    const organizer = await prisma.organizer.update({
        where: { id: order.CoursePeriod.Organizer.id },
        data: {
            nextInvoiceNumber: {
                increment: 1
            }
        }
    })

    const invoiceNumber = `${organizer.invoicePrefix}-${String(organizer.nextInvoiceNumber).padStart(4, '0')}`

    // Determine customer org.nr if available
    // This could come from PersonProfile if we add business customer support
    const customerOrgNr = null // TODO: Add if B2B customer

    // Calculate due date (default: 14 days)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 14)

    // Create invoice
    const invoice = await prisma.invoice.create({
        data: {
            invoiceNumber,
            organizerId: order.CoursePeriod.Organizer.id,
            orderId: order.id,
            customerName: `${order.PersonProfile.firstName} ${order.PersonProfile.lastName}`,
            customerEmail: order.PersonProfile.email,
            customerOrgNr,
            subtotalCents: order.subtotalAfterDiscountCents,
            mvaRate: order.mvaRate,
            mvaCents: order.mvaCents,
            totalCents: order.totalCents,
            invoiceDate: new Date(),
            dueDate,
            status: 'SENT', // Automatically sent for paid orders
            paidAt: order.Payment[0]?.createdAt || new Date(),
            paidAmount: order.totalCents,
            sentAt: new Date()
        }
    })

    // Audit log
    await createAuditLog({
        entityType: 'Invoice',
        entityId: invoice.id,
        action: 'CREATE',
        changes: {
            invoiceNumber: invoice.invoiceNumber,
            totalCents: invoice.totalCents,
            status: invoice.status
        }
    })

    return invoice
}

/**
 * Get all invoices (admin only)
 */
export async function getAllInvoices() {
    await requireAdmin()
    
    return await prisma.invoice.findMany({
        include: {
            Organizer: {
                select: {
                    id: true,
                    name: true,
                    slug: true
                }
            },
            Order: {
                select: {
                    id: true,
                    status: true
                }
            }
        },
        orderBy: {
            invoiceDate: 'desc'
        }
    })
}

/**
 * Get invoices by organizer
 */
export async function getOrganizerInvoices(organizerId: string) {
    return await prisma.invoice.findMany({
        where: {
            organizerId
        },
        include: {
            Order: {
                include: {
                    PersonProfile: true
                }
            }
        },
        orderBy: {
            invoiceDate: 'desc'
        }
    })
}

/**
 * Get invoice by ID
 */
export async function getInvoice(invoiceId: string) {
    return await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
            Organizer: true,
            Order: {
                include: {
                    PersonProfile: true,
                    Registration: {
                        include: {
                            CourseTrack: true
                        }
                    }
                }
            }
        }
    })
}

/**
 * Mark invoice as paid (if payment received later)
 */
export async function markInvoicePaid(invoiceId: string, paidAmount: number) {
    const invoice = await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
            status: 'PAID',
            paidAt: new Date(),
            paidAmount
        }
    })

    await createAuditLog({
        entityType: 'Invoice',
        entityId: invoice.id,
        action: 'PAID',
        changes: {
            status: 'PAID',
            paidAmount
        }
    })

    return invoice
}

/**
 * Create credit note for refund
 */
export async function createCreditNote(params: {
    invoiceId: string
    reason: string
    amountCents: number
}) {
    const invoice = await prisma.invoice.findUnique({
        where: { id: params.invoiceId },
        include: { Organizer: true }
    })

    if (!invoice) {
        throw new Error('Invoice not found')
    }

    // Get next credit note number
    const creditCount = await prisma.creditNote.count({
        where: { organizerId: invoice.organizerId }
    })

    const creditNumber = `${invoice.Organizer.invoicePrefix}-CR-${String(creditCount + 1).padStart(4, '0')}`

    // Calculate MVA on credit amount
    const mvaCents = Math.round(params.amountCents * (Number(invoice.mvaRate) / 100))
    const totalCents = params.amountCents + mvaCents

    const creditNote = await prisma.creditNote.create({
        data: {
            creditNumber,
            organizerId: invoice.organizerId,
            invoiceId: invoice.id,
            reason: params.reason,
            originalAmountCents: invoice.totalCents,
            refundAmountCents: params.amountCents,
            mvaCents,
            totalCents
        }
    })

    // Update invoice status
    await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: 'CREDITED' }
    })

    await createAuditLog({
        entityType: 'Invoice',
        entityId: invoice.id,
        action: 'REFUND',
        changes: {
            creditNoteId: creditNote.id,
            creditAmount: totalCents,
            reason: params.reason
        }
    })

    return creditNote
}
