'use server'

import { prisma } from '@/lib/db'
import { requireAdmin } from '@/utils/auth-admin'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { calculatePricing, CartItem } from '@/lib/pricing/engine'

// --- ADMIN ACTIONS ---

export async function promoteToOffered(registrationId: string, hoursValid = 48) {
    await requireAdmin()

    const registration = await prisma.registration.findUnique({
        where: { id: registrationId },
        include: { waitlist: true }
    })

    if (!registration) throw new Error('Registration not found')
    if ((registration.status as string) !== 'WAITLIST' && registration.waitlist?.status !== 'EXPIRED') {
        // Strict check: must be actively on waitlist OR expired offer we want to renew
        if ((registration.status as string) !== 'WAITLIST') {
            throw new Error('Registration is not on waitlist')
        }
    }

    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + hoursValid)

    await prisma.waitlistEntry.upsert({
        where: { registrationId },
        create: {
            registrationId,
            status: 'OFFERED',
            offeredUntil: expiresAt
        },
        update: {
            status: 'OFFERED',
            offeredUntil: expiresAt
        }
    })

    // Send waitlist offer email
    try {
        const { emailService } = await import('@/lib/email/email-service')
        const fullRegistration = await prisma.registration.findUnique({
            where: { id: registrationId },
            include: {
                person: true,
                track: {
                    include: {
                        period: {
                            include: {
                                organizer: true
                            }
                        }
                    }
                }
            }
        })
        
        if (fullRegistration?.person?.email && fullRegistration.track?.period) {
            const expiryDate = expiresAt.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
            
            await emailService.sendTransactional({
                organizerId: fullRegistration.track.period.organizerId,
                templateSlug: 'waitlist-offer',
                recipientEmail: fullRegistration.person.email,
                recipientName: `${fullRegistration.person.firstName} ${fullRegistration.person.lastName}`.trim() || undefined,
                variables: {
                    recipientName: fullRegistration.person.firstName || 'Participant',
                    organizationName: fullRegistration.track.period.organizer.name,
                    eventName: fullRegistration.track.period.name,
                    trackName: fullRegistration.track.title,
                    expiryDate: expiryDate,
                    hoursValid: hoursValid.toString(),
                },
                language: 'en',
            })
        }
    } catch (emailError) {
        // Log but don't fail the offer if email fails
        console.error('Failed to send waitlist offer email:', emailError)
    }

    revalidatePath('/admin/registrations')
    // Also revalidate the track page if we knew the ID, but global path is hard.
    // We'll trust Next.js cache headers or generic revalidate
    return { success: true }
}

export async function expireOffers() {
    await requireAdmin()

    const now = new Date()
    const expired = await prisma.waitlistEntry.findMany({
        where: {
            status: 'OFFERED',
            offeredUntil: { lt: now }
        }
    })

    for (const entry of expired) {
        await prisma.waitlistEntry.update({
            where: { id: entry.id },
            data: { status: 'EXPIRED' }
        })
    }
    return { count: expired.length }
}

// --- USER ACTIONS ---

export async function acceptWaitlistOffer(registrationId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // 1. Verify Ownership & Validity
    const registration = await prisma.registration.findFirst({
        where: {
            id: registrationId,
            person: { userId: user.user_metadata.sub || user.id } // Match person's user ID implies ownership?
            // Actually, we should match via UserAccount -> PersonProfile -> Registration
            // But let's verify via person -> user connection
        },
        include: {
            waitlist: true,
            track: true,
            person: true
        }
    })

    // Better security:
    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: { personProfile: true }
    })

    // Check if registration personId matches user's personId
    if (!registration || registration.personId !== userAccount?.personProfile?.id) {
        throw new Error('Registration not found or access denied')
    }

    if (registration.waitlist?.status !== 'OFFERED') {
        throw new Error('No valid offer found')
    }
    if (registration.waitlist.offeredUntil && registration.waitlist.offeredUntil < new Date()) {
        throw new Error('Offer expired')
    }

    // 2. Calculate Price
    const track = registration.track
    const periodId = track.periodId

    const rules = await prisma.discountRule.findMany({
        where: { periodId, enabled: true },
        orderBy: { priority: 'asc' }
    })

    // Check membership
    let isMember = false
    const membership = await prisma.membership.findFirst({
        where: {
            personId: registration.personId,
            validTo: { gt: new Date() }
        }
    })
    if (membership) isMember = true

    // Build CartItem
    const cartItem: CartItem = {
        trackId: track.id,
        role: registration.chosenRole === 'ANY' ? 'LEADER' : (registration.chosenRole as any), // Default to Leader if ANY? Or just pass as is? Pricing engine expects LEADER/FOLLOWER.
        // If chosenRole is ANY, we must decide. But Waitlist usually implies specific role?
        // Let's assume defined role.
        hasPartner: false, // Waitlist promotion usually single person? 
        partnerEmail: undefined,
        track: {
            id: track.id,
            priceSingleCents: track.priceSingleCents,
            pricePairCents: track.pricePairCents
        }
    }

    // Calculate
    const pricing = calculatePricing([cartItem], rules, { isMember })

    // 3. Update DB
    // Transactional? Yes.

    const result = await prisma.$transaction(async (tx) => {
        // Update Waitlist
        await tx.waitlistEntry.update({
            where: { registrationId },
            data: { status: 'ACCEPTED' }
        })

        // Update Registration to DRAFT (so it can be paid)
        await tx.registration.update({
            where: { id: registrationId },
            data: {
                status: 'DRAFT',
            }
        })

        // Create Order
        const order = await tx.order.create({
            data: {
                periodId,
                purchaserPersonId: registration.personId,
                status: 'DRAFT',
                subtotalCents: pricing.subtotalCents,
                subtotalAfterDiscountCents: pricing.subtotalCents - pricing.discountTotalCents,
                discountCents: pricing.discountTotalCents,
                totalCents: pricing.finalTotalCents,
                pricingSnapshot: JSON.stringify(pricing),
                registrations: {
                    connect: { id: registrationId }
                }
            }
        })

        // Link Order to Registration (inverse relation needs explicit update if not using nested create?)
        // `registrations: { connect: ... }` on Order create handles the relation update on Registration side in Prisma.

        return order
    })

    revalidatePath('/profile')
    return { success: true, orderId: result.id }
}

export async function declineWaitlistOffer(registrationId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: { personProfile: true }
    })

    const registration = await prisma.registration.findUnique({ where: { id: registrationId } })
    if (!registration || registration.personId !== userAccount?.personProfile?.id) {
        throw new Error('Access denied')
    }

    await prisma.$transaction([
        prisma.waitlistEntry.update({
            where: { registrationId },
            data: { status: 'REMOVED' }
        }),
        prisma.registration.update({
            where: { id: registrationId },
            data: { status: 'CANCELLED' }
        })
    ])

    revalidatePath('/profile')
    return { success: true }
}
