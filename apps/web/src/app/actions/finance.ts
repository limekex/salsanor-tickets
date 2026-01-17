'use server'

import { prisma } from '@/lib/db'
import { requireAdmin } from '@/utils/auth-admin'

export async function getFinancialOverview() {
    await requireAdmin()

    // Get all paid orders with their details
    const orders = await prisma.order.findMany({
        where: {
            status: 'PAID'
        },
        include: {
            CoursePeriod: {
                include: {
                    Organizer: {
                        select: {
                            id: true,
                            name: true,
                            slug: true
                        }
                    }
                }
            },
            Payment: {
                where: {
                    status: 'SUCCEEDED'
                }
            },
            Registration: {
                select: {
                    id: true,
                    status: true
                }
            }
        }
    })

    // Calculate revenue by organization
    const revenueByOrg = orders
        .filter(order => order.CoursePeriod !== null)
        .reduce((acc, order) => {
        const orgId = order.CoursePeriod!.Organizer.id
        const orgName = order.CoursePeriod!.Organizer.name
        
        if (!acc[orgId]) {
            acc[orgId] = {
                organizerId: orgId,
                organizerName: orgName,
                totalRevenue: 0,
                orderCount: 0,
                registrationCount: 0
            }
        }
        
        acc[orgId].totalRevenue += order.totalCents
        acc[orgId].orderCount += 1
        acc[orgId].registrationCount += order.Registration.length
        
        return acc
    }, {} as Record<string, any>)

    // Calculate revenue by period
    const revenueByPeriod = orders
        .filter(order => order.CoursePeriod !== null)
        .reduce((acc, order) => {
        const periodId = order.CoursePeriod!.id
        const periodName = order.CoursePeriod!.name
        const orgName = order.CoursePeriod!.Organizer.name
        
        if (!acc[periodId]) {
            acc[periodId] = {
                periodId,
                periodName,
                periodCode: order.CoursePeriod!.code,
                organizerName: orgName,
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

    // Calculate payment provider statistics
    const allPayments = await prisma.payment.findMany({
        where: {
            status: 'SUCCEEDED'
        }
    })

    const providerStats = allPayments.reduce((acc, payment) => {
        const provider = payment.provider
        
        if (!acc[provider]) {
            acc[provider] = {
                provider,
                totalAmount: 0,
                transactionCount: 0
            }
        }
        
        acc[provider].totalAmount += payment.amountCents
        acc[provider].transactionCount += 1
        
        return acc
    }, {} as Record<string, any>)

    // Calculate discount usage
    const ordersWithDiscounts = await prisma.order.findMany({
        where: {
            discountCents: {
                gt: 0
            }
        },
        select: {
            discountCents: true,
            pricingSnapshot: true,
            CoursePeriod: {
                select: {
                    Organizer: {
                        select: {
                            name: true
                        }
                    }
                }
            }
        }
    })

    const totalDiscountsGiven = ordersWithDiscounts.reduce(
        (sum, order) => sum + order.discountCents,
        0
    )

    // Global totals
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalCents, 0)
    const totalOrders = orders.length
    const totalRegistrations = orders.reduce(
        (sum, order) => sum + order.Registration.length,
        0
    )

    return {
        overview: {
            totalRevenue,
            totalOrders,
            totalRegistrations,
            totalDiscountsGiven,
            averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
        },
        revenueByOrganization: Object.values(revenueByOrg).sort(
            (a: any, b: any) => b.totalRevenue - a.totalRevenue
        ),
        revenueByPeriod: Object.values(revenueByPeriod).sort(
            (a: any, b: any) => b.totalRevenue - a.totalRevenue
        ),
        paymentProviders: Object.values(providerStats),
        discounts: {
            totalGiven: totalDiscountsGiven,
            orderCount: ordersWithDiscounts.length,
            averageDiscount: ordersWithDiscounts.length > 0 
                ? totalDiscountsGiven / ordersWithDiscounts.length 
                : 0
        }
    }
}

export async function getDiscountUsage() {
    await requireAdmin()

    const orders = await prisma.order.findMany({
        where: {
            discountCents: {
                gt: 0
            }
        },
        include: {
            CoursePeriod: {
                include: {
                    Organizer: true
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    })

    return orders
        .filter(order => order.CoursePeriod !== null)
        .map(order => ({
        orderId: order.id,
        organizerName: order.CoursePeriod!.Organizer.name,
        periodName: order.CoursePeriod!.name,
        periodCode: order.CoursePeriod!.code,
        subtotalCents: order.subtotalCents,
        discountCents: order.discountCents,
        totalCents: order.totalCents,
        discountPercentage: ((order.discountCents / order.subtotalCents) * 100).toFixed(1),
        pricingSnapshot: order.pricingSnapshot,
        createdAt: order.createdAt
    }))
}

export async function exportFinancialData(format: 'csv' | 'json' = 'csv') {
    await requireAdmin()

    const orders = await prisma.order.findMany({
        where: {
            status: 'PAID'
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

    const exportData = orders
        .filter(order => order.CoursePeriod !== null)
        .map(order => ({
        orderId: order.id,
        organizerId: order.CoursePeriod!.Organizer.id,
        organizerName: order.CoursePeriod!.Organizer.name,
        organizerOrgNr: order.CoursePeriod!.Organizer.organizationNumber || '',
        periodId: order.CoursePeriod!.id,
        periodName: order.CoursePeriod!.name,
        periodCode: order.CoursePeriod!.code,
        subtotalCents: order.subtotalCents,
        discountCents: order.discountCents,
        subtotalAfterDiscountCents: order.subtotalAfterDiscountCents,
        mvaRate: Number(order.mvaRate),
        mvaCents: order.mvaCents,
        totalCents: order.totalCents,
        currency: order.currency,
        status: order.status,
        registrationCount: order.Registration.length,
        paymentProvider: order.Payment[0]?.provider || null,
        paymentStatus: order.Payment[0]?.status || null,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString()
    }))

    if (format === 'json') {
        return {
            data: exportData,
            filename: `financial-export-${new Date().toISOString().split('T')[0]}.json`
        }
    }

    // Generate CSV
    const headers = [
        'Order ID',
        'Organization',
        'Org.nr',
        'Period Name',
        'Period Code',
        'Subtotal (NOK)',
        'Discount (NOK)',
        'Subtotal After Discount (NOK)',
        'MVA Rate (%)',
        'MVA Amount (NOK)',
        'Total (NOK)',
        'Status',
        'Registrations',
        'Payment Provider',
        'Payment Status',
        'Created At'
    ]

    const csvRows = [
        headers.join(','),
        ...exportData.map(row => [
            row.orderId,
            `"${row.organizerName}"`,
            row.organizerOrgNr,
            `"${row.periodName}"`,
            row.periodCode,
            (row.subtotalCents / 100).toFixed(2),
            (row.discountCents / 100).toFixed(2),
            (row.subtotalAfterDiscountCents / 100).toFixed(2),
            row.mvaRate.toFixed(2),
            (row.mvaCents / 100).toFixed(2),
            (row.totalCents / 100).toFixed(2),
            row.status,
            row.registrationCount,
            row.paymentProvider || '',
            row.paymentStatus || '',
            row.createdAt
        ].join(','))
    ]

    return {
        data: csvRows.join('\n'),
        filename: `financial-export-${new Date().toISOString().split('T')[0]}.csv`,
        mimeType: 'text/csv'
    }
}
