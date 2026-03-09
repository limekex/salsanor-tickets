'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Clock } from 'lucide-react'
import { useCart } from '@/hooks/use-cart'
import { useRouter } from 'next/navigation'
import { CustomFieldsForm } from '@/components/custom-fields-form'
import type { CustomFieldDefinition, CustomFieldValues } from '@/types/custom-fields'
import { validateCustomFields } from '@/types/custom-fields'
import { Checkbox } from '@/components/ui/checkbox'

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

// Helper to calculate slot times
function calculateSlots(startTime: string, slotCount: number, durationMinutes: number, breakMinutes: number) {
    const slots: { index: number; startTime: string; endTime: string }[] = []
    const [startHours, startMins] = startTime.split(':').map(Number)
    let currentMinutes = startHours * 60 + startMins

    for (let i = 0; i < slotCount; i++) {
        const startH = Math.floor(currentMinutes / 60) % 24
        const startM = currentMinutes % 60
        const endMinutes = currentMinutes + durationMinutes
        const endH = Math.floor(endMinutes / 60) % 24
        const endM = endMinutes % 60

        slots.push({
            index: i,
            startTime: `${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`,
            endTime: `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`
        })

        currentMinutes = endMinutes + breakMinutes
    }

    return slots
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

    // Calculate available slots for PRIVATE template
    const availableSlots = useMemo(() => {
        if (!isPrivate || !track.slotStartTime || !track.slotCount || !track.slotDurationMinutes) {
            return []
        }
        return calculateSlots(
            track.slotStartTime,
            track.slotCount,
            track.slotDurationMinutes,
            track.slotBreakMinutes ?? 0
        )
    }, [isPrivate, track.slotStartTime, track.slotCount, track.slotDurationMinutes, track.slotBreakMinutes])

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

    // Slot selection handler with continuous validation
    function handleSlotToggle(slotIndex: number) {
        setSelectedSlots(prev => {
            if (prev.includes(slotIndex)) {
                // Removing a slot
                return prev.filter(i => i !== slotIndex)
            }
            // Adding a slot - check constraints
            const newSelection = [...prev, slotIndex].sort((a, b) => a - b)
            
            // Check max slots
            if (newSelection.length > maxContinuous) {
                return prev // Don't allow more than max
            }
            
            // Check continuity (slots must be adjacent)
            if (newSelection.length > 1) {
                for (let i = 1; i < newSelection.length; i++) {
                    if (newSelection[i] - newSelection[i - 1] !== 1) {
                        return prev // Slots must be consecutive
                    }
                }
            }
            
            return newSelection
        })
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
                        <div className="space-y-2">
                            {availableSlots.map((slot) => {
                                const isSelected = selectedSlots.includes(slot.index)
                                // Determine if this slot can be selected (must be adjacent to existing selection)
                                const canSelect = selectedSlots.length === 0 ||
                                    selectedSlots.includes(slot.index - 1) ||
                                    selectedSlots.includes(slot.index + 1) ||
                                    isSelected
                                const wouldExceedMax = !isSelected && selectedSlots.length >= maxContinuous
                                const isDisabled = (!canSelect || wouldExceedMax) && !isSelected

                                return (
                                    <div
                                        key={slot.index}
                                        className={`flex items-center space-x-3 border p-3 rounded-md transition-colors ${
                                            isSelected ? 'bg-primary/10 border-primary' : ''
                                        } ${isDisabled ? 'opacity-50' : 'cursor-pointer hover:bg-muted/50'}`}
                                        onClick={() => !isDisabled && handleSlotToggle(slot.index)}
                                    >
                                        <Checkbox
                                            id={`slot-${slot.index}`}
                                            checked={isSelected}
                                            disabled={isDisabled}
                                            onClick={(e) => e.stopPropagation()}
                                            onCheckedChange={() => handleSlotToggle(slot.index)}
                                        />
                                        <Label
                                            htmlFor={`slot-${slot.index}`}
                                            className={`flex-1 ${isDisabled ? '' : 'cursor-pointer'}`}
                                        >
                                            <span className="font-medium">{slot.startTime} – {slot.endTime}</span>
                                            <span className="text-muted-foreground ml-2">
                                                ({track.slotDurationMinutes} min)
                                            </span>
                                        </Label>
                                    </div>
                                )
                            })}
                        </div>
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

