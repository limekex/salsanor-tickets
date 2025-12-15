'use server'

import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { calculatePricing, CartItem } from '@/lib/pricing/engine'
import { redirect } from 'next/navigation'

export async function getCartPricing(items: { trackId: string, role: string, hasPartner: boolean, partnerEmail?: string }[]) {
    if (!items.length) return null

    // Fetch all tracks involved
    const trackIds = items.map(i => i.trackId)
    const tracks = await prisma.courseTrack.findMany({
        where: { id: { in: trackIds } }
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
    if (user) {
        const userAccount = await prisma.userAccount.findUnique({
            where: { supabaseUid: user.id },
            include: { personProfile: { include: { memberships: true } } }
        })

        if (userAccount?.personProfile?.memberships) {
            const activeMembership = userAccount.personProfile.memberships.find(m => m.validTo > new Date())
            if (activeMembership) isMember = true
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
                pricePairCents: track.pricePairCents
            }
        }
    })

    return calculatePricing(fullCartItems, rules, { isMember })
}

export async function createOrderFromCart(items: { trackId: string, role: string, hasPartner: boolean, partnerEmail?: string }[]) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Must be logged in' }

    // 1. Check if user has completed onboarding
    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: { personProfile: true }
    })

    if (!userAccount?.personProfile) {
        return { 
            error: 'Please complete your profile before checking out.',
            redirectToOnboarding: true 
        }
    }

    // 2. Re-calculate Pricing to ensure integrity
    const pricing = await getCartPricing(items)
    if (!pricing) return { error: 'Empty cart' }

    const personId = userAccount.personProfile.id

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

    // Check for duplicate registrations
    const existingRegistrations = await prisma.registration.findMany({
        where: {
            personId: personId!,
            trackId: { in: items.map(i => i.trackId) },
            status: { in: ['DRAFT', 'PENDING_PAYMENT', 'ACTIVE', 'WAITLIST'] }
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
        const order = await prisma.order.create({
            data: {
                periodId,
                purchaserPersonId: personId!,
                status: 'DRAFT',
                subtotalCents: pricing.subtotalCents,
                discountCents: pricing.discountTotalCents,
                totalCents: pricing.finalTotalCents,
                pricingSnapshot: JSON.stringify(pricing), // Store full breakdown
                registrations: {
                    create: items.map(item => ({
                        periodId,
                        trackId: item.trackId,
                        personId: personId!,
                        // Wait, if I buy 2 courses, I am the person for both. 
                        // If I buy for someone else? "Partner". 
                        // The spec says "Participant ... can add multiple tracks ... to my cart".
                        // Logic implies simpler self-registration for now.
                        status: 'DRAFT',
                        chosenRole: item.role as any,
                        // PairGroup logic omitted for brevity in this step, but partnerEmail should trigger it.
                    }))
                }
            }
        })

        return { orderId: order.id }
    } catch (e: any) {
        console.error(e)
        return { error: 'Failed to place order: ' + e.message }
    }
}
