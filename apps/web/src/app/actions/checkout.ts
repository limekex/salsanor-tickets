'use server'

import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { calculatePricing, CartItem, calculateOrderTotal } from '@/lib/pricing/engine'
import { createAuditLog } from '@/lib/audit'
import { redirect } from 'next/navigation'
import { randomUUID } from 'crypto'

export async function getCartPricing(items: { trackId: string, role: string, hasPartner: boolean, partnerEmail?: string }[]) {
    if (!items.length) return null

    // Fetch all tracks involved
    const trackIds = items.map(i => i.trackId)
    const tracks = await prisma.courseTrack.findMany({
        where: { id: { in: trackIds } },
        select: {
            id: true,
            periodId: true,
            priceSingleCents: true,
            pricePairCents: true,
            memberPriceSingleCents: true,
            memberPricePairCents: true
        }
    })

    if (tracks.length !== items.length) {
        // Some tracks missing/deleted?
        // Warning: partial fetch
    }

    // Get period ID from first track (assume all same period for MVP, or grouped)
    const periodId = tracks[0].periodId

    // Get rules for this period
    const rules = await prisma.discountRule.findMany({
        where: { periodId, enabled: true },
        orderBy: { priority: 'asc' }
    })

    // Get User Context
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let isMember = false
    let membershipTierId: string | undefined
    
    if (user) {
        const userAccount = await prisma.userAccount.findUnique({
            where: { supabaseUid: user.id },
            include: { 
                PersonProfile: { 
                    include: { 
                        Membership: {
                            where: {
                                validTo: { gt: new Date() }
                            },
                            orderBy: {
                                validTo: 'desc' // Get most recent active membership
                            },
                            take: 1
                        }
                    } 
                } 
            }
        })

        const activeMembership = userAccount?.PersonProfile?.Membership?.[0]
        if (activeMembership) {
            isMember = true
            membershipTierId = activeMembership.tierId
        }
    }

    // Map items to CartItem (with full track data)
    const fullCartItems: CartItem[] = items.map(item => {
        const track = tracks.find(t => t.id === item.trackId)
        if (!track) throw new Error(`Track ${item.trackId} not found`)
        return {
            ...item,
            role: item.role as any,
            track: {
                id: track.id,
                priceSingleCents: track.priceSingleCents,
                pricePairCents: track.pricePairCents,
                memberPriceSingleCents: track.memberPriceSingleCents,
                memberPricePairCents: track.memberPricePairCents
            }
        }
    })

    return calculatePricing(fullCartItems, rules, { isMember, membershipTierId })
}

export async function createOrderFromCart(items: { trackId: string, role: string, hasPartner: boolean, partnerEmail?: string }[]) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Must be logged in' }

    // 1. Check if user has completed onboarding
    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: { PersonProfile: true }
    })

    if (!userAccount?.PersonProfile) {
        return { 
            error: 'Please complete your profile before checking out.',
            redirectToOnboarding: true 
        }
    }

    // 2. Re-calculate Pricing to ensure integrity
    const pricing = await getCartPricing(items)
    if (!pricing) return { error: 'Empty cart' }

    const personId = userAccount.PersonProfile.id

    // 3. Create Order
    // Assuming all items are same period for now? 
    // If mixed periods, we might need multiple orders or one order with mixed items.
    // The Schema `Order` has `periodId`. So we MUST group by period or enable mixed.
    // Schema says Order -> periodId. So STRICTLY one period per order.
    // We should validate items all match same period.

    // For MVP calculate pricing fetches period from first track.
    const tracks = await prisma.courseTrack.findMany({ where: { id: { in: items.map(i => i.trackId) } } })
    const periodId = tracks[0].periodId
    const allSamePeriod = tracks.every(t => t.periodId === periodId)
    if (!allSamePeriod) return { error: 'All items must be from the same course period.' }

    // Clean up old registrations that should not block re-registration:
    // - DRAFT: incomplete checkouts
    // - CANCELLED: user cancelled and should be able to re-register
    // - REFUNDED: refunded registrations, user should be able to buy again
    // This must happen BEFORE we check for active duplicates
    const deletedRegistrations = await prisma.registration.deleteMany({
        where: {
            personId: personId!,
            trackId: { in: items.map(i => i.trackId) },
            status: { in: ['DRAFT', 'CANCELLED', 'REFUNDED'] }
        }
    })
    
    // Also clean up DRAFT orders that now have no registrations
    // (CANCELLED orders with CANCELLED registrations should remain for audit history)
    if (deletedRegistrations.count > 0) {
        await prisma.order.deleteMany({
            where: {
                purchaserPersonId: personId!,
                status: 'DRAFT',
                registrations: {
                    none: {}
                }
            }
        })
    }

    // Check for active duplicate registrations
    // Only PENDING_PAYMENT, ACTIVE, and WAITLIST should block re-registration
    const existingRegistrations = await prisma.registration.findMany({
        where: {
            personId: personId!,
            trackId: { in: items.map(i => i.trackId) },
            status: { in: ['PENDING_PAYMENT', 'ACTIVE', 'WAITLIST'] }
        }
    })

    if (existingRegistrations.length > 0) {
        const duplicateTracks = existingRegistrations.map(r => {
            const track = tracks.find(t => t.id === r.trackId)
            return track?.title || 'Unknown'
        })
        return { error: `You are already registered for: ${duplicateTracks.join(', ')}. Check your profile.` }
    }

    try {
        // Get organizer MVA rate
        const period = await prisma.coursePeriod.findUniqueOrThrow({
            where: { id: periodId },
            include: { Organizer: true }
        })
        
        const mvaRate = period.Organizer.mvaReportingRequired 
            ? Number(period.Organizer.mvaRate) 
            : 0
            
        // Calculate order total with MVA
        const orderPricing = calculateOrderTotal({
            subtotalCents: pricing.subtotalCents,
            discountCents: pricing.discountTotalCents,
            mvaRate
        })
        
        const order = await prisma.order.create({
            data: {
                periodId,
                organizerId: period.Organizer.id,
                purchaserPersonId: personId!,
                status: 'DRAFT',
                subtotalCents: orderPricing.subtotalBeforeDiscountCents,
                discountCents: orderPricing.discountCents,
                subtotalAfterDiscountCents: orderPricing.subtotalAfterDiscountCents,
                mvaRate: orderPricing.mvaRate,
                mvaCents: orderPricing.mvaCents,
                totalCents: orderPricing.totalCents,
                pricingSnapshot: JSON.stringify({
                    ...pricing,
                    mva: {
                        rate: orderPricing.mvaRate,
                        amount: orderPricing.mvaCents
                    }
                }),
                Registration: {
                    create: items.map(item => ({
                        periodId,
                        trackId: item.trackId,
                        personId: personId!,
                        status: 'DRAFT',
                        chosenRole: item.role as any,
                    }))
                }
            }
        })
        
        // Audit log
        await createAuditLog({
            userId: userAccount?.id,
            entityType: 'Order',
            entityId: order.id,
            action: 'CREATE',
            changes: { status: 'DRAFT', totalCents: order.totalCents, mvaCents: order.mvaCents }
        })

        return { orderId: order.id }
    } catch (e: any) {
        console.error(e)
        return { error: 'Failed to place order: ' + e.message }
    }
}

export async function createEventOrderFromCart(items: { eventId: string, quantity: number }[]) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Must be logged in' }

    // 1. Check if user has completed onboarding
    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: { PersonProfile: true }
    })

    if (!userAccount?.PersonProfile) {
        return { 
            error: 'Please complete your profile before checking out.',
            redirectToOnboarding: true 
        }
    }

    const personId = userAccount.PersonProfile.id

    // 2. Fetch all events with organizer info
    const eventIds = items.map(i => i.eventId)
    const events = await prisma.event.findMany({
        where: { id: { in: eventIds }, published: true },
        select: {
            id: true,
            title: true,
            organizerId: true,
            basePriceCents: true,
            memberPriceCents: true,
            capacityTotal: true,
            Organizer: {
                select: {
                    id: true,
                    mvaReportingRequired: true,
                    mvaRate: true
                }
            },
            EventRegistration: {
                select: { quantity: true },
                where: { status: 'ACTIVE' }
            }
        }
    })

    if (events.length !== items.length) {
        return { error: 'Some events are no longer available' }
    }

    // 3. Verify all events are from same organizer
    const organizerIds = [...new Set(events.map(e => e.organizerId))]
    if (organizerIds.length !== 1) {
        return { error: 'All events must be from the same organizer' }
    }

    // 4. Check capacity for each event
    // Sum up quantities from active registrations for accurate capacity tracking
    for (const item of items) {
        const event = events.find(e => e.id === item.eventId)!
        const registeredCount = event.EventRegistration.reduce((sum, reg) => sum + reg.quantity, 0)
        const available = event.capacityTotal - registeredCount
        if (available < item.quantity) {
            return { error: `${event.title} har kun ${available} plasser tilgjengelig` }
        }
    }

    // 5. Check if user is a member (for pricing)
    const activeMembership = await prisma.membership.findFirst({
        where: {
            personId,
            status: 'ACTIVE',
            validTo: { gte: new Date() }
        }
    })

    const isMember = !!activeMembership

    // 6. Calculate total price
    // Price is entered as final price (inclusive of any VAT if applicable)
    // VAT is only calculated and documented when organizer is VAT-registered
    let subtotalCents = 0
    for (const item of items) {
        const event = events.find(e => e.id === item.eventId)!
        const pricePerTicket = (isMember && event.memberPriceCents) 
            ? event.memberPriceCents 
            : event.basePriceCents
        subtotalCents += pricePerTicket * item.quantity
    }

    // Get organizer MVA settings
    const organizer = events[0].Organizer
    
    // Calculate MVA only if organizer is VAT-registered
    // Price is already inclusive of VAT, so we calculate VAT component for documentation
    const mvaRate = organizer.mvaReportingRequired ? Number(organizer.mvaRate || 25) : 0
    const subtotalAfterDiscountCents = subtotalCents // No discounts for events yet
    // Since price is VAT-inclusive, extract VAT from total: VAT = total - (total / (1 + rate))
    const mvaCents = mvaRate > 0 
        ? Math.round(subtotalAfterDiscountCents - (subtotalAfterDiscountCents / (1 + mvaRate / 100)))
        : 0
    // Total is the same as subtotal (price is already inclusive)
    const totalCents = subtotalAfterDiscountCents

    // 7. Create Order with EventRegistrations
    // Use a transaction to prevent race conditions on capacity
    try {
        // Check if user already has active registrations for these events
        const existingActiveRegs = await prisma.eventRegistration.findMany({
            where: {
                personId,
                eventId: { in: items.map(i => i.eventId) },
                status: 'ACTIVE'
            },
            include: { Event: { select: { title: true } } }
        })
        
        if (existingActiveRegs.length > 0) {
            const eventTitles = existingActiveRegs.map(r => r.Event.title).join(', ')
            return { error: `Du er allerede påmeldt: ${eventTitles}` }
        }

        // Delete any pending payment registrations from previous failed attempts
        for (const item of items) {
            await prisma.eventRegistration.deleteMany({
                where: {
                    eventId: item.eventId,
                    personId,
                    status: 'PENDING_PAYMENT'
                }
            })
        }

        // Create order in a transaction with capacity re-check to prevent overselling
        const order = await prisma.$transaction(async (tx) => {
            // Re-check capacity within transaction to prevent race conditions
            for (const item of items) {
                const event = await tx.event.findUnique({
                    where: { id: item.eventId },
                    include: {
                        EventRegistration: {
                            select: { quantity: true },
                            where: { status: 'ACTIVE' }
                        }
                    }
                })
                
                if (!event) {
                    throw new Error(`Event ${item.eventId} not found`)
                }
                
                const registeredCount = event.EventRegistration.reduce((sum, reg) => sum + reg.quantity, 0)
                const available = event.capacityTotal - registeredCount
                
                if (available < item.quantity) {
                    throw new Error(`${event.title} har kun ${available} plasser tilgjengelig`)
                }
            }

            // Create the order
            return await tx.order.create({
                data: {
                    id: randomUUID(),
                    updatedAt: new Date(),
                    purchaserPersonId: personId,
                    orderType: 'EVENT',
                    organizerId: organizerIds[0],
                    status: 'DRAFT',
                    subtotalCents,
                    discountCents: 0,
                    subtotalAfterDiscountCents,
                    mvaRate,
                    mvaCents,
                    totalCents,
                    pricingSnapshot: JSON.stringify({
                        events: items.map(item => {
                            const event = events.find(e => e.id === item.eventId)!
                            return {
                                eventId: item.eventId,
                                quantity: item.quantity,
                                pricePerTicket: (isMember && event.memberPriceCents) 
                                    ? event.memberPriceCents 
                                    : event.basePriceCents,
                                isMember
                            }
                        }),
                        mva: {
                            rate: mvaRate,
                            amount: mvaCents
                        }
                    }),
                    EventRegistration: {
                        create: items.map(item => {
                            const event = events.find(e => e.id === item.eventId)!
                            const pricePerTicket = (isMember && event.memberPriceCents) 
                                ? event.memberPriceCents 
                                : event.basePriceCents
                            
                            return {
                                id: randomUUID(),
                                updatedAt: new Date(),
                                eventId: item.eventId,
                                personId,
                                quantity: item.quantity,
                                unitPriceCents: pricePerTicket,
                                status: 'PENDING_PAYMENT'
                            }
                        })
                    }
                }
            })
        })

        // TODO: Audit log disabled - AuditLog schema has hard FK to Invoice only
        // Need to fix schema to support multiple entity types (Order, Payment, etc)
        // See: packages/database/prisma/schema.prisma - AuditLog model

        return { orderId: order.id }
    } catch (e: any) {
        console.error(e)
        // Check if this is our capacity error
        if (e.message && e.message.includes('har kun')) {
            return { error: e.message }
        }
        return { error: 'Kunne ikke opprette ordre: ' + e.message }
    }
}
