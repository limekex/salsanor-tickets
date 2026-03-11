'use server'

import { prisma } from '@/lib/db'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { differenceInWeeks, addWeeks, startOfWeek, isBefore, isAfter } from 'date-fns'

// How long a hold lasts before expiring (in minutes)
const HOLD_DURATION_MINUTES = 10

/**
 * Calculate the weeks within a course period.
 * Returns array of { weekIndex, startDate, endDate } for each week.
 */
function calculatePeriodWeeks(
    periodStart: Date,
    periodEnd: Date,
    trackWeekday: number // 0 = Sunday, 1 = Monday, etc.
): { weekIndex: number; date: Date }[] {
    const weeks: { weekIndex: number; date: Date }[] = []
    
    // Find the first occurrence of the track's weekday on or after periodStart
    let currentDate = new Date(periodStart)
    const dayOfWeek = currentDate.getDay()
    const daysUntilTarget = (trackWeekday - dayOfWeek + 7) % 7
    currentDate.setDate(currentDate.getDate() + daysUntilTarget)
    
    let weekIndex = 0
    while (currentDate <= periodEnd) {
        weeks.push({ weekIndex, date: new Date(currentDate) })
        weekIndex++
        currentDate.setDate(currentDate.getDate() + 7)
    }
    
    return weeks
}

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

export interface WeekInfo {
    weekIndex: number
    date: Date
    formattedDate: string
}

export interface SlotWeekAvailability {
    slotIndex: number
    weekIndex: number
    startTime: string
    endTime: string
    weekDate: Date
    available: boolean
    heldByCurrentUser: boolean
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
 * Get available slots per week for a PRIVATE template track.
 * Returns a grid of (slot × week) availability for per-week booking.
 */
export async function getAvailableSlotsPerWeek(trackId: string): Promise<{
    weeks: WeekInfo[]
    slotsPerWeek: SlotWeekAvailability[]
    slotTimes: { index: number; startTime: string; endTime: string }[]
    pricePerSlotCents: number
    error?: string
}> {
    const sessionKey = await getSessionKey()
    const personId = await getCurrentPersonId()
    
    // Get track with slot configuration and period info
    const track = await prisma.courseTrack.findUnique({
        where: { id: trackId },
        select: {
            id: true,
            weekday: true,
            slotStartTime: true,
            slotDurationMinutes: true,
            slotBreakMinutes: true,
            slotCount: true,
            pricePerSlotCents: true,
            maxContinuousSlots: true,
            CoursePeriod: {
                select: {
                    startDate: true,
                    endDate: true
                }
            }
        }
    })
    
    if (!track || !track.slotStartTime || !track.slotCount || !track.slotDurationMinutes) {
        return { weeks: [], slotsPerWeek: [], slotTimes: [], pricePerSlotCents: 0, error: 'Track not found or not configured for slot booking' }
    }
    
    // Calculate weeks in the period
    const periodWeeks = calculatePeriodWeeks(
        track.CoursePeriod.startDate,
        track.CoursePeriod.endDate,
        track.weekday
    )
    
    const weeks: WeekInfo[] = periodWeeks.map(w => ({
        weekIndex: w.weekIndex,
        date: w.date,
        formattedDate: w.date.toLocaleDateString('nb-NO', { 
            day: 'numeric', 
            month: 'short' 
        })
    }))
    
    // Clean up expired holds first
    await prisma.slotHold.deleteMany({
        where: {
            expiresAt: { lt: new Date() }
        }
    })
    
    // Get all active holds for this track (with weekIndex)
    const activeHolds = await prisma.slotHold.findMany({
        where: {
            trackId,
            expiresAt: { gt: new Date() }
        },
        select: {
            slotIndex: true,
            weekIndex: true,
            sessionKey: true,
            personId: true
        }
    })
    
    // Get all confirmed bookings with their booked weeks
    const confirmedBookings = await prisma.registration.findMany({
        where: {
            trackId,
            status: { in: ['ACTIVE', 'PENDING_PAYMENT'] },
            bookedSlots: { isEmpty: false }
        },
        select: {
            bookedSlots: true,
            bookedWeeks: true
        }
    })
    
    // Build set of (slotIndex, weekIndex) that are booked
    const bookedSlotWeeks = new Set<string>()
    for (const reg of confirmedBookings) {
        const regWeeks = reg.bookedWeeks.length > 0 
            ? reg.bookedWeeks 
            : weeks.map(w => w.weekIndex) // Empty = all weeks
        
        for (const slotIdx of reg.bookedSlots) {
            for (const weekIdx of regWeeks) {
                bookedSlotWeeks.add(`${slotIdx}-${weekIdx}`)
            }
        }
    }
    
    // Build slot times
    const slotTimes: { index: number; startTime: string; endTime: string }[] = []
    const [startHours, startMins] = track.slotStartTime.split(':').map(Number)
    let currentMinutes = startHours * 60 + startMins
    
    for (let i = 0; i < track.slotCount; i++) {
        const startH = Math.floor(currentMinutes / 60) % 24
        const startM = currentMinutes % 60
        const endMinutes = currentMinutes + track.slotDurationMinutes
        const endH = Math.floor(endMinutes / 60) % 24
        const endM = endMinutes % 60
        
        slotTimes.push({
            index: i,
            startTime: `${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`,
            endTime: `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`
        })
        
        currentMinutes = endMinutes + (track.slotBreakMinutes ?? 0)
    }
    
    // Build availability grid
    const slotsPerWeek: SlotWeekAvailability[] = []
    
    for (const slot of slotTimes) {
        for (const week of weeks) {
            const key = `${slot.index}-${week.weekIndex}`
            const isBooked = bookedSlotWeeks.has(key)
            
            // Check holds for this specific slot+week
            const holdForSlotWeek = activeHolds.find(
                h => h.slotIndex === slot.index && h.weekIndex === week.weekIndex
            )
            const heldByOther = holdForSlotWeek && 
                holdForSlotWeek.sessionKey !== sessionKey && 
                holdForSlotWeek.personId !== personId
            const heldByCurrentUser = !!(holdForSlotWeek && 
                (holdForSlotWeek.sessionKey === sessionKey || 
                 (personId && holdForSlotWeek.personId === personId)))
            
            slotsPerWeek.push({
                slotIndex: slot.index,
                weekIndex: week.weekIndex,
                startTime: slot.startTime,
                endTime: slot.endTime,
                weekDate: week.date,
                available: !heldByOther && !isBooked,
                heldByCurrentUser
            })
        }
    }
    
    return { 
        weeks, 
        slotsPerWeek, 
        slotTimes, 
        pricePerSlotCents: track.pricePerSlotCents ?? 0 
    }
}

/**
 * Hold a slot for the current session.
 * Creates or extends an existing hold.
 * Note: weekIndex=null means "all weeks" (for backward compatibility)
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
        // For all-weeks holds (weekIndex=null), use findFirst + update/create
        // because Prisma upsert doesn't handle null in compound unique well
        const existingHold = await prisma.slotHold.findFirst({
            where: {
                trackId,
                slotIndex,
                weekIndex: null,
                sessionKey
            }
        })
        
        if (existingHold) {
            await prisma.slotHold.update({
                where: { id: existingHold.id },
                data: { expiresAt, personId }
            })
        } else {
            await prisma.slotHold.create({
                data: {
                    trackId,
                    slotIndex,
                    weekIndex: null,
                    sessionKey,
                    personId,
                    expiresAt
                }
            })
        }
        
        return { success: true, expiresAt }
    } catch (e: any) {
        console.error('Failed to hold slot:', e)
        return { success: false, error: 'Failed to hold slot' }
    }
}

/**
 * Hold a slot+week combination for per-week booking (Option B).
 */
export async function holdSlotWeek(
    trackId: string, 
    slotIndex: number, 
    weekIndex: number
): Promise<{
    success: boolean
    expiresAt?: Date
    error?: string
}> {
    const sessionKey = await getSessionKey()
    const personId = await getCurrentPersonId()
    const expiresAt = new Date(Date.now() + HOLD_DURATION_MINUTES * 60 * 1000)
    
    // Check if slot+week is available
    const { slotsPerWeek, error } = await getAvailableSlotsPerWeek(trackId)
    if (error) return { success: false, error }
    
    const slotWeek = slotsPerWeek.find(
        sw => sw.slotIndex === slotIndex && sw.weekIndex === weekIndex
    )
    if (!slotWeek) return { success: false, error: 'Invalid slot/week combination' }
    
    // Allow if available OR already held by current user
    if (!slotWeek.available && !slotWeek.heldByCurrentUser) {
        return { success: false, error: 'Slot is not available for this week' }
    }
    
    try {
        await prisma.slotHold.upsert({
            where: {
                trackId_slotIndex_weekIndex_sessionKey: {
                    trackId,
                    slotIndex,
                    weekIndex,
                    sessionKey
                }
            },
            update: {
                expiresAt,
                personId
            },
            create: {
                trackId,
                slotIndex,
                weekIndex,
                sessionKey,
                personId,
                expiresAt
            }
        })
        
        return { success: true, expiresAt }
    } catch (e: any) {
        console.error('Failed to hold slot+week:', e)
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
                weekIndex: null,
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
 * Release a slot+week hold for per-week booking.
 */
export async function releaseSlotWeek(
    trackId: string, 
    slotIndex: number, 
    weekIndex: number
): Promise<{
    success: boolean
    error?: string
}> {
    const sessionKey = await getSessionKey()
    
    try {
        await prisma.slotHold.deleteMany({
            where: {
                trackId,
                slotIndex,
                weekIndex,
                sessionKey
            }
        })
        
        return { success: true }
    } catch (e: any) {
        console.error('Failed to release slot+week:', e)
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
        // Update registration with booked slots (bookedWeeks empty = all weeks)
        await prisma.registration.update({
            where: { id: registrationId },
            data: { 
                bookedSlots: selectedSlots,
                bookedWeeks: [] // Empty = all weeks
            }
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
 * Convert per-week holds to confirmed booking (Option B).
 * Called from checkout action when order is paid.
 */
export async function confirmSlotWeekBooking(
    registrationId: string,
    trackId: string,
    selectedSlots: number[],
    selectedWeeks: number[]
): Promise<{ success: boolean; error?: string }> {
    const sessionKey = await getSessionKey()
    
    try {
        // Update registration with booked slots AND weeks
        await prisma.registration.update({
            where: { id: registrationId },
            data: { 
                bookedSlots: selectedSlots,
                bookedWeeks: selectedWeeks
            }
        })
        
        // Delete the per-week holds (they're now confirmed)
        for (const slotIndex of selectedSlots) {
            for (const weekIndex of selectedWeeks) {
                await prisma.slotHold.deleteMany({
                    where: {
                        trackId,
                        slotIndex,
                        weekIndex,
                        sessionKey
                    }
                })
            }
        }
        
        return { success: true }
    } catch (e: any) {
        console.error('Failed to confirm per-week slot booking:', e)
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
            weekIndex: null, // All-weeks holds only
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

/**
 * Get current user's held slot+week combinations for per-week booking.
 * Returns array of { slotIndex, weekIndex } pairs.
 */
export async function getMyHeldSlotWeeks(trackId: string): Promise<{
    slotIndex: number
    weekIndex: number
}[]> {
    const sessionKey = await getSessionKey()
    const personId = await getCurrentPersonId()
    
    const holds = await prisma.slotHold.findMany({
        where: {
            trackId,
            weekIndex: { not: null }, // Per-week holds only
            expiresAt: { gt: new Date() },
            OR: [
                { sessionKey },
                ...(personId ? [{ personId }] : [])
            ]
        },
        select: { slotIndex: true, weekIndex: true }
    })
    
    return holds
        .filter(h => h.weekIndex !== null)
        .map(h => ({ slotIndex: h.slotIndex, weekIndex: h.weekIndex! }))
        .sort((a, b) => a.slotIndex - b.slotIndex || a.weekIndex - b.weekIndex)
}

/**
 * Batch sync slot+week selections for per-week booking.
 * Takes the desired selection state and syncs database holds in one transaction.
 * 
 * This is optimized for performance:
 * - Single database transaction
 * - Concurrent creates/deletes
 * - No per-click database calls needed
 * 
 * Returns the current availability state after sync (for conflict detection).
 */
export async function syncSlotWeekHolds(
    trackId: string,
    desiredSelections: { slotIndex: number; weekIndex: number }[]
): Promise<{
    success: boolean
    syncedSelections: { slotIndex: number; weekIndex: number }[]
    conflicts: { slotIndex: number; weekIndex: number }[]
    error?: string
}> {
    const sessionKey = await getSessionKey()
    const personId = await getCurrentPersonId()
    const expiresAt = new Date(Date.now() + HOLD_DURATION_MINUTES * 60 * 1000)
    
    try {
        // Get current state in parallel
        const [currentHolds, slotsPerWeekResult] = await Promise.all([
            prisma.slotHold.findMany({
                where: {
                    trackId,
                    weekIndex: { not: null },
                    expiresAt: { gt: new Date() },
                    OR: [
                        { sessionKey },
                        ...(personId ? [{ personId }] : [])
                    ]
                },
                select: { id: true, slotIndex: true, weekIndex: true }
            }),
            // Get availability to check for conflicts
            getAvailableSlotsPerWeek(trackId)
        ])
        
        if (slotsPerWeekResult.error) {
            return { success: false, syncedSelections: [], conflicts: [], error: slotsPerWeekResult.error }
        }
        
        const currentHoldSet = new Set(
            currentHolds.map(h => `${h.slotIndex}-${h.weekIndex}`)
        )
        const desiredSet = new Set(
            desiredSelections.map(s => `${s.slotIndex}-${s.weekIndex}`)
        )
        
        // Calculate diff
        const toAdd: { slotIndex: number; weekIndex: number }[] = []
        const toRemove: string[] = [] // hold IDs
        const conflicts: { slotIndex: number; weekIndex: number }[] = []
        
        // Check what needs to be added
        for (const sel of desiredSelections) {
            const key = `${sel.slotIndex}-${sel.weekIndex}`
            if (!currentHoldSet.has(key)) {
                // Need to add this hold - check availability
                const slotWeek = slotsPerWeekResult.slotsPerWeek.find(
                    sw => sw.slotIndex === sel.slotIndex && sw.weekIndex === sel.weekIndex
                )
                if (slotWeek && (slotWeek.available || slotWeek.heldByCurrentUser)) {
                    toAdd.push(sel)
                } else {
                    // Conflict - slot is not available
                    conflicts.push(sel)
                }
            }
        }
        
        // Check what needs to be removed
        for (const hold of currentHolds) {
            const key = `${hold.slotIndex}-${hold.weekIndex}`
            if (!desiredSet.has(key)) {
                toRemove.push(hold.id)
            }
        }
        
        // Execute changes in transaction
        await prisma.$transaction(async (tx) => {
            // Delete removed holds
            if (toRemove.length > 0) {
                await tx.slotHold.deleteMany({
                    where: { id: { in: toRemove } }
                })
            }
            
            // Create new holds
            if (toAdd.length > 0) {
                await tx.slotHold.createMany({
                    data: toAdd.map(sel => ({
                        trackId,
                        slotIndex: sel.slotIndex,
                        weekIndex: sel.weekIndex,
                        sessionKey,
                        personId,
                        expiresAt
                    })),
                    skipDuplicates: true
                })
            }
        })
        
        // Calculate what actually got synced (desired minus conflicts)
        const syncedSelections = desiredSelections.filter(
            sel => !conflicts.some(c => c.slotIndex === sel.slotIndex && c.weekIndex === sel.weekIndex)
        )
        
        return { success: true, syncedSelections, conflicts }
    } catch (e: any) {
        console.error('Failed to sync slot+week holds:', e)
        return { success: false, syncedSelections: [], conflicts: [], error: 'Failed to sync selections' }
    }
}
