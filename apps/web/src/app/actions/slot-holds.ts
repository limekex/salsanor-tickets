'use server'

import { prisma } from '@/lib/db'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

// How long a hold lasts before expiring (in minutes)
const HOLD_DURATION_MINUTES = 10

/**
 * Get or create a session key for anonymous slot holds.
 * Uses a cookie to persist across requests.
 */
async function getSessionKey(): Promise<string> {
    const cookieStore = await cookies()
    let sessionKey = cookieStore.get('slot_session')?.value
    
    if (!sessionKey) {
        // Generate a random session key
        sessionKey = crypto.randomUUID()
        cookieStore.set('slot_session', sessionKey, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 // 24 hours
        })
    }
    
    return sessionKey
}

/**
 * Get the current user's person ID if logged in
 */
async function getCurrentPersonId(): Promise<string | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null
    
    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: { PersonProfile: true }
    })
    
    return userAccount?.PersonProfile?.id ?? null
}

export interface SlotAvailability {
    index: number
    startTime: string
    endTime: string
    available: boolean
    heldByCurrentUser: boolean
    bookedCount: number  // For capacity tracking if needed
}

/**
 * Get available slots for a track, accounting for:
 * - Confirmed bookings (Registration.bookedSlots)
 * - Active holds by other users
 * - Active holds by current user (marked as heldByCurrentUser)
 */
export async function getAvailableSlots(trackId: string): Promise<{
    slots: SlotAvailability[]
    error?: string
}> {
    const sessionKey = await getSessionKey()
    const personId = await getCurrentPersonId()
    
    // Get track with slot configuration
    const track = await prisma.courseTrack.findUnique({
        where: { id: trackId },
        select: {
            id: true,
            slotStartTime: true,
            slotDurationMinutes: true,
            slotBreakMinutes: true,
            slotCount: true,
            pricePerSlotCents: true,
            maxContinuousSlots: true
        }
    })
    
    if (!track || !track.slotStartTime || !track.slotCount || !track.slotDurationMinutes) {
        return { slots: [], error: 'Track not found or not configured for slot booking' }
    }
    
    // Clean up expired holds first
    await prisma.slotHold.deleteMany({
        where: {
            expiresAt: { lt: new Date() }
        }
    })
    
    // Get all active holds for this track
    const activeHolds = await prisma.slotHold.findMany({
        where: {
            trackId,
            expiresAt: { gt: new Date() }
        },
        select: {
            slotIndex: true,
            sessionKey: true,
            personId: true
        }
    })
    
    // Get all confirmed bookings for this track
    const confirmedBookings = await prisma.registration.findMany({
        where: {
            trackId,
            status: { in: ['ACTIVE', 'PENDING_PAYMENT'] },
            bookedSlots: { isEmpty: false }
        },
        select: {
            bookedSlots: true
        }
    })
    
    // Count bookings per slot
    const bookedSlotCounts = new Map<number, number>()
    for (const reg of confirmedBookings) {
        for (const slotIdx of reg.bookedSlots) {
            bookedSlotCounts.set(slotIdx, (bookedSlotCounts.get(slotIdx) ?? 0) + 1)
        }
    }
    
    // Build slot list
    const slots: SlotAvailability[] = []
    const [startHours, startMins] = track.slotStartTime.split(':').map(Number)
    let currentMinutes = startHours * 60 + startMins
    
    for (let i = 0; i < track.slotCount; i++) {
        const startH = Math.floor(currentMinutes / 60) % 24
        const startM = currentMinutes % 60
        const endMinutes = currentMinutes + track.slotDurationMinutes
        const endH = Math.floor(endMinutes / 60) % 24
        const endM = endMinutes % 60
        
        // Check if held by someone else
        const holdForSlot = activeHolds.find(h => h.slotIndex === i)
        const heldByOther = holdForSlot && 
            holdForSlot.sessionKey !== sessionKey && 
            holdForSlot.personId !== personId
        
        // Check if held by current user
        const heldByCurrentUser = holdForSlot && 
            (holdForSlot.sessionKey === sessionKey || holdForSlot.personId === personId)
        
        // Check if already booked
        const bookedCount = bookedSlotCounts.get(i) ?? 0
        const isBooked = bookedCount > 0 // For 1:1, any booking means unavailable
        
        slots.push({
            index: i,
            startTime: `${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`,
            endTime: `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`,
            available: !heldByOther && !isBooked,
            heldByCurrentUser: heldByCurrentUser ?? false,
            bookedCount
        })
        
        currentMinutes = endMinutes + (track.slotBreakMinutes ?? 0)
    }
    
    return { slots }
}

/**
 * Hold a slot for the current session.
 * Creates or extends an existing hold.
 */
export async function holdSlot(trackId: string, slotIndex: number): Promise<{
    success: boolean
    expiresAt?: Date
    error?: string
}> {
    const sessionKey = await getSessionKey()
    const personId = await getCurrentPersonId()
    const expiresAt = new Date(Date.now() + HOLD_DURATION_MINUTES * 60 * 1000)
    
    // Check if slot is available (not held by others, not booked)
    const { slots, error } = await getAvailableSlots(trackId)
    if (error) return { success: false, error }
    
    const slot = slots.find(s => s.index === slotIndex)
    if (!slot) return { success: false, error: 'Invalid slot index' }
    
    // Allow if available OR already held by current user
    if (!slot.available && !slot.heldByCurrentUser) {
        return { success: false, error: 'Slot is not available' }
    }
    
    try {
        // Upsert the hold (create or extend)
        await prisma.slotHold.upsert({
            where: {
                trackId_slotIndex_sessionKey: {
                    trackId,
                    slotIndex,
                    sessionKey
                }
            },
            update: {
                expiresAt,
                personId // Update personId if user logged in since
            },
            create: {
                trackId,
                slotIndex,
                sessionKey,
                personId,
                expiresAt
            }
        })
        
        return { success: true, expiresAt }
    } catch (e: any) {
        console.error('Failed to hold slot:', e)
        return { success: false, error: 'Failed to hold slot' }
    }
}

/**
 * Release a slot hold for the current session.
 */
export async function releaseSlot(trackId: string, slotIndex: number): Promise<{
    success: boolean
    error?: string
}> {
    const sessionKey = await getSessionKey()
    
    try {
        await prisma.slotHold.deleteMany({
            where: {
                trackId,
                slotIndex,
                sessionKey
            }
        })
        
        return { success: true }
    } catch (e: any) {
        console.error('Failed to release slot:', e)
        return { success: false, error: 'Failed to release slot' }
    }
}

/**
 * Release all holds for the current session on a track.
 * Called when leaving the registration page without completing.
 */
export async function releaseAllHolds(trackId: string): Promise<{
    success: boolean
    error?: string
}> {
    const sessionKey = await getSessionKey()
    
    try {
        await prisma.slotHold.deleteMany({
            where: {
                trackId,
                sessionKey
            }
        })
        
        return { success: true }
    } catch (e: any) {
        console.error('Failed to release holds:', e)
        return { success: false, error: 'Failed to release holds' }
    }
}

/**
 * Convert holds to confirmed booking when checkout completes.
 * Called from checkout action when order is paid.
 */
export async function confirmSlotBooking(
    registrationId: string,
    trackId: string,
    selectedSlots: number[]
): Promise<{ success: boolean; error?: string }> {
    const sessionKey = await getSessionKey()
    
    try {
        // Update registration with booked slots
        await prisma.registration.update({
            where: { id: registrationId },
            data: { bookedSlots: selectedSlots }
        })
        
        // Delete the holds (they're now confirmed)
        await prisma.slotHold.deleteMany({
            where: {
                trackId,
                slotIndex: { in: selectedSlots },
                sessionKey
            }
        })
        
        return { success: true }
    } catch (e: any) {
        console.error('Failed to confirm slot booking:', e)
        return { success: false, error: 'Failed to confirm booking' }
    }
}

/**
 * Get current user's held slots for a track.
 * Used to restore selection when returning to the registration page.
 */
export async function getMyHeldSlots(trackId: string): Promise<number[]> {
    const sessionKey = await getSessionKey()
    const personId = await getCurrentPersonId()
    
    const holds = await prisma.slotHold.findMany({
        where: {
            trackId,
            expiresAt: { gt: new Date() },
            OR: [
                { sessionKey },
                ...(personId ? [{ personId }] : [])
            ]
        },
        select: { slotIndex: true }
    })
    
    return holds.map(h => h.slotIndex).sort((a, b) => a - b)
}
