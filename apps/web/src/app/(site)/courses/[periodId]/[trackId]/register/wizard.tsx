'use client'

import { useState, useTransition } from 'react'
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

interface WizardProps {
    track: any // Type this properly if shared types available
    periodId: string
    customFields?: CustomFieldDefinition[]
}

export function RegistrationWizard({ track, periodId, customFields = [] }: WizardProps) {
    const [step, setStep] = useState(1)
    const [role, setRole] = useState<'LEADER' | 'FOLLOWER' | null>(null)
    const [hasPartner, setHasPartner] = useState(false)
    const [partnerEmail, setPartnerEmail] = useState('')
    const [customFieldValues, setCustomFieldValues] = useState<CustomFieldValues>({})
    const [customFieldErrors, setCustomFieldErrors] = useState<Record<string, string>>({})
    const { addCourseItem, getCartOrganizerId, getCartOrganizerName, clearCart } = useCart()
    const router = useRouter()

    const hasCustomFields = customFields.length > 0
    const totalSteps = hasCustomFields ? 4 : 3

    const currentOrganizerId = track.CoursePeriod?.Organizer?.id
    const currentOrganizerName = track.CoursePeriod?.Organizer?.name
    const cartOrganizerId = getCartOrganizerId()
    const cartOrganizerName = getCartOrganizerName()
    const isDifferentOrganizer = !!(cartOrganizerId && cartOrganizerId !== currentOrganizerId)

    const price = hasPartner && track.pricePairCents
        ? track.pricePairCents / 100
        : track.priceSingleCents / 100

    const priceLabel = hasPartner && track.pricePairCents
        ? 'Total Couple Price'
        : 'Total Price'

    // Step mapping: 1=Role, 2=Partner, 3=CustomFields (if any), summary=last step
    const summaryStep = totalSteps

    function handleAddToCart() {
        if (!role || !currentOrganizerId || !currentOrganizerName) return

        addCourseItem({
            trackId: track.id,
            trackTitle: track.title,
            periodId,
            organizerId: currentOrganizerId,
            organizerName: currentOrganizerName,
            role,
            hasPartner,
            partnerEmail: (hasPartner && partnerEmail) ? partnerEmail : undefined,
            priceSnapshot: price
        })

        router.push('/cart')
    }

    function handleClearCartAndAdd() {
        clearCart()
        handleAddToCart()
    }

    function handleNext() {
        // Validate custom fields before moving past that step
        if (hasCustomFields && step === 3) {
            const errors = validateCustomFields(customFields, customFieldValues)
            if (Object.keys(errors).length > 0) {
                setCustomFieldErrors(errors)
                return
            }
            setCustomFieldErrors({})
        }
        setStep(s => s + 1)
    }

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

                {/* Step 1: Role */}
                {step === 1 && (
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

                {/* Step 2: Partner */}
                {step === 2 && (
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
                                <Label htmlFor="p-email">Partner's Email</Label>
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

                {/* Step 3: Custom Fields (only if custom fields exist) */}
                {step === 3 && hasCustomFields && (
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

                {/* Summary step */}
                {step === summaryStep && (
                    <div className="space-y-4">
                        <div className="bg-muted p-4 rounded-md space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Course:</span>
                                <span className="font-medium">{track.title}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Role:</span>
                                <span className="font-medium">{role}</span>
                            </div>
                            {hasPartner && (
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
                    <Button
                        onClick={handleNext}
                        disabled={step === 1 && !role}
                    >
                        Next
                    </Button>
                ) : (
                    <Button 
                        onClick={handleAddToCart} 
                        disabled={!role || isDifferentOrganizer}
                    >
                        {isDifferentOrganizer ? 'Cannot Add - Different Organizer' : 'Add to Cart'}
                    </Button>
                )}
            </CardFooter>
        </Card >
    )
}

