'use server'

import { prisma } from '@/lib/db'
import { requireAdmin } from '@/utils/auth-admin'

type DateFilter = {
    from?: string
    to?: string
}

/**
 * Get financial overview with optional date filtering
 */
export async function getFilteredFinancialOverview(filter?: DateFilter) {
    await requireAdmin()

    const dateWhere = filter?.from || filter?.to ? {
        createdAt: {
            ...(filter.from && { gte: new Date(filter.from) }),
            ...(filter.to && { lte: new Date(filter.to) })
        }
    } : {}

    // Get all paid orders with their details
    const orders = await prisma.order.findMany({
        where: {
            status: 'PAID',
            ...dateWhere
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

    // Calculate totals
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalCents, 0)
    const totalOrders = orders.length
    const totalRegistrations = orders.reduce((sum, order) => sum + order.Registration.length, 0)
    const totalDiscounts = orders.reduce((sum, order) => sum + (order.discountCents || 0), 0)
    const totalMva = orders.reduce((sum, order) => sum + (order.mvaCents || 0), 0)

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
                    registrationCount: 0,
                    mvaCents: 0
                }
            }
            
            acc[orgId].totalRevenue += order.totalCents
            acc[orgId].orderCount += 1
            acc[orgId].registrationCount += order.Registration.length
            acc[orgId].mvaCents += order.mvaCents || 0
            
            return acc
        }, {} as Record<string, { organizerId: string; organizerName: string; totalRevenue: number; orderCount: number; registrationCount: number; mvaCents: number }>)

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
                    registrationCount: 0,
                    mvaCents: 0
                }
            }
            
            acc[periodId].totalRevenue += order.totalCents
            acc[periodId].orderCount += 1
            acc[periodId].registrationCount += order.Registration.length
            acc[periodId].mvaCents += order.mvaCents || 0
            
            return acc
        }, {} as Record<string, { periodId: string; periodName: string; periodCode: string; organizerName: string; totalRevenue: number; orderCount: number; registrationCount: number; mvaCents: number }>)

    // Payment provider stats
    const allPayments = await prisma.payment.findMany({
        where: {
            status: 'SUCCEEDED',
            ...(filter?.from || filter?.to ? {
                createdAt: {
                    ...(filter.from && { gte: new Date(filter.from) }),
                    ...(filter.to && { lte: new Date(filter.to) })
                }
            } : {})
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
    }, {} as Record<string, { provider: string; totalAmount: number; transactionCount: number }>)

    return {
        overview: {
            totalRevenue,
            totalOrders,
            totalRegistrations,
            totalDiscounts,
            totalMva,
            averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
        },
        revenueByOrganization: Object.values(revenueByOrg).sort((a, b) => b.totalRevenue - a.totalRevenue),
        revenueByPeriod: Object.values(revenueByPeriod).sort((a, b) => b.totalRevenue - a.totalRevenue),
        paymentProviders: Object.values(providerStats)
    }
}

/**
 * Get Platform Revenue Report - The actual revenue the platform earns
 * This is the application_fee collected through Stripe Connect
 */
export async function getPlatformRevenueReport(filter?: DateFilter) {
    await requireAdmin()

    const dateWhere = filter?.from || filter?.to ? {
        createdAt: {
            ...(filter.from && { gte: new Date(filter.from) }),
            ...(filter.to && { lte: new Date(filter.to) })
        }
    } : {}

    // Get all payments with platform fees
    const payments = await prisma.payment.findMany({
        where: {
            status: 'SUCCEEDED',
            ...dateWhere
        },
        select: {
            id: true,
            amountCents: true,
            platformFeeCents: true,
            stripeFeeCents: true,
            netAmountCents: true,
            createdAt: true,
            provider: true,
            Order: {
                select: {
                    id: true,
                    Organizer: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                            stripeConnectAccountId: true,
                            platformFeePercent: true,
                            platformFeeFixed: true
                        }
                    }
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    })

    // Get global platform fee config
    const globalConfig = await prisma.paymentConfig.findUnique({
        where: { provider: 'STRIPE' }
    })

    // Calculate platform revenue
    let totalGrossTransactions = 0
    let totalPlatformRevenue = 0
    let confirmedPlatformRevenue = 0  // From stored platformFeeCents
    let estimatedPlatformRevenue = 0  // Calculated from settings
    let transactionsWithStoredFee = 0

    const revenueByOrganizer: Record<string, {
        organizerId: string
        organizerName: string
        organizerSlug: string
        transactionVolume: number
        platformRevenue: number
        confirmedRevenue: number
        estimatedRevenue: number
        transactionCount: number
        effectiveFeePercent: number
    }> = {}

    const revenueByMonth: Record<string, {
        month: string
        transactionVolume: number
        platformRevenue: number
        transactionCount: number
    }> = {}

    for (const payment of payments) {
        const grossAmount = payment.amountCents
        totalGrossTransactions += grossAmount

        // Determine platform fee
        let platformFee: number
        let isConfirmed = false

        if (payment.platformFeeCents !== null && payment.platformFeeCents !== undefined) {
            // Use stored value (confirmed from Stripe)
            platformFee = payment.platformFeeCents
            confirmedPlatformRevenue += platformFee
            transactionsWithStoredFee++
            isConfirmed = true
        } else {
            // Estimate from organizer settings
            const org = payment.Order?.Organizer
            if (org?.stripeConnectAccountId) {
                const feePercent = org.platformFeePercent !== null 
                    ? Number(org.platformFeePercent) 
                    : (globalConfig?.platformFeePercent ? Number(globalConfig.platformFeePercent) : 0)
                const feeFixed = org.platformFeeFixed ?? globalConfig?.platformFeeFixed ?? 0
                platformFee = Math.round((grossAmount * feePercent) / 100) + feeFixed
            } else {
                platformFee = 0
            }
            estimatedPlatformRevenue += platformFee
        }

        totalPlatformRevenue += platformFee

        // By organizer
        if (payment.Order?.Organizer) {
            const org = payment.Order.Organizer
            const orgId = org.id
            if (!revenueByOrganizer[orgId]) {
                revenueByOrganizer[orgId] = {
                    organizerId: orgId,
                    organizerName: org.name,
                    organizerSlug: org.slug,
                    transactionVolume: 0,
                    platformRevenue: 0,
                    confirmedRevenue: 0,
                    estimatedRevenue: 0,
                    transactionCount: 0,
                    effectiveFeePercent: 0
                }
            }
            revenueByOrganizer[orgId].transactionVolume += grossAmount
            revenueByOrganizer[orgId].platformRevenue += platformFee
            if (isConfirmed) {
                revenueByOrganizer[orgId].confirmedRevenue += platformFee
            } else {
                revenueByOrganizer[orgId].estimatedRevenue += platformFee
            }
            revenueByOrganizer[orgId].transactionCount += 1
        }

        // By month
        const monthKey = payment.createdAt.toISOString().slice(0, 7) // YYYY-MM
        if (!revenueByMonth[monthKey]) {
            revenueByMonth[monthKey] = {
                month: monthKey,
                transactionVolume: 0,
                platformRevenue: 0,
                transactionCount: 0
            }
        }
        revenueByMonth[monthKey].transactionVolume += grossAmount
        revenueByMonth[monthKey].platformRevenue += platformFee
        revenueByMonth[monthKey].transactionCount += 1
    }

    // Calculate effective fee percentages
    for (const org of Object.values(revenueByOrganizer)) {
        org.effectiveFeePercent = org.transactionVolume > 0 
            ? (org.platformRevenue / org.transactionVolume) * 100 
            : 0
    }

    return {
        summary: {
            totalGrossTransactions,
            totalPlatformRevenue,
            confirmedPlatformRevenue,
            estimatedPlatformRevenue,
            totalTransactions: payments.length,
            transactionsWithStoredFee,
            effectiveFeePercent: totalGrossTransactions > 0 
                ? (totalPlatformRevenue / totalGrossTransactions) * 100 
                : 0,
            dataQuality: payments.length > 0 
                ? Math.round((transactionsWithStoredFee / payments.length) * 100) 
                : 100  // % of transactions with confirmed fee data
        },
        byOrganizer: Object.values(revenueByOrganizer).sort((a, b) => b.platformRevenue - a.platformRevenue),
        byMonth: Object.values(revenueByMonth).sort((a, b) => b.month.localeCompare(a.month))
    }
}

/**
 * Get fee/charge breakdown (Stripe fees, platform fees, etc.)
 * Platform fees = Our revenue from Stripe Connect application fees
 */
export async function getFeesReport(filter?: DateFilter) {
    await requireAdmin()

    const dateWhere = filter?.from || filter?.to ? {
        createdAt: {
            ...(filter.from && { gte: new Date(filter.from) }),
            ...(filter.to && { lte: new Date(filter.to) })
        }
    } : {}

    // Get payments with fee information
    const payments = await prisma.payment.findMany({
        where: {
            status: 'SUCCEEDED',
            ...dateWhere
        },
        select: {
            id: true,
            amountCents: true,
            platformFeeCents: true,
            stripeFeeCents: true,
            netAmountCents: true,
            createdAt: true,
            provider: true,
            Order: {
                select: {
                    id: true,
                    Organizer: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                            stripeConnectAccountId: true,
                            platformFeePercent: true,
                            platformFeeFixed: true
                        }
                    }
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    })

    // Get global platform fee config for fallback
    const globalConfig = await prisma.paymentConfig.findUnique({
        where: { provider: 'STRIPE' }
    })

    // Calculate fee totals
    let totalGrossAmount = 0
    let totalStripeFees = 0
    let totalPlatformFees = 0
    let totalNetToOrganizers = 0

    const feesByOrganizer: Record<string, {
        organizerId: string
        organizerName: string
        organizerSlug: string
        grossAmount: number
        stripeFees: number
        platformFees: number
        netToOrganizer: number
        transactionCount: number
        hasConnectAccount: boolean
    }> = {}

    const feesByProvider: Record<string, {
        provider: string
        grossAmount: number
        stripeFees: number
        platformFees: number
        transactionCount: number
        avgFeePercent: number
    }> = {}

    for (const payment of payments) {
        const grossAmount = payment.amountCents
        
        // Estimate Stripe processing fees (typically 1.4% + 180øre for European cards)
        const stripeFee = payment.stripeFeeCents ?? Math.round(grossAmount * 0.014 + 180)
        
        // Platform fee: use stored value, or calculate from organizer settings
        let platformFee: number
        if (payment.platformFeeCents !== null && payment.platformFeeCents !== undefined) {
            platformFee = payment.platformFeeCents
        } else {
            // Estimate from organizer settings
            const org = payment.Order?.Organizer
            if (org?.stripeConnectAccountId) {
                const feePercent = org.platformFeePercent !== null 
                    ? Number(org.platformFeePercent) 
                    : (globalConfig?.platformFeePercent ? Number(globalConfig.platformFeePercent) : 0)
                const feeFixed = org.platformFeeFixed ?? globalConfig?.platformFeeFixed ?? 0
                platformFee = Math.round((grossAmount * feePercent) / 100) + feeFixed
            } else {
                platformFee = 0
            }
        }
        
        // Net to organizer = gross - stripe fee - platform fee
        const netToOrganizer = grossAmount - stripeFee - platformFee

        totalGrossAmount += grossAmount
        totalStripeFees += stripeFee
        totalPlatformFees += platformFee
        totalNetToOrganizers += netToOrganizer

        // By organizer
        if (payment.Order?.Organizer) {
            const org = payment.Order.Organizer
            const orgId = org.id
            if (!feesByOrganizer[orgId]) {
                feesByOrganizer[orgId] = {
                    organizerId: orgId,
                    organizerName: org.name,
                    organizerSlug: org.slug,
                    grossAmount: 0,
                    stripeFees: 0,
                    platformFees: 0,
                    netToOrganizer: 0,
                    transactionCount: 0,
                    hasConnectAccount: !!org.stripeConnectAccountId
                }
            }
            feesByOrganizer[orgId].grossAmount += grossAmount
            feesByOrganizer[orgId].stripeFees += stripeFee
            feesByOrganizer[orgId].platformFees += platformFee
            feesByOrganizer[orgId].netToOrganizer += netToOrganizer
            feesByOrganizer[orgId].transactionCount += 1
        }

        // By provider
        const provider = payment.provider
        if (!feesByProvider[provider]) {
            feesByProvider[provider] = {
                provider,
                grossAmount: 0,
                stripeFees: 0,
                platformFees: 0,
                transactionCount: 0,
                avgFeePercent: 0
            }
        }
        feesByProvider[provider].grossAmount += grossAmount
        feesByProvider[provider].stripeFees += stripeFee
        feesByProvider[provider].platformFees += platformFee
        feesByProvider[provider].transactionCount += 1
    }

    // Calculate average fee percentages
    for (const provider of Object.values(feesByProvider)) {
        provider.avgFeePercent = provider.grossAmount > 0 
            ? ((provider.stripeFees + provider.platformFees) / provider.grossAmount) * 100 
            : 0
    }

    return {
        totals: {
            grossAmount: totalGrossAmount,
            stripeFees: totalStripeFees,
            platformFees: totalPlatformFees,  // THIS IS PLATFORM REVENUE
            netToOrganizers: totalNetToOrganizers,
            transactionCount: payments.length,
            avgStripeFeePercent: totalGrossAmount > 0 ? (totalStripeFees / totalGrossAmount) * 100 : 0,
            platformFeePercent: totalGrossAmount > 0 ? (totalPlatformFees / totalGrossAmount) * 100 : 0
        },
        byOrganizer: Object.values(feesByOrganizer).sort((a, b) => b.platformFees - a.platformFees),
        byProvider: Object.values(feesByProvider)
    }
}

/**
 * Get kasseoppgjør (cash register reconciliation) data
 */
export async function getKasseoppgjor(filter?: DateFilter) {
    await requireAdmin()

    const dateWhere = filter?.from || filter?.to ? {
        createdAt: {
            ...(filter.from && { gte: new Date(filter.from) }),
            ...(filter.to && { lte: new Date(filter.to) })
        }
    } : {}

    // Get all orders grouped by various dimensions
    const orders = await prisma.order.findMany({
        where: {
            status: { in: ['PAID', 'REFUNDED'] },
            ...dateWhere
        },
        include: {
            Organizer: {
                select: {
                    id: true,
                    name: true
                }
            },
            CoursePeriod: {
                include: {
                    Organizer: true,
                    CourseTrack: true
                }
            },
            Registration: {
                include: {
                    CourseTrack: true
                }
            },
            EventRegistration: {
                include: {
                    Event: true
                }
            },
            Payment: {
                where: { status: 'SUCCEEDED' }
            },
            CreditNote: true
        },
        orderBy: {
            createdAt: 'asc'
        }
    })

    // Kasseoppgjør by Course Track
    const byTrack: Record<string, {
        trackId: string
        trackTitle: string
        periodName: string
        organizerName: string
        registrationCount: number
        grossRevenue: number
        discounts: number
        netRevenue: number
        mva: number
        refunds: number
        finalAmount: number
    }> = {}

    // Kasseoppgjør by Event
    const byEvent: Record<string, {
        eventId: string
        eventTitle: string
        organizerName: string
        ticketCount: number
        grossRevenue: number
        discounts: number
        netRevenue: number
        mva: number
        refunds: number
        finalAmount: number
    }> = {}

    // Process orders
    for (const order of orders) {
        const refundAmount = order.CreditNote.reduce((sum, cn) => sum + cn.refundAmountCents, 0)
        
        // Track registrations
        for (const reg of order.Registration) {
            const trackId = reg.trackId
            const track = reg.CourseTrack
            
            if (!byTrack[trackId]) {
                byTrack[trackId] = {
                    trackId,
                    trackTitle: track?.title || 'Unknown',
                    periodName: order.CoursePeriod?.name || 'Unknown',
                    organizerName: order.CoursePeriod?.Organizer.name || 'Unknown',
                    registrationCount: 0,
                    grossRevenue: 0,
                    discounts: 0,
                    netRevenue: 0,
                    mva: 0,
                    refunds: 0,
                    finalAmount: 0
                }
            }
            
            // Proportional allocation per registration
            const regCount = order.Registration.length || 1
            const portionGross = order.subtotalCents / regCount
            const portionDiscount = (order.discountCents || 0) / regCount
            const portionMva = (order.mvaCents || 0) / regCount
            const portionTotal = order.totalCents / regCount
            const portionRefund = refundAmount / regCount
            
            byTrack[trackId].registrationCount += 1
            byTrack[trackId].grossRevenue += portionGross
            byTrack[trackId].discounts += portionDiscount
            byTrack[trackId].netRevenue += portionTotal
            byTrack[trackId].mva += portionMva
            byTrack[trackId].refunds += portionRefund
            byTrack[trackId].finalAmount += portionTotal - portionRefund
        }

        // Event registrations
        for (const eventReg of order.EventRegistration) {
            const eventId = eventReg.eventId
            const event = eventReg.Event
            
            if (!byEvent[eventId]) {
                byEvent[eventId] = {
                    eventId,
                    eventTitle: event?.title || 'Unknown',
                    organizerName: order.Organizer?.name || 'Unknown',
                    ticketCount: 0,
                    grossRevenue: 0,
                    discounts: 0,
                    netRevenue: 0,
                    mva: 0,
                    refunds: 0,
                    finalAmount: 0
                }
            }
            
            const evtCount = order.EventRegistration.length || 1
            const portionGross = order.subtotalCents / evtCount
            const portionDiscount = (order.discountCents || 0) / evtCount
            const portionMva = (order.mvaCents || 0) / evtCount
            const portionTotal = order.totalCents / evtCount
            const portionRefund = refundAmount / evtCount
            
            byEvent[eventId].ticketCount += 1
            byEvent[eventId].grossRevenue += portionGross
            byEvent[eventId].discounts += portionDiscount
            byEvent[eventId].netRevenue += portionTotal
            byEvent[eventId].mva += portionMva
            byEvent[eventId].refunds += portionRefund
            byEvent[eventId].finalAmount += portionTotal - portionRefund
        }
    }

    // Calculate totals
    const trackTotals = Object.values(byTrack).reduce((acc, t) => ({
        registrationCount: acc.registrationCount + t.registrationCount,
        grossRevenue: acc.grossRevenue + t.grossRevenue,
        discounts: acc.discounts + t.discounts,
        netRevenue: acc.netRevenue + t.netRevenue,
        mva: acc.mva + t.mva,
        refunds: acc.refunds + t.refunds,
        finalAmount: acc.finalAmount + t.finalAmount
    }), { registrationCount: 0, grossRevenue: 0, discounts: 0, netRevenue: 0, mva: 0, refunds: 0, finalAmount: 0 })

    const eventTotals = Object.values(byEvent).reduce((acc, e) => ({
        ticketCount: acc.ticketCount + e.ticketCount,
        grossRevenue: acc.grossRevenue + e.grossRevenue,
        discounts: acc.discounts + e.discounts,
        netRevenue: acc.netRevenue + e.netRevenue,
        mva: acc.mva + e.mva,
        refunds: acc.refunds + e.refunds,
        finalAmount: acc.finalAmount + e.finalAmount
    }), { ticketCount: 0, grossRevenue: 0, discounts: 0, netRevenue: 0, mva: 0, refunds: 0, finalAmount: 0 })

    return {
        byTrack: Object.values(byTrack).sort((a, b) => b.finalAmount - a.finalAmount),
        byEvent: Object.values(byEvent).sort((a, b) => b.finalAmount - a.finalAmount),
        trackTotals,
        eventTotals,
        grandTotals: {
            totalItems: trackTotals.registrationCount + eventTotals.ticketCount,
            grossRevenue: trackTotals.grossRevenue + eventTotals.grossRevenue,
            discounts: trackTotals.discounts + eventTotals.discounts,
            netRevenue: trackTotals.netRevenue + eventTotals.netRevenue,
            mva: trackTotals.mva + eventTotals.mva,
            refunds: trackTotals.refunds + eventTotals.refunds,
            finalAmount: trackTotals.finalAmount + eventTotals.finalAmount
        }
    }
}
