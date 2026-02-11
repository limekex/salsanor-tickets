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
            CoursePeriod: {
                organizerId: organizerId
            }
        },
        include: {
            Registration: true,
            Payment: {
                where: { status: 'SUCCEEDED' }
            }
        }
    })

    const totalRevenue = orders.reduce((sum, order) => sum + order.totalCents, 0)
    const totalOrders = orders.length
    const totalRegistrations = orders.reduce((sum, order) => sum + order.Registration.length, 0)
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    
    // Pending payments
    const pendingOrders = await prisma.order.count({
        where: {
            status: 'PENDING',
            CoursePeriod: { organizerId }
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
 * Get revenue breakdown by period
 */
export async function getOrgRevenueByPeriod(organizerId: string) {
    await requireOrgFinanceForOrganizer(organizerId)

    const orders = await prisma.order.findMany({
        where: {
            status: 'PAID',
            CoursePeriod: {
                organizerId
            }
        },
        include: {
            CoursePeriod: true,
            Registration: true
        }
    })

    const revenueByPeriod = orders.reduce((acc, order) => {
        if (!order.CoursePeriod) return acc
        
        const periodId = order.CoursePeriod.id
        if (!acc[periodId]) {
            acc[periodId] = {
                periodName: order.CoursePeriod.name,
                periodCode: order.CoursePeriod.code,
                totalRevenue: 0,
                orderCount: 0,
                registrationCount: 0
            }
        }
        
        acc[periodId].totalRevenue += order.totalCents
        acc[periodId].orderCount += 1
        acc[periodId].registrationCount += order.Registration.length
        
        return acc
    }, {} as Record<string, any>)

    return Object.values(revenueByPeriod)
}

/**
 * Get payment status breakdown
 */
export async function getOrgPaymentStatus(organizerId: string) {
    await requireOrgFinanceForOrganizer(organizerId)

    const payments = await prisma.payment.findMany({
        where: {
            Order: {
                CoursePeriod: { organizerId }
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
            CoursePeriod: { organizerId }
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
            CoursePeriod: { organizerId }
        },
        include: {
            CoursePeriod: {
                include: {
                    Organizer: true
                }
            },
            Payment: true,
            Registration: {
                include: {
                    PersonProfile: true,
                    CourseTrack: true
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    })

    return orders.map(order => ({
        orderId: order.id,
        organizerName: order.CoursePeriod?.Organizer.name || '',
        organizerOrgNr: order.CoursePeriod?.Organizer.organizationNumber || '',
        periodName: order.CoursePeriod?.name || '',
        periodCode: order.CoursePeriod?.code || '',
        subtotalCents: order.subtotalCents,
        discountCents: order.discountCents || 0,
        subtotalAfterDiscountCents: order.subtotalAfterDiscountCents,
        mvaRate: Number(order.mvaRate),
        mvaCents: order.mvaCents,
        totalCents: order.totalCents,
        currency: order.currency,
        registrationCount: order.Registration.length,
        paymentProvider: order.Payment[0]?.provider || null,
        paymentStatus: order.Payment[0]?.status || null,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString()
    }))
}

/**
 * Get revenue by period with MVA breakdown
 */
export async function getOrgRevenueWithMVA(organizerId: string) {
    await requireOrgFinanceForOrganizer(organizerId)

    const orders = await prisma.order.findMany({
        where: {
            status: 'PAID',
            CoursePeriod: {
                organizerId
            }
        },
        include: {
            CoursePeriod: true
        }
    })

    const revenueByPeriod = orders.reduce((acc, order) => {
        if (!order.CoursePeriod) return acc
        
        const periodId = order.CoursePeriod.id
        if (!acc[periodId]) {
            acc[periodId] = {
                periodName: order.CoursePeriod.name,
                periodCode: order.CoursePeriod.code,
                grossRevenue: 0,
                netRevenue: 0,
                mvaAmount: 0,
                mvaRate: Number(order.mvaRate),
                orderCount: 0
            }
        }
        
        acc[periodId].grossRevenue += order.totalCents
        acc[periodId].netRevenue += order.subtotalAfterDiscountCents
        acc[periodId].mvaAmount += order.mvaCents
        acc[periodId].orderCount += 1
        
        return acc
    }, {} as Record<string, any>)

    return Object.values(revenueByPeriod)
}
