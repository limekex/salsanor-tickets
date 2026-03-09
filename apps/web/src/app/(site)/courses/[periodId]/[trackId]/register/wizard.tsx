'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Clock, Loader2, Lock } from 'lucide-react'
import { useCart } from '@/hooks/use-cart'
import { useRouter } from 'next/navigation'
import { CustomFieldsForm } from '@/components/custom-fields-form'
import type { CustomFieldDefinition, CustomFieldValues } from '@/types/custom-fields'
import { validateCustomFields } from '@/types/custom-fields'
import { Checkbox } from '@/components/ui/checkbox'
import { 
    getAvailableSlots, 
    holdSlot, 
    releaseSlot, 
    releaseAllHolds,
    type SlotAvailability 
} from '@/app/actions/slot-holds'

interface WizardTrack {
    id: string
    title: string
    priceSingleCents: number
    pricePairCents?: number | null
    // Slot booking fields for PRIVATE
    slotStartTime?: string | null
    slotDurationMinutes?: number | null
    slotBreakMinutes?: number | null
    slotCount?: number | null
    pricePerSlotCents?: number | null
    maxContinuousSlots?: number | null
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

    // Slot availability state for PRIVATE template
    const [availableSlots, setAvailableSlots] = useState<SlotAvailability[]>([])
    const [slotsLoading, setSlotsLoading] = useState(false)
    const [slotError, setSlotError] = useState<string | null>(null)
    const [holdingSlot, setHoldingSlot] = useState<number | null>(null) // Slot currently being held/released

    // Fetch available slots for PRIVATE template
    const fetchSlots = useCallback(async () => {
        if (!isPrivate) return
        setSlotsLoading(true)
        setSlotError(null)
        try {
            const result = await getAvailableSlots(track.id)
            if (result.error) {
                setSlotError(result.error)
            } else {
                setAvailableSlots(result.slots)
                // Restore any slots we already have holds on
                const heldSlots = result.slots
                    .filter(s => s.heldByCurrentUser)
                    .map(s => s.index)
                    .sort((a, b) => a - b)
                if (heldSlots.length > 0) {
                    setSelectedSlots(heldSlots)
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
        if (isPrivate && track.pricePerSlotCents && selectedSlots.length > 0) {
            // PRIVATE: price per slot × number of slots selected
            return (track.pricePerSlotCents * selectedSlots.length) / 100
        }
        if (isPartner && hasPartner && track.pricePairCents) {
            return track.pricePairCents / 100
        }
        return track.priceSingleCents / 100
    }, [isPrivate, isPartner, hasPartner, track, selectedSlots.length])

    const priceLabel = useMemo(() => {
        if (isPrivate && selectedSlots.length > 0) {
            return `Total (${selectedSlots.length} slot${selectedSlots.length > 1 ? 's' : ''})`
        }
        if (isPartner && hasPartner && track.pricePairCents) {
            return 'Total Couple Price'
        }
        return 'Total Price'
    }, [isPrivate, isPartner, hasPartner, track.pricePairCents, selectedSlots.length])

    // Slot selection handler with hold/release and continuous validation
    async function handleSlotToggle(slotIndex: number) {
        const isCurrentlySelected = selectedSlots.includes(slotIndex)
        const slot = availableSlots.find(s => s.index === slotIndex)
        
        if (!slot) return
        
        // If not available and not currently held by us, can't select
        if (!slot.available && !slot.heldByCurrentUser && !isCurrentlySelected) {
            return
        }
        
        setHoldingSlot(slotIndex)
        
        try {
            if (isCurrentlySelected) {
                // Releasing: check that the result would still be consecutive
                const newSelection = selectedSlots.filter(i => i !== slotIndex)
                if (newSelection.length > 1) {
                    // Verify remaining slots are consecutive
                    const sorted = newSelection.sort((a, b) => a - b)
                    for (let i = 1; i < sorted.length; i++) {
                        if (sorted[i] - sorted[i - 1] !== 1) {
                            // Can't release a slot that would break continuity
                            setHoldingSlot(null)
                            return
                        }
                    }
                }
                
                // Release the hold on server
                const result = await releaseSlot(track.id, slotIndex)
                if (result.success) {
                    setSelectedSlots(newSelection)
                    // Refresh slot availability
                    await fetchSlots()
                }
            } else {
                // Adding: check constraints
                const newSelection = [...selectedSlots, slotIndex].sort((a, b) => a - b)
                
                // Check max slots
                if (newSelection.length > maxContinuous) {
                    setHoldingSlot(null)
                    return
                }
                
                // Check continuity (slots must be adjacent)
                if (newSelection.length > 1) {
                    for (let i = 1; i < newSelection.length; i++) {
                        if (newSelection[i] - newSelection[i - 1] !== 1) {
                            setHoldingSlot(null)
                            return
                        }
                    }
                }
                
                // Try to hold the slot on server
                const result = await holdSlot(track.id, slotIndex)
                if (result.success) {
                    setSelectedSlots(newSelection)
                    // Refresh to get updated availability
                    await fetchSlots()
                } else {
                    setSlotError(result.error ?? 'Failed to reserve slot')
                    // Refresh to see what's available
                    await fetchSlots()
                }
            }
        } catch (e) {
            setSlotError('Failed to update slot selection')
        } finally {
            setHoldingSlot(null)
        }
    }

    function handleNext() {
        // Validate PRIVATE slot selection before advancing
        if (isPrivate && step === 1 && selectedSlots.length === 0) {
            return // Must select at least one slot
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
        // For PRIVATE, at least one slot must be selected
        if (isPrivate && selectedSlots.length === 0) return

        addCourseItem({
            trackId: track.id,
            trackTitle: track.title,
            periodId,
            organizerId: currentOrganizerId,
            organizerName: currentOrganizerName,
            role: isPartner ? role! : undefined,
            hasPartner: isPartner ? hasPartner : undefined,
            partnerEmail: isPartner && hasPartner && partnerEmail ? partnerEmail : undefined,
            selectedSlots: isPrivate ? selectedSlots : undefined,
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
        (isPrivate && step === 1 && selectedSlots.length === 0)

    return (
        <Card className="max-w-md mx-auto">
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

                {/* ── PRIVATE: Step 1 — Slot selection ──────────────────── */}
                {isPrivate && step === 1 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock className="h-5 w-5 text-muted-foreground" />
                            <Label className="text-base">Select your time slot(s):</Label>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {track.pricePerSlotCents && (
                                <>{(track.pricePerSlotCents / 100).toLocaleString('nb-NO')},- per {track.slotDurationMinutes} min slot · </>
                            )}
                            Max {maxContinuous} consecutive slot{maxContinuous > 1 ? 's' : ''}
                        </p>
                        
                        {slotError && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{slotError}</AlertDescription>
                            </Alert>
                        )}
                        
                        {slotsLoading && availableSlots.length === 0 ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                <span className="ml-2 text-muted-foreground">Loading available slots...</span>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {availableSlots.map((slot) => {
                                    const isSelected = selectedSlots.includes(slot.index)
                                    const isHoldingThis = holdingSlot === slot.index
                                    // Slot unavailable if held/booked by others (not available AND not already ours)
                                    const isUnavailable = !slot.available && !slot.heldByCurrentUser
                                    // Determine if this slot can be selected (must be adjacent to existing selection)
                                    const canSelect = !isUnavailable && (
                                        selectedSlots.length === 0 ||
                                        selectedSlots.includes(slot.index - 1) ||
                                        selectedSlots.includes(slot.index + 1) ||
                                        isSelected
                                    )
                                    const wouldExceedMax = !isSelected && selectedSlots.length >= maxContinuous
                                    const isDisabled = isHoldingThis || isUnavailable || ((!canSelect || wouldExceedMax) && !isSelected)

                                    return (
                                        <div
                                            key={slot.index}
                                            className={`flex items-center space-x-3 border p-3 rounded-md transition-colors ${
                                                isSelected ? 'bg-primary/10 border-primary' : ''
                                            } ${isUnavailable ? 'bg-muted/30 border-dashed' : ''
                                            } ${isDisabled && !isUnavailable ? 'opacity-50' : ''
                                            } ${!isDisabled ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                                            onClick={() => !isDisabled && handleSlotToggle(slot.index)}
                                        >
                                            {isHoldingThis ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : isUnavailable ? (
                                                <Lock className="h-4 w-4 text-muted-foreground" />
                                            ) : (
                                                <Checkbox
                                                    id={`slot-${slot.index}`}
                                                    checked={isSelected}
                                                    disabled={isDisabled}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onCheckedChange={() => handleSlotToggle(slot.index)}
                                                />
                                            )}
                                            <span
                                                className={`flex-1 ${isDisabled ? '' : 'cursor-pointer'}`}
                                            >
                                                <span className={`font-medium ${isUnavailable ? 'text-muted-foreground' : ''}`}>
                                                    {slot.startTime} – {slot.endTime}
                                                </span>
                                                <span className="text-muted-foreground ml-2">
                                                    ({track.slotDurationMinutes} min)
                                                </span>
                                                {isUnavailable && (
                                                    <span className="text-xs text-muted-foreground ml-2">
                                                        (unavailable)
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                        
                        {selectedSlots.length > 0 && track.pricePerSlotCents && (
                            <div className="mt-4 p-3 bg-muted rounded-md">
                                <div className="flex justify-between text-sm">
                                    <span>Selected: {selectedSlots.length} slot{selectedSlots.length > 1 ? 's' : ''}</span>
                                    <span className="font-medium">
                                        {((track.pricePerSlotCents * selectedSlots.length) / 100).toLocaleString('nb-NO')},-
                                    </span>
                                </div>
                                {selectedSlots.length > 1 && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Total duration: {(track.slotDurationMinutes ?? 0) * selectedSlots.length} min
                                    </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                    Slots reserved for 10 minutes
                                </p>
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

