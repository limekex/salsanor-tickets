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
                    createdAt: true
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

/**
 * Export financial data (for CSV generation)
 */
export async function exportOrgFinancialData(organizerId: string) {
    await requireOrgFinanceForOrganizer(organizerId)

    const orders = await prisma.order.findMany({
        where: {
            status: 'PAID',
            organizerId: organizerId
        },
        include: {
            CoursePeriod: {
                include: {
                    Organizer: true
                }
            },
            Organizer: true,
            Payment: true,
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
            productName = order.CoursePeriod.name
            productCode = order.CoursePeriod.code
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
            currency: order.currency,
            registrationCount: order.Registration.length + order.EventRegistration.length + order.Membership.length,
            paymentProvider: order.Payment[0]?.provider || null,
            paymentStatus: order.Payment[0]?.status || null,
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
