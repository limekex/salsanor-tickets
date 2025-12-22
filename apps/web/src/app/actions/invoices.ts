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
            period: {
                include: {
                    organizer: true
                }
            },
            purchaser: {
                include: {
                    user: true
                }
            },
            registrations: {
                include: {
                    track: true
                }
            },
            payments: true
        }
    })

    if (!order) {
        throw new Error('Order not found')
    }

    if (order.status !== 'PAID') {
        throw new Error('Can only generate invoice for paid orders')
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
        where: { id: order.period.organizer.id },
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
            organizerId: order.period.organizer.id,
            orderId: order.id,
            customerName: `${order.purchaser.firstName} ${order.purchaser.lastName}`,
            customerEmail: order.purchaser.email,
            customerOrgNr,
            subtotalCents: order.subtotalAfterDiscountCents,
            mvaRate: order.mvaRate,
            mvaCents: order.mvaCents,
            totalCents: order.totalCents,
            invoiceDate: new Date(),
            dueDate,
            status: 'SENT', // Automatically sent for paid orders
            paidAt: order.payments[0]?.createdAt || new Date(),
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
            organizer: {
                select: {
                    id: true,
                    name: true,
                    slug: true
                }
            },
            order: {
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
            order: {
                include: {
                    purchaser: true
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
            organizer: true,
            order: {
                include: {
                    purchaser: true,
                    registrations: {
                        include: {
                            track: true
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
        include: { organizer: true }
    })

    if (!invoice) {
        throw new Error('Invoice not found')
    }

    // Get next credit note number
    const creditCount = await prisma.creditNote.count({
        where: { organizerId: invoice.organizerId }
    })

    const creditNumber = `${invoice.organizer.invoicePrefix}-CR-${String(creditCount + 1).padStart(4, '0')}`

    // Calculate MVA on credit amount
    const mvaCents = Math.round(params.amountCents * (Number(invoice.mvaRate) / 100))
    const totalCents = params.amountCents + mvaCents

    const creditNote = await prisma.creditNote.create({
        data: {
            creditNumber,
            organizerId: invoice.organizerId,
            invoiceId: invoice.id,
            reason: params.reason,
            amountCents: params.amountCents,
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
