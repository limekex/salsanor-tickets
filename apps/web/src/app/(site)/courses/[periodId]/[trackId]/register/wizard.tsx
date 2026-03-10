'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Clock, Loader2, Lock, CloudOff, Check } from 'lucide-react'
import { toast } from 'sonner'
import { formatWeekday, formatDateShort } from '@/lib/formatters'
import { useCart } from '@/hooks/use-cart'
import { useRouter } from 'next/navigation'
import { CustomFieldsForm } from '@/components/custom-fields-form'
import type { CustomFieldDefinition, CustomFieldValues } from '@/types/custom-fields'
import { validateCustomFields } from '@/types/custom-fields'
import { 
    getAvailableSlots,
    getAvailableSlotsPerWeek,
    holdSlot,
    holdSlotWeek,
    releaseSlot,
    releaseSlotWeek,
    releaseAllHolds,
    syncSlotWeekHolds,
    type SlotAvailability,
    type SlotWeekAvailability,
    type WeekInfo
} from '@/app/actions/slot-holds'

interface WizardTrack {
    id: string
    title: string
    weekday?: number
    priceSingleCents: number
    pricePairCents?: number | null
    // Slot booking fields for PRIVATE
    slotStartTime?: string | null
    slotDurationMinutes?: number | null
    slotBreakMinutes?: number | null
    slotCount?: number | null
    pricePerSlotCents?: number | null
    maxContinuousSlots?: number | null
    // Period dates for display
    periodStartDate?: string | null
    periodEndDate?: string | null
    CoursePeriod?: {
        Organizer?: { id?: string; name?: string }
    } | null
}

interface WizardProps {
    track: WizardTrack
    periodId: string
    customFields?: CustomFieldDefinition[]
    templateType?: string
}

export function RegistrationWizard({ track, periodId, customFields = [], templateType = 'INDIVIDUAL' }: WizardProps) {
    const isPartner = templateType === 'PARTNER'
    const isPrivate = templateType === 'PRIVATE'

    const [step, setStep] = useState(1)
    const [role, setRole] = useState<'LEADER' | 'FOLLOWER' | null>(null)
    const [hasPartner, setHasPartner] = useState(false)
    const [partnerEmail, setPartnerEmail] = useState('')
    const [selectedSlots, setSelectedSlots] = useState<number[]>([])
    const [customFieldValues, setCustomFieldValues] = useState<CustomFieldValues>({})
    const [customFieldErrors, setCustomFieldErrors] = useState<Record<string, string>>({})
    const { addCourseItem, getCartOrganizerId, getCartOrganizerName, clearCart } = useCart()
    const router = useRouter()

    const hasCustomFields = customFields.length > 0

    // Slot availability state for PRIVATE template (legacy all-weeks mode)
    const [availableSlots, setAvailableSlots] = useState<SlotAvailability[]>([])
    const [slotsLoading, setSlotsLoading] = useState(false)
    const [slotError, setSlotError] = useState<string | null>(null)
    const [holdingSlot, setHoldingSlot] = useState<number | null>(null) // Slot currently being held/released
    
    // Per-week slot booking state (Option B) - Optimistic UI
    const [weeks, setWeeks] = useState<WeekInfo[]>([])
    const [slotsPerWeek, setSlotsPerWeek] = useState<SlotWeekAvailability[]>([])
    const [slotTimes, setSlotTimes] = useState<{ index: number; startTime: string; endTime: string }[]>([])
    const [selectedSlotWeeks, setSelectedSlotWeeks] = useState<{ slotIndex: number; weekIndex: number }[]>([])
    const [slotPricePerWeek, setSlotPricePerWeek] = useState(0)
    
    // Optimistic UI state for debounced batch saves
    const [isSyncing, setIsSyncing] = useState(false)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const pendingSelectionsRef = useRef<{ slotIndex: number; weekIndex: number }[]>([])

    // Fetch available slots for PRIVATE template (per-week mode)
    const fetchSlots = useCallback(async () => {
        if (!isPrivate) return
        setSlotsLoading(true)
        setSlotError(null)
        try {
            // Use per-week availability
            const result = await getAvailableSlotsPerWeek(track.id)
            if (result.error) {
                setSlotError(result.error)
            } else {
                setWeeks(result.weeks)
                setSlotsPerWeek(result.slotsPerWeek)
                setSlotTimes(result.slotTimes)
                setSlotPricePerWeek(result.pricePerSlotCents)
                
                // Restore any slot+week combinations we already have holds on
                const heldSlotWeeks = result.slotsPerWeek
                    .filter(sw => sw.heldByCurrentUser)
                    .map(sw => ({ slotIndex: sw.slotIndex, weekIndex: sw.weekIndex }))
                if (heldSlotWeeks.length > 0) {
                    setSelectedSlotWeeks(heldSlotWeeks)
                }
            }
        } catch (e) {
            setSlotError('Failed to load available slots')
        } finally {
            setSlotsLoading(false)
        }
    }, [isPrivate, track.id])

    // Fetch slots on mount
    useEffect(() => {
        fetchSlots()
    }, [fetchSlots])

    // Release holds when leaving the page without completing
    useEffect(() => {
        if (!isPrivate) return
        
        // Only release holds if user navigates away without completing
        return () => {
            // Note: This cleanup runs on unmount, but selectedSlots may be stale
            // The actual release will happen, but we rely on server-side expiry as backup
        }
    }, [isPrivate])

    const maxContinuous = track.maxContinuousSlots ?? 2

    /*
     * Step layout by template type:
     *
     * PARTNER  : 1=Role  2=Partner  [3=CustomFields]  last=Summary
     * PRIVATE  : 1=SlotSelection  [2=CustomFields]  last=Summary
     * others   : [1=CustomFields]  last=Summary
     *
     * We normalise: for non-PARTNER the first real step is always 1.
     * The PARTNER path injects 2 extra steps at the front.
     * The PRIVATE path injects 1 step at the front.
     */
    const partnerSteps = isPartner ? 2 : 0
    const privateSteps = isPrivate ? 1 : 0
    const templateSteps = partnerSteps + privateSteps
    const customFieldStep = hasCustomFields ? templateSteps + 1 : null
    const summaryStep = (hasCustomFields ? 1 : 0) + templateSteps + 1
    const totalSteps = summaryStep

    const currentOrganizerId = track.CoursePeriod?.Organizer?.id
    const currentOrganizerName = track.CoursePeriod?.Organizer?.name
    const cartOrganizerId = getCartOrganizerId()
    const cartOrganizerName = getCartOrganizerName()
    const isDifferentOrganizer = !!(cartOrganizerId && cartOrganizerId !== currentOrganizerId)

    // Calculate price based on template type
    const price = useMemo(() => {
        if (isPrivate && slotPricePerWeek > 0 && selectedSlotWeeks.length > 0) {
            // PRIVATE: price per slot per week × number of slot+week selections
            return (slotPricePerWeek * selectedSlotWeeks.length) / 100
        }
        if (isPartner && hasPartner && track.pricePairCents) {
            return track.pricePairCents / 100
        }
        return track.priceSingleCents / 100
    }, [isPrivate, isPartner, hasPartner, track, selectedSlotWeeks.length, slotPricePerWeek])

    // Count unique slots and weeks in selection
    const selectedSlotsCount = useMemo(() => {
        return new Set(selectedSlotWeeks.map(sw => sw.slotIndex)).size
    }, [selectedSlotWeeks])
    
    const selectedWeeksCount = useMemo(() => {
        return new Set(selectedSlotWeeks.map(sw => sw.weekIndex)).size
    }, [selectedSlotWeeks])

    const priceLabel = useMemo(() => {
        if (isPrivate && selectedSlotWeeks.length > 0) {
            return `Total (${selectedSlotWeeks.length} session${selectedSlotWeeks.length > 1 ? 's' : ''})`
        }
        if (isPartner && hasPartner && track.pricePairCents) {
            return 'Total Couple Price'
        }
        return 'Total Price'
    }, [isPrivate, isPartner, hasPartner, track.pricePairCents, selectedSlotWeeks.length])

    // Debounced batch sync to server
    const syncSelectionsToServer = useCallback(async (selections: { slotIndex: number; weekIndex: number }[]) => {
        setIsSyncing(true)
        setSlotError(null)
        
        try {
            const result = await syncSlotWeekHolds(track.id, selections)
            
            if (result.success) {
                // Handle conflicts - remove them from selection
                if (result.conflicts.length > 0) {
                    setSelectedSlotWeeks(result.syncedSelections)
                    setSlotError(`${result.conflicts.length} slot(s) were taken by someone else`)
                    // Refresh availability
                    await fetchSlots()
                }
                setHasUnsavedChanges(false)
            } else {
                setSlotError(result.error ?? 'Failed to sync selections')
            }
        } catch (e) {
            setSlotError('Failed to sync selections')
        } finally {
            setIsSyncing(false)
        }
    }, [track.id, fetchSlots])

    // Schedule debounced sync when selections change
    const scheduleSyncToServer = useCallback((newSelections: { slotIndex: number; weekIndex: number }[]) => {
        // Cancel any pending sync
        if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current)
        }
        
        pendingSelectionsRef.current = newSelections
        setHasUnsavedChanges(true)
        
        // Schedule sync after 500ms of inactivity
        syncTimeoutRef.current = setTimeout(() => {
            syncSelectionsToServer(pendingSelectionsRef.current)
        }, 500)
    }, [syncSelectionsToServer])

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current)
            }
        }
    }, [])

    // Helper to find the longest consecutive slot sequence for a week
    function getMaxConsecutiveInWeek(selections: { slotIndex: number; weekIndex: number }[], weekIdx: number): number {
        const slotsInWeek = selections
            .filter(s => s.weekIndex === weekIdx)
            .map(s => s.slotIndex)
            .sort((a, b) => a - b)
        
        if (slotsInWeek.length === 0) return 0
        if (slotsInWeek.length === 1) return 1
        
        let maxConsecutive = 1
        let currentConsecutive = 1
        
        for (let i = 1; i < slotsInWeek.length; i++) {
            if (slotsInWeek[i] === slotsInWeek[i - 1] + 1) {
                currentConsecutive++
                maxConsecutive = Math.max(maxConsecutive, currentConsecutive)
            } else {
                currentConsecutive = 1
            }
        }
        
        return maxConsecutive
    }

    // Per-week slot selection handler - OPTIMISTIC UI
    function handleSlotWeekToggle(slotIndex: number, weekIndex: number) {
        const isCurrentlySelected = selectedSlotWeeks.some(
            sw => sw.slotIndex === slotIndex && sw.weekIndex === weekIndex
        )
        const slotWeek = slotsPerWeek.find(
            sw => sw.slotIndex === slotIndex && sw.weekIndex === weekIndex
        )
        
        if (!slotWeek) return
        
        // If not available and not currently held by us, can't select
        if (!slotWeek.available && !slotWeek.heldByCurrentUser && !isCurrentlySelected) {
            return
        }
        
        // Immediately update local state (optimistic)
        let newSelections: { slotIndex: number; weekIndex: number }[]
        
        if (isCurrentlySelected) {
            // Remove from selection
            newSelections = selectedSlotWeeks.filter(
                sw => !(sw.slotIndex === slotIndex && sw.weekIndex === weekIndex)
            )
        } else {
            // Check maxContinuousSlots limit before adding
            const maxSlots = track.maxContinuousSlots
            if (maxSlots && maxSlots > 0) {
                // Simulate adding this slot
                const testSelections = [...selectedSlotWeeks, { slotIndex, weekIndex }]
                const consecutiveCount = getMaxConsecutiveInWeek(testSelections, weekIndex)
                
                if (consecutiveCount > maxSlots) {
                    toast.warning(`Maximum ${maxSlots} consecutive slot${maxSlots > 1 ? 's' : ''} allowed`, {
                        description: 'You cannot book more consecutive time slots in a row.'
                    })
                    return
                }
            }
            
            // Add to selection
            newSelections = [...selectedSlotWeeks, { slotIndex, weekIndex }]
        }
        
        setSelectedSlotWeeks(newSelections)
        
        // Schedule debounced sync to server
        scheduleSyncToServer(newSelections)
    }

    function handleNext() {
        // Validate PRIVATE slot selection before advancing
        if (isPrivate && step === 1 && selectedSlotWeeks.length === 0) {
            return // Must select at least one slot+week
        }
        // Validate custom fields before advancing past that step
        if (customFieldStep !== null && step === customFieldStep) {
            const errors = validateCustomFields(customFields, customFieldValues)
            if (Object.keys(errors).length > 0) {
                setCustomFieldErrors(errors)
                return
            }
            setCustomFieldErrors({})
        }
        setStep(s => s + 1)
    }

    function handleAddToCart() {
        if (!currentOrganizerId || !currentOrganizerName) return
        // For PARTNER, role is required; for others it is not
        if (isPartner && !role) return
        // For PRIVATE, at least one slot+week must be selected
        if (isPrivate && selectedSlotWeeks.length === 0) return

        // Extract unique slots and weeks for backward compatibility
        const uniqueSlots = [...new Set(selectedSlotWeeks.map(sw => sw.slotIndex))].sort((a, b) => a - b)
        const uniqueWeeks = [...new Set(selectedSlotWeeks.map(sw => sw.weekIndex))].sort((a, b) => a - b)

        addCourseItem({
            trackId: track.id,
            trackTitle: track.title,
            periodId,
            organizerId: currentOrganizerId,
            organizerName: currentOrganizerName,
            role: isPartner ? role! : undefined,
            hasPartner: isPartner ? hasPartner : undefined,
            partnerEmail: isPartner && hasPartner && partnerEmail ? partnerEmail : undefined,
            // Keep these for backward compatibility
            selectedSlots: isPrivate ? uniqueSlots : undefined,
            selectedWeeks: isPrivate ? uniqueWeeks : undefined,
            // NEW: Full session matrix - each entry is one session
            selectedSlotWeeks: isPrivate ? selectedSlotWeeks : undefined,
            // Slot time details for all unique slots
            slotDetails: isPrivate && slotTimes.length > 0 
                ? slotTimes.filter(st => uniqueSlots.includes(st.index)).map(st => ({
                    slotIndex: st.index,
                    startTime: st.startTime,
                    endTime: st.endTime
                }))
                : undefined,
            // Week details for all unique weeks
            weekDetails: isPrivate && weeks.length > 0
                ? weeks.filter(w => uniqueWeeks.includes(w.weekIndex)).map(w => ({
                    weekIndex: w.weekIndex,
                    weekStart: w.date.toISOString()
                }))
                : undefined,
            weekday: isPrivate ? track.weekday : undefined,
            priceSnapshot: price
        })

        router.push('/cart')
    }

    function handleClearCartAndAdd() {
        clearCart()
        handleAddToCart()
    }

    // ── Is the Next/Add button disabled? ──────────────────────────────────────
    const isNextDisabled = 
        (isPartner && step === 1 && !role) ||
        (isPrivate && step === 1 && (selectedSlotWeeks.length === 0 || isSyncing || hasUnsavedChanges))

    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Register for {track.title}</CardTitle>
                <CardDescription>Step {step} of {totalSteps}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Warning: Different Organizer */}
                {isDifferentOrganizer && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            <strong>Different Organizer</strong>
                            <p className="mt-1 text-sm">
                                Your cart contains courses from <strong>{cartOrganizerName}</strong>.
                                You can only checkout courses from one organizer at a time.
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="mt-2"
                                onClick={handleClearCartAndAdd}
                            >
                                Clear cart and add this course
                            </Button>
                        </AlertDescription>
                    </Alert>
                )}

                {/* ── PRIVATE: Step 1 — Per-week slot selection ──────────────────── */}
                {isPrivate && step === 1 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock className="h-5 w-5 text-muted-foreground" />
                            <Label className="text-base">Select your sessions:</Label>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {slotPricePerWeek > 0 && (
                                <>{(slotPricePerWeek / 100).toLocaleString('nb-NO')},- per session · </>
                            )}
                            Click cells to select time slots for specific weeks
                            {track.maxContinuousSlots && track.maxContinuousSlots > 0 && (
                                <> · Max {track.maxContinuousSlots} consecutive slot{track.maxContinuousSlots > 1 ? 's' : ''}</>
                            )}
                        </p>
                        
                        {slotError && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{slotError}</AlertDescription>
                            </Alert>
                        )}
                        
                        {slotsLoading && slotTimes.length === 0 ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                <span className="ml-2 text-muted-foreground">Loading available slots...</span>
                            </div>
                        ) : weeks.length > 0 && slotTimes.length > 0 ? (
                            <div className="overflow-x-auto">
                                {/* Table header showing weekday and period range */}
                                <div className="mb-2 px-1">
                                    <h3 className="font-medium text-base capitalize">
                                        {track.weekday !== undefined ? `${formatWeekday(track.weekday)}s` : 'Sessions'}
                                    </h3>
                                    {track.periodStartDate && track.periodEndDate && (
                                        <p className="text-sm text-muted-foreground">
                                            {formatDateShort(new Date(track.periodStartDate))} – {formatDateShort(new Date(track.periodEndDate))}
                                        </p>
                                    )}
                                </div>
                                <table className="w-full border-collapse text-sm">
                                    <thead>
                                        <tr>
                                            <th className="border p-2 bg-muted/50 font-medium text-left min-w-[80px]">Time</th>
                                            {weeks.map(week => (
                                                <th key={week.weekIndex} className="border p-2 bg-muted/50 font-medium text-center min-w-[70px]">
                                                    {week.formattedDate}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {slotTimes.map(slot => (
                                            <tr key={slot.index}>
                                                <td className="border p-2 font-medium bg-muted/30">
                                                    {slot.startTime}–{slot.endTime}
                                                </td>
                                                {weeks.map(week => {
                                                    const slotWeek = slotsPerWeek.find(
                                                        sw => sw.slotIndex === slot.index && sw.weekIndex === week.weekIndex
                                                    )
                                                    const isSelected = selectedSlotWeeks.some(
                                                        sw => sw.slotIndex === slot.index && sw.weekIndex === week.weekIndex
                                                    )
                                                    const isUnavailable = slotWeek && !slotWeek.available && !slotWeek.heldByCurrentUser && !isSelected
                                                    
                                                    return (
                                                        <td 
                                                            key={`${slot.index}-${week.weekIndex}`}
                                                            className={`border p-2 text-center cursor-pointer transition-colors ${
                                                                isSelected ? 'bg-primary/10 border-primary' : ''
                                                            } ${isUnavailable ? 'bg-muted/50 cursor-not-allowed' : 'hover:bg-muted/30'
                                                            }`}
                                                            onClick={() => !isUnavailable && handleSlotWeekToggle(slot.index, week.weekIndex)}
                                                        >
                                                            {isUnavailable ? (
                                                                <Lock className="h-4 w-4 text-muted-foreground mx-auto" />
                                                            ) : isSelected ? (
                                                                <div className="w-5 h-5 bg-primary rounded-full mx-auto flex items-center justify-center">
                                                                    <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />
                                                                </div>
                                                            ) : (
                                                                <div className="w-5 h-5 border-2 border-muted-foreground/30 rounded-full mx-auto" />
                                                            )}
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-center py-4">No slots available</p>
                        )}
                        
                        {selectedSlotWeeks.length > 0 && slotPricePerWeek > 0 && (
                            <div className="mt-4 p-3 bg-muted rounded-md">
                                <div className="flex justify-between text-sm">
                                    <span>Selected: {selectedSlotWeeks.length} session{selectedSlotWeeks.length > 1 ? 's' : ''}</span>
                                    <span className="font-medium">
                                        {((slotPricePerWeek * selectedSlotWeeks.length) / 100).toLocaleString('nb-NO')},-
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {selectedSlotsCount} time slot{selectedSlotsCount > 1 ? 's' : ''} × {selectedWeeksCount} week{selectedWeeksCount > 1 ? 's' : ''}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                    {isSyncing ? (
                                        <>
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            <span>Reserving...</span>
                                        </>
                                    ) : hasUnsavedChanges ? (
                                        <>
                                            <CloudOff className="h-3 w-3" />
                                            <span>Syncing...</span>
                                        </>
                                    ) : (
                                        <span>Sessions reserved for 10 minutes</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── PARTNER: Step 1 — Role selection ──────────────────── */}
                {isPartner && step === 1 && (
                    <div className="space-y-4">
                        <Label className="text-base">I want to participate as a:</Label>
                        <RadioGroup value={role || ''} onValueChange={(v: any) => setRole(v)}>
                            <div className="flex items-center space-x-2 border p-3 rounded-md has-[:checked]:bg-muted/50">
                                <RadioGroupItem value="LEADER" id="r-leader" />
                                <Label htmlFor="r-leader" className="flex-1 cursor-pointer">Leader</Label>
                            </div>
                            <div className="flex items-center space-x-2 border p-3 rounded-md has-[:checked]:bg-muted/50">
                                <RadioGroupItem value="FOLLOWER" id="r-follower" />
                                <Label htmlFor="r-follower" className="flex-1 cursor-pointer">Follower</Label>
                            </div>
                        </RadioGroup>
                    </div>
                )}

                {/* ── PARTNER: Step 2 — Partner ──────────────────────────── */}
                {isPartner && step === 2 && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between space-x-2">
                            <Label htmlFor="partner-mode" className="flex flex-col space-y-1">
                                <span className="text-base font-medium">Register with a partner?</span>
                                <span className="text-xs font-normal text-muted-foreground">You pay together as a couple.</span>
                            </Label>
                            {track.pricePairCents ? (
                                <Switch id="partner-mode" checked={hasPartner} onCheckedChange={setHasPartner} />
                            ) : (
                                <span className="text-sm text-yellow-600">Not available for this track</span>
                            )}
                        </div>

                        {hasPartner && (
                            <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-2">
                                <Label htmlFor="p-email">Partner&apos;s Email</Label>
                                <Input
                                    id="p-email"
                                    type="email"
                                    placeholder="partner@example.com"
                                    value={partnerEmail}
                                    onChange={(e) => setPartnerEmail(e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* ── Custom Fields step (for all templates) ──────────────── */}
                {customFieldStep !== null && step === customFieldStep && (
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">Please fill in the following details:</p>
                        <CustomFieldsForm
                            definitions={customFields}
                            values={customFieldValues}
                            onChange={setCustomFieldValues}
                            errors={customFieldErrors}
                        />
                    </div>
                )}

                {/* ── Summary ──────────────────────────────────────────────── */}
                {step === summaryStep && (
                    <div className="space-y-4">
                        <div className="bg-muted p-4 rounded-md space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Course:</span>
                                <span className="font-medium">{track.title}</span>
                            </div>
                            {isPartner && role && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Role:</span>
                                    <span className="font-medium">{role}</span>
                                </div>
                            )}
                            {isPartner && hasPartner && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Partner:</span>
                                    <span className="font-medium">{partnerEmail}</span>
                                </div>
                            )}
                            {isPrivate && selectedSlots.length > 0 && (
                                <>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Time slots:</span>
                                        <span className="font-medium text-right">
                                            {selectedSlots.map(i => availableSlots[i]?.startTime).join(', ')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Duration:</span>
                                        <span className="font-medium">
                                            {(track.slotDurationMinutes ?? 0) * selectedSlots.length} min
                                        </span>
                                    </div>
                                </>
                            )}
                            {hasCustomFields && Object.keys(customFieldValues).length > 0 && (
                                <div className="border-t pt-2 mt-2 space-y-1">
                                    {customFields
                                        .filter(f => f.type !== 'HEADING' && f.type !== 'PARAGRAPH')
                                        .map(f => {
                                            const val = customFieldValues[f.id]
                                            if (val === undefined || val === null || val === '') return null
                                            return (
                                                <div key={f.id} className="flex justify-between">
                                                    <span className="text-muted-foreground">{f.label}:</span>
                                                    <span className="font-medium text-right ml-2">
                                                        {Array.isArray(val) ? val.join(', ') : String(val)}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                </div>
                            )}
                            <div className="border-t pt-2 mt-2 flex justify-between text-base font-bold">
                                <span>{priceLabel}:</span>
                                <span>{price},-</span>
                            </div>
                        </div>
                    </div>
                )}

            </CardContent>
            <CardFooter className="flex justify-between">
                {step > 1 ? (
                    <Button variant="outline" onClick={() => setStep(s => s - 1)}>Back</Button>
                ) : (
                    <Button variant="ghost" disabled>Back</Button>
                )}

                {step < summaryStep ? (
                    <Button onClick={handleNext} disabled={isNextDisabled}>
                        Next
                    </Button>
                ) : (
                    <Button
                        onClick={handleAddToCart}
                        disabled={(isPartner && !role) || isDifferentOrganizer}
                    >
                        {isDifferentOrganizer ? 'Cannot Add - Different Organizer' : 'Add to Cart'}
                    </Button>
                )}
            </CardFooter>
        </Card>
    )
}

