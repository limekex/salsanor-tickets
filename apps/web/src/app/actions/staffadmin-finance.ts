'use server'

import { prisma } from '@/lib/db'
import { requireOrgFinance, requireOrgFinanceForOrganizer } from '@/utils/auth-org-finance'

/**
 * Get financial summary for specific organization
 */
export async function getOrgFinancialSummary(organizerId: string) {
    await requireOrgFinanceForOrganizer(organizerId)

    const orders = await prisma.order.findMany({
        where: {
            status: 'PAID',
            organizerId: organizerId
        },
        include: {
            Registration: true,
            EventRegistration: true,
            Membership: true,
            Payment: {
                where: { status: 'SUCCEEDED' }
            }
        }
    })

    const totalRevenue = orders.reduce((sum, order) => sum + order.totalCents, 0)
    const totalOrders = orders.length
    const totalRegistrations = orders.reduce((sum, order) => 
        sum + order.Registration.length + order.EventRegistration.length + order.Membership.length, 0)
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    
    // Pending payments
    const pendingOrders = await prisma.order.count({
        where: {
            status: 'PENDING',
            organizerId: organizerId
        }
    })

    // Total discounts
    const totalDiscounts = orders.reduce((sum, order) => sum + (order.discountCents || 0), 0)

    return {
        totalRevenue,
        totalOrders,
        totalRegistrations,
        avgOrderValue,
        pendingOrders,
        totalDiscounts
    }
}

/**
 * Get revenue breakdown by period/event/membership
 */
export async function getOrgRevenueByPeriod(organizerId: string) {
    await requireOrgFinanceForOrganizer(organizerId)

    const orders = await prisma.order.findMany({
        where: {
            status: 'PAID',
            organizerId: organizerId
        },
        include: {
            CoursePeriod: true,
            Registration: true,
            EventRegistration: {
                include: {
                    Event: {
                        select: {
                            title: true,
                            slug: true
                        }
                    }
                }
            },
            Membership: {
                include: {
                    MembershipTier: {
                        select: {
                            name: true
                        }
                    }
                }
            }
        }
    })

    const revenueByProduct = orders.reduce((acc, order) => {
        let productKey: string
        let productName: string
        let productCode: string
        
        if (order.orderType === 'COURSE_PERIOD' && order.CoursePeriod) {
            productKey = `period-${order.CoursePeriod.id}`
            productName = order.CoursePeriod.name
            productCode = order.CoursePeriod.code
        } else if (order.orderType === 'EVENT' && order.EventRegistration.length > 0) {
            const event = order.EventRegistration[0]?.Event
            productKey = `event-${event?.slug || 'unknown'}`
            productName = event?.title || 'Event'
            productCode = event?.slug || 'unknown'
        } else if (order.orderType === 'MEMBERSHIP' && order.Membership.length > 0) {
            const tier = order.Membership[0]?.MembershipTier
            productKey = `membership-${tier?.name || 'unknown'}`
            productName = `Membership: ${tier?.name || 'Unknown'}`
            productCode = tier?.name || 'unknown'
        } else {
            // Fallback for orders without proper associations
            productKey = `other-${order.id}`
            productName = 'Other'
            productCode = 'other'
        }
        
        if (!acc[productKey]) {
            acc[productKey] = {
                periodName: productName,
                periodCode: productCode,
                totalRevenue: 0,
                orderCount: 0,
                registrationCount: 0
            }
        }
        
        acc[productKey].totalRevenue += order.totalCents
        acc[productKey].orderCount += 1
        acc[productKey].registrationCount += order.Registration.length + order.EventRegistration.length + order.Membership.length
        
        return acc
    }, {} as Record<string, any>)

    return Object.values(revenueByProduct)
}

/**
 * Get payment status breakdown
 */
export async function getOrgPaymentStatus(organizerId: string) {
    await requireOrgFinanceForOrganizer(organizerId)

    const payments = await prisma.payment.findMany({
        where: {
            Order: {
                organizerId: organizerId
            }
        },
        include: {
            Order: {
                select: {
                    id: true,
                    orderNumber: true,
                    createdAt: true,
                    Invoice: {
                        select: {
                            invoiceNumber: true
                        }
                    }
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    })

    return payments
}

/**
 * Get recent paid registrations
 */
export async function getOrgPaidRegistrations(organizerId: string, limit = 50) {
    await requireOrgFinanceForOrganizer(organizerId)

    const orders = await prisma.order.findMany({
        where: {
            status: 'PAID',
            organizerId: organizerId
        },
        include: {
            CoursePeriod: {
                select: {
                    name: true,
                    code: true
                }
            },
            Registration: {
                include: {
                    PersonProfile: {
                        select: {
                            firstName: true,
                            lastName: true
                        }
                    },
                    CourseTrack: {
                        select: {
                            title: true
                        }
                    }
                }
            },
            EventRegistration: {
                include: {
                    Event: {
                        select: {
                            title: true,
                            slug: true
                        }
                    },
                    PersonProfile: {
                        select: {
                            firstName: true,
                            lastName: true
                        }
                    }
                }
            },
            Membership: {
                include: {
                    MembershipTier: {
                        select: {
                            name: true
                        }
                    },
                    PersonProfile: {
                        select: {
                            firstName: true,
                            lastName: true
                        }
                    }
                }
            },
            Payment: {
                where: { status: 'SUCCEEDED' }
            }
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: limit
    })

    return orders
}

export interface DateRangeFilter {
    startDate?: string | null
    endDate?: string | null
}

/**
 * Export financial data (for CSV generation)
 */
export async function exportOrgFinancialData(organizerId: string, dateRange?: DateRangeFilter) {
    await requireOrgFinanceForOrganizer(organizerId)

    // Build date filter
    const dateFilter: { gte?: Date; lte?: Date } = {}
    if (dateRange?.startDate) {
        dateFilter.gte = new Date(dateRange.startDate)
    }
    if (dateRange?.endDate) {
        // Set to end of day for end date
        const endDate = new Date(dateRange.endDate)
        endDate.setHours(23, 59, 59, 999)
        dateFilter.lte = endDate
    }

    const orders = await prisma.order.findMany({
        where: {
            status: 'PAID',
            organizerId: organizerId,
            ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
        },
        include: {
            CoursePeriod: {
                include: {
                    Organizer: true
                }
            },
            Organizer: true,
            Payment: true,
            Invoice: true,
            Registration: {
                include: {
                    PersonProfile: true,
                    CourseTrack: true
                }
            },
            EventRegistration: {
                include: {
                    Event: true,
                    PersonProfile: true
                }
            },
            Membership: {
                include: {
                    MembershipTier: true,
                    PersonProfile: true
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    })

    return orders.map(order => {
        let productName = ''
        let productCode = ''
        
        if (order.orderType === 'COURSE_PERIOD' && order.CoursePeriod) {
            // Get unique track names from registrations
            const trackNames = [...new Set(
                order.Registration
                    .map(reg => reg.CourseTrack?.title)
                    .filter(Boolean)
            )]
            
            // Format: "Period Name - Track1, Track2"
            if (trackNames.length > 0) {
                productName = `${order.CoursePeriod.name} - ${trackNames.join(', ')}`
                productCode = `${order.CoursePeriod.code} - ${trackNames.map(t => t?.toLowerCase().replace(/\s+/g, '-')).join(', ')}`
            } else {
                productName = order.CoursePeriod.name
                productCode = order.CoursePeriod.code
            }
        } else if (order.orderType === 'EVENT' && order.EventRegistration.length > 0) {
            const event = order.EventRegistration[0]?.Event
            productName = event?.title || 'Event'
            productCode = event?.slug || 'event'
        } else if (order.orderType === 'MEMBERSHIP' && order.Membership.length > 0) {
            const tier = order.Membership[0]?.MembershipTier
            productName = `Membership: ${tier?.name || 'Unknown'}`
            productCode = tier?.name || 'membership'
        }
        
        return {
            orderId: order.id,
            orderNumber: order.orderNumber || '',
            organizerName: order.Organizer.name,
            organizerOrgNr: order.Organizer.organizationNumber || '',
            periodName: productName,
            periodCode: productCode,
            orderType: order.orderType,
            subtotalCents: order.subtotalCents,
            discountCents: order.discountCents || 0,
            subtotalAfterDiscountCents: order.subtotalAfterDiscountCents,
            mvaRate: Number(order.mvaRate),
            mvaCents: order.mvaCents,
            totalCents: order.totalCents,
            // Fee data from payment
            stripeFeeCents: order.Payment[0]?.stripeFeeCents || null,
            platformFeeCents: order.Payment[0]?.platformFeeCents || null,
            netAmountCents: order.Payment[0]?.netAmountCents || null,
            // Payment details
            stripePaymentIntentId: order.Payment[0]?.stripePaymentIntentId || null,
            stripePaymentMethodType: order.Payment[0]?.stripePaymentMethodType || null,
            stripeCardBrand: order.Payment[0]?.stripeCardBrand || null,
            stripeCardLast4: order.Payment[0]?.stripeCardLast4 || null,
            stripeCardFingerprint: order.Payment[0]?.stripeCardFingerprint || null,
            currency: order.currency,
            registrationCount: order.Registration.length + order.EventRegistration.length + order.Membership.length,
            paymentProvider: order.Payment[0]?.provider || null,
            paymentStatus: order.Payment[0]?.status || null,
            providerPaymentRef: order.Payment[0]?.providerPaymentRef || null,
            invoiceNumber: order.Invoice?.invoiceNumber || null,
            createdAt: order.createdAt.toISOString(),
            updatedAt: order.updatedAt.toISOString()
        }
    })
}

/**
 * Get revenue by period with MVA breakdown
 */
export async function getOrgRevenueWithMVA(organizerId: string) {
    await requireOrgFinanceForOrganizer(organizerId)

    const orders = await prisma.order.findMany({
        where: {
            status: 'PAID',
            organizerId: organizerId
        },
        include: {
            CoursePeriod: true,
            EventRegistration: {
                include: {
                    Event: {
                        select: {
                            title: true,
                            slug: true
                        }
                    }
                }
            },
            Membership: {
                include: {
                    MembershipTier: {
                        select: {
                            name: true
                        }
                    }
                }
            }
        }
    })

    const revenueByProduct = orders.reduce((acc, order) => {
        let productKey: string
        let productName: string
        let productCode: string
        
        if (order.orderType === 'COURSE_PERIOD' && order.CoursePeriod) {
            productKey = `period-${order.CoursePeriod.id}`
            productName = order.CoursePeriod.name
            productCode = order.CoursePeriod.code
        } else if (order.orderType === 'EVENT' && order.EventRegistration.length > 0) {
            const event = order.EventRegistration[0]?.Event
            productKey = `event-${event?.slug || 'unknown'}`
            productName = event?.title || 'Event'
            productCode = event?.slug || 'unknown'
        } else if (order.orderType === 'MEMBERSHIP' && order.Membership.length > 0) {
            const tier = order.Membership[0]?.MembershipTier
            productKey = `membership-${tier?.name || 'unknown'}`
            productName = `Membership: ${tier?.name || 'Unknown'}`
            productCode = tier?.name || 'unknown'
        } else {
            productKey = `other-${order.id}`
            productName = 'Other'
            productCode = 'other'
        }
        
        if (!acc[productKey]) {
            acc[productKey] = {
                periodName: productName,
                periodCode: productCode,
                grossRevenue: 0,
                netRevenue: 0,
                mvaAmount: 0,
                mvaRate: Number(order.mvaRate),
                orderCount: 0
            }
        }
        
        acc[productKey].grossRevenue += order.totalCents
        acc[productKey].netRevenue += order.subtotalAfterDiscountCents
        acc[productKey].mvaAmount += order.mvaCents
        acc[productKey].orderCount += 1
        
        return acc
    }, {} as Record<string, any>)

    return Object.values(revenueByProduct)
}

// =============================================================================
// INVOICE MANAGEMENT (Phase 4)
// =============================================================================

/**
 * Get all invoices for the organization
 */
export async function getOrgInvoices(organizerId: string) {
    await requireOrgFinanceForOrganizer(organizerId)

    const invoices = await prisma.invoice.findMany({
        where: {
            organizerId: organizerId
        },
        include: {
            Order: {
                select: {
                    orderNumber: true,
                    PersonProfile: {
                        select: {
                            firstName: true,
                            lastName: true,
                            email: true
                        }
                    }
                }
            }
        },
        orderBy: {
            invoiceDate: 'desc'
        }
    })

    return invoices
}

/**
 * Get a single invoice by ID
 */
export async function getOrgInvoice(organizerId: string, invoiceId: string) {
    await requireOrgFinanceForOrganizer(organizerId)

    const invoice = await prisma.invoice.findFirst({
        where: {
            id: invoiceId,
            organizerId: organizerId
        },
        include: {
            Order: {
                include: {
                    PersonProfile: true,
                    CoursePeriod: true,
                    Registration: {
                        include: {
                            CourseTrack: true,
                            PersonProfile: true
                        }
                    },
                    EventRegistration: {
                        include: {
                            Event: true,
                            PersonProfile: true
                        }
                    },
                    Membership: {
                        include: {
                            MembershipTier: true,
                            PersonProfile: true
                        }
                    },
                    Payment: true
                }
            },
            Organizer: true
        }
    })

    return invoice
}

/**
 * Generate an invoice for an order (ORG_ADMIN only)
 */
export async function generateOrgInvoice(organizerId: string, orderId: string) {
    // Note: This requires ORG_ADMIN, not just ORG_FINANCE (as per access matrix)
    const { requireOrgAdminForOrganizer } = await import('@/utils/auth-org-admin')
    await requireOrgAdminForOrganizer(organizerId)

    // Check if invoice already exists for this order
    const existingInvoice = await prisma.invoice.findFirst({
        where: {
            orderId: orderId,
            organizerId: organizerId
        }
    })

    if (existingInvoice) {
        throw new Error('Invoice already exists for this order')
    }

    // Get the order with all details
    const order = await prisma.order.findFirst({
        where: {
            id: orderId,
            organizerId: organizerId,
            status: 'PAID'
        },
        include: {
            PersonProfile: true,
            Organizer: true,
            CoursePeriod: true,
            Registration: {
                include: {
                    CourseTrack: true,
                    PersonProfile: true
                }
            },
            EventRegistration: {
                include: {
                    Event: true,
                    PersonProfile: true
                }
            },
            Membership: {
                include: {
                    MembershipTier: true,
                    PersonProfile: true
                }
            }
        }
    })

    if (!order) {
        throw new Error('Order not found or not paid')
    }

    // Get next invoice number for this organizer
    const organizer = await prisma.organizer.findUnique({
        where: { id: organizerId },
        select: { invoicePrefix: true, nextInvoiceNumber: true }
    })

    if (!organizer) {
        throw new Error('Organizer not found')
    }

    const invoiceNumber = `${organizer.invoicePrefix}-${String(organizer.nextInvoiceNumber).padStart(5, '0')}`

    // Create the invoice
    const invoice = await prisma.invoice.create({
        data: {
            invoiceNumber,
            organizerId,
            orderId,
            customerName: `${order.PersonProfile.firstName} ${order.PersonProfile.lastName}`,
            customerEmail: order.PersonProfile.email,
            customerOrgNr: null,
            customerAddress: null,
            subtotalCents: order.subtotalAfterDiscountCents,
            mvaRate: order.mvaRate,
            mvaCents: order.mvaCents,
            totalCents: order.totalCents,
            currency: order.currency,
            invoiceDate: new Date(),
            dueDate: new Date(), // Paid invoices have immediate due date
            paymentTerms: 'Due upon receipt',
            status: 'PAID',
            paidAt: order.paidAt,
            paidAmount: order.totalCents
        }
    })

    // Increment the invoice number counter
    await prisma.organizer.update({
        where: { id: organizerId },
        data: {
            nextInvoiceNumber: { increment: 1 }
        }
    })

    return invoice
}

/**
 * Mark invoice as sent
 */
export async function markInvoiceSent(organizerId: string, invoiceId: string) {
    await requireOrgFinanceForOrganizer(organizerId)

    const invoice = await prisma.invoice.updateMany({
        where: {
            id: invoiceId,
            organizerId: organizerId
        },
        data: {
            sentAt: new Date()
        }
    })

    return invoice
}
