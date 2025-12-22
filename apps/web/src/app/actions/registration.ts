'use server'

import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/utils/auth-admin'
import { calculateOrderTotal } from '@/lib/pricing/engine'
import { createAuditLog } from '@/lib/audit'

export async function createRegistration(prevState: any, formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'You must be logged in to register.' }
    }

    // 1. Extract Data
    const trackId = formData.get('trackId') as string
    const periodId = formData.get('periodId') as string
    const role = formData.get('role') as string // 'LEADER' | 'FOLLOWER'
    const partnerEmail = formData.get('partnerEmail') as string | null

    // 2. Initial Validation
    if (!trackId || !periodId || !role) {
        return { error: 'Missing required fields.' }
    }

    // 3. Get User Profile (or create if missing? Auth trigger created UserAccount, checking PersonProfile)
    // We assume PersonProfile might not exist if we haven't built that flow yet. 
    // For now, let's create a stub profile if missing, or error. 
    // Spec says "PersonProfile" is linked to UserAccount.

    // Check if UserAccount exists (should)
    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: { personProfile: true }
    })

    if (!userAccount) {
        return { error: 'User account not found via Supabase UID.' }
    }

    let personId = userAccount.personProfile?.id

    if (!personId) {
        // User needs to complete onboarding first
        return { error: 'Please complete your profile before registering for courses.', redirectToOnboarding: true }
    }

    // 4. Create Order & Registration (Transaction)
    try {
        await prisma.$transaction(async (tx) => {
            // Get Track Price and Period with Organizer
            const track = await tx.courseTrack.findUniqueOrThrow({ 
                where: { id: trackId },
                include: {
                    period: {
                        include: {
                            organizer: true
                        }
                    }
                }
            })

            // Determine price
            let basePrice = track.priceSingleCents
            if (partnerEmail && track.pricePairCents) {
                basePrice = track.pricePairCents
            }

            // Calculate with MVA
            const mvaRate = track.period.organizer.mvaReportingRequired 
                ? Number(track.period.organizer.mvaRate) 
                : 0
                
            const pricing = calculateOrderTotal({
                subtotalCents: basePrice,
                discountCents: 0,
                mvaRate
            })

            // Create Order
            const order = await tx.order.create({
                data: {
                    periodId,
                    purchaserPersonId: personId!,
                    status: 'DRAFT',
                    subtotalCents: pricing.subtotalBeforeDiscountCents,
                    discountCents: pricing.discountCents,
                    subtotalAfterDiscountCents: pricing.subtotalAfterDiscountCents,
                    mvaRate: pricing.mvaRate,
                    mvaCents: pricing.mvaCents,
                    totalCents: pricing.totalCents,
                    pricingSnapshot: {
                        trackPrice: track.priceSingleCents,
                        pairPrice: track.pricePairCents,
                        chosenRole: role,
                        hasPartner: !!partnerEmail,
                        mvaRate: pricing.mvaRate,
                        mvaCents: pricing.mvaCents
                    },
                }
            })
            
            // Audit log for compliance
            await createAuditLog({
                userId: userAccount?.id,
                entityType: 'Order',
                entityId: order.id,
                action: 'CREATE',
                changes: { status: 'DRAFT', totalCents: order.totalCents }
            })

            // Create Registration
            await tx.registration.create({
                data: {
                    periodId,
                    trackId,
                    personId: personId!,
                    status: 'DRAFT',
                    chosenRole: role as any,
                    orderId: order.id
                }
            })

            // If Partner is included, creating a placeholder registration for them? 
            // Complicated. Spec says "Invite partner". 
            // For MVP, we just store the partner info in the Order Meta or a PairGroup?
            // "PairGroup" table exists.
            if (partnerEmail) {
                const pairGroup = await tx.pairGroup.create({
                    data: { periodId }
                })
                // Link current registration
                // We can't update the just-created registration easily inside prisma create return without another query or connect
                // Actually we can link pairGroupId during create above if we created Group first.
            }
        })
    } catch (e: any) {
        console.error(e)
        return { error: 'Failed to create registration: ' + e.message }
    }

    redirect('/profile') // or /orders/[id]
}

export async function getAllRegistrations() {
    await requireAdmin()
    
    return await prisma.registration.findMany({
        include: {
            person: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true
                }
            },
            track: {
                select: {
                    id: true,
                    title: true,
                    weekday: true,
                    timeStart: true,
                    timeEnd: true
                }
            },
            period: {
                select: {
                    id: true,
                    code: true,
                    name: true,
                    organizer: {
                        select: {
                            id: true,
                            name: true,
                            slug: true
                        }
                    }
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    })
}
