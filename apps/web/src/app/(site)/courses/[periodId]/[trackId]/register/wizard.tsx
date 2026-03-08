'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { useCart } from '@/hooks/use-cart'
import { useRouter } from 'next/navigation'
import { CustomFieldsForm } from '@/components/custom-fields-form'
import type { CustomFieldDefinition, CustomFieldValues } from '@/types/custom-fields'
import { validateCustomFields } from '@/types/custom-fields'

interface WizardTrack {
    id: string
    title: string
    priceSingleCents: number
    pricePairCents?: number | null
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

    const [step, setStep] = useState(1)
    const [role, setRole] = useState<'LEADER' | 'FOLLOWER' | null>(null)
    const [hasPartner, setHasPartner] = useState(false)
    const [partnerEmail, setPartnerEmail] = useState('')
    const [customFieldValues, setCustomFieldValues] = useState<CustomFieldValues>({})
    const [customFieldErrors, setCustomFieldErrors] = useState<Record<string, string>>({})
    const { addCourseItem, getCartOrganizerId, getCartOrganizerName, clearCart } = useCart()
    const router = useRouter()

    const hasCustomFields = customFields.length > 0

    /*
     * Step layout by template type:
     *
     * PARTNER  : 1=Role  2=Partner  [3=CustomFields]  last=Summary
     * others   : [1=CustomFields]  last=Summary
     *
     * We normalise: for non-PARTNER the first real step is always 1.
     * The PARTNER path injects 2 extra steps at the front.
     */
    const partnerSteps = isPartner ? 2 : 0
    const customFieldStep = hasCustomFields ? partnerSteps + 1 : null
    const summaryStep = (hasCustomFields ? 1 : 0) + partnerSteps + 1
    const totalSteps = summaryStep

    const currentOrganizerId = track.CoursePeriod?.Organizer?.id
    const currentOrganizerName = track.CoursePeriod?.Organizer?.name
    const cartOrganizerId = getCartOrganizerId()
    const cartOrganizerName = getCartOrganizerName()
    const isDifferentOrganizer = !!(cartOrganizerId && cartOrganizerId !== currentOrganizerId)

    const price = isPartner && hasPartner && track.pricePairCents
        ? track.pricePairCents / 100
        : track.priceSingleCents / 100

    const priceLabel = isPartner && hasPartner && track.pricePairCents
        ? 'Total Couple Price'
        : 'Total Price'

    function handleNext() {
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

        addCourseItem({
            trackId: track.id,
            trackTitle: track.title,
            periodId,
            organizerId: currentOrganizerId,
            organizerName: currentOrganizerName,
            role: isPartner ? role! : undefined,
            hasPartner: isPartner ? hasPartner : undefined,
            partnerEmail: isPartner && hasPartner && partnerEmail ? partnerEmail : undefined,
            priceSnapshot: price
        })

        router.push('/cart')
    }

    function handleClearCartAndAdd() {
        clearCart()
        handleAddToCart()
    }

    // ── Is the Next/Add button disabled? ──────────────────────────────────────
    const isNextDisabled = isPartner && step === 1 && !role

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

