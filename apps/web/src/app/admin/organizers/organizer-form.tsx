'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createOrganizer, updateOrganizer } from '@/app/actions/organizers'
import { useRouter } from 'next/navigation'
import { useState, useTransition, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { Organizer } from '@salsanor/database'

const organizerSchema = z.object({
    slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
    name: z.string().min(1),
    description: z.string().optional(),
    logoUrl: z.string().url().optional().or(z.literal('')),
    website: z.string().url().optional().or(z.literal('')),
    contactEmail: z.union([z.literal(''), z.string().email()]).optional(),
    city: z.string().optional(),
    country: z.string(),
    timezone: z.string(),
    // Legal/Business Info
    organizationNumber: z.string().regex(/^\d{9}$/, 'Must be 9 digits'),
    legalName: z.string().min(1, 'Legal name is required'),
    legalAddress: z.string().min(1, 'Legal address is required'),
    legalEmail: z.string().email('Valid email is required'),
    companyType: z.string().min(1, 'Company type is required'),
    vatRegistered: z.boolean(),
    mvaRate: z.number().min(0).max(100),
    bankAccount: z.string().min(1, 'Bank account is required'),
    orderPrefix: z.string().min(3, 'Must be 3-5 characters').max(5, 'Must be 3-5 characters').regex(/^[A-Z0-9]+$/, 'Must be uppercase letters and numbers only'),
})

type OrganizerFormValues = z.infer<typeof organizerSchema>

interface OrganizerFormProps {
    organizer?: Omit<Organizer, 'mvaRate' | 'stripeFeePercentage' | 'fiscalYearStart'> & {
        mvaRate: number
        stripeFeePercentage: number
        fiscalYearStart: string | null
    }
}

export function OrganizerForm({ organizer }: OrganizerFormProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [showSuccessDialog, setShowSuccessDialog] = useState(false)
    const [prefixValidation, setPrefixValidation] = useState<{ checking: boolean; message: string | null }>({
        checking: false,
        message: null
    })
    const [brregLoading, setBrregLoading] = useState(false)
    const [brregError, setBrregError] = useState<string | null>(null)
    const isEditing = !!organizer

    const form = useForm<OrganizerFormValues>({
        resolver: zodResolver(organizerSchema),
        defaultValues: organizer ? {
            slug: organizer.slug ?? '',
            name: organizer.name ?? '',
            description: organizer.description ?? '',
            logoUrl: organizer.logoUrl ?? '',
            website: organizer.website ?? '',
            contactEmail: organizer.contactEmail ?? '',
            city: organizer.city ?? '',
            country: organizer.country ?? 'Norway',
            timezone: organizer.timezone ?? 'Europe/Oslo',
            organizationNumber: organizer.organizationNumber ?? '',
            legalName: organizer.legalName ?? '',
            legalAddress: organizer.legalAddress ?? '',
            legalEmail: organizer.legalEmail ?? '',
            companyType: organizer.companyType ?? '',
            vatRegistered: organizer.vatRegistered ?? false,
            mvaRate: organizer.mvaRate ?? 25,
            bankAccount: organizer.bankAccount ?? '',
            orderPrefix: organizer.orderPrefix ?? 'ORD',
        } : {
            slug: '',
            name: '',
            description: '',
            logoUrl: '',
            website: '',
            contactEmail: '',
            city: '',
            country: 'Norway',
            timezone: 'Europe/Oslo',
            organizationNumber: '',
            legalName: '',
            legalAddress: '',
            legalEmail: '',
            companyType: '',
            vatRegistered: false,
            mvaRate: 25,
            bankAccount: '',
            orderPrefix: 'ORD',
        },
    })

    // Debounced prefix check
    const checkPrefixAvailability = useCallback(
        async (prefix: string) => {
            if (!prefix || prefix.length < 3) {
                setPrefixValidation({ checking: false, message: null })
                return
            }

            setPrefixValidation({ checking: true, message: null })

            try {
                const params = new URLSearchParams({
                    prefix: prefix,
                    ...(organizer?.id ? { excludeId: organizer.id } : {})
                })
                const response = await fetch(`/api/organizers/check-prefix?${params}`)
                const data = await response.json()

                if (!data.available) {
                    setPrefixValidation({ checking: false, message: data.message })
                } else {
                    setPrefixValidation({ checking: false, message: null })
                }
            } catch (error) {
                console.error('Error checking prefix:', error)
                setPrefixValidation({ checking: false, message: null })
            }
        },
        [organizer?.id]
    )

    // Debounce the prefix check
    useEffect(() => {
        const prefix = form.watch('orderPrefix')
        const timeoutId = setTimeout(() => {
            if (prefix) {
                checkPrefixAvailability(prefix)
            }
        }, 500)

        return () => clearTimeout(timeoutId)
    }, [form.watch('orderPrefix'), checkPrefixAvailability, form])

    // Lookup organization from Brreg
    const lookupOrganization = async () => {
        const orgnr = form.getValues('organizationNumber')
        if (!orgnr || orgnr.length !== 9) {
            setBrregError('Please enter a valid 9-digit organization number')
            return
        }

        setBrregLoading(true)
        setBrregError(null)

        try {
            const response = await fetch(`/api/brreg/lookup?orgnr=${orgnr}`)
            const data = await response.json()

            if (!response.ok) {
                setBrregError(data.error || 'Failed to fetch organization data')
                return
            }

            // Auto-fill fields
            form.setValue('legalName', data.legalName)
            form.setValue('legalAddress', data.legalAddress)
            form.setValue('companyType', data.companyType)
            if (data.legalEmail) {
                form.setValue('legalEmail', data.legalEmail)
            }
            if (data.city) {
                form.setValue('city', data.city)
            }
            form.setValue('vatRegistered', data.vatRegistered)

            setBrregError(null)
        } catch (error) {
            console.error('Error fetching from Brreg:', error)
            setBrregError('Failed to fetch organization data')
        } finally {
            setBrregLoading(false)
        }
    }

    async function onSubmit(data: OrganizerFormValues) {
        const formData = new FormData()
        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                // Convert all values to string for FormData
                if (typeof value === 'boolean') {
                    formData.append(key, value.toString())
                } else if (typeof value === 'number') {
                    formData.append(key, value.toString())
                } else {
                    formData.append(key, value)
                }
            }
        })

        startTransition(async () => {
            const result = isEditing
                ? await updateOrganizer(organizer!.id, null, formData)
                : await createOrganizer(null, formData)

            // Check for success first
            if (result?.success) {
                if (isEditing) {
                    // For updates, navigate back to list
                    window.location.href = '/admin/organizers'
                }
                return
            }
            
            // Handle errors
            if (result?.error && Object.keys(result.error).length > 0) {
                // Show user-friendly error message
                let errorMessage = 'An error occurred while saving the organizer'
                
                if (result.error._form && Array.isArray(result.error._form) && result.error._form.length > 0) {
                    errorMessage = result.error._form[0]
                } else {
                    // Try to find any field error
                    const allErrors = Object.values(result.error).flat().filter(Boolean)
                    if (allErrors.length > 0) {
                        errorMessage = allErrors[0] as string
                    }
                }
                
                // You could add a toast here if you have a toast component
                alert(errorMessage)
            } else if (!isEditing) {
                // Show success dialog for new organizers (when result is undefined = success)
                setShowSuccessDialog(true)
            }
        })
    }

    const handleCreateAnother = () => {
        setShowSuccessDialog(false)
        form.reset()
    }

    const handleFinished = () => {
        router.push('/admin/organizers')
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                    <CardDescription>General details about the organizer</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Name *</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="SalsaNor Oslo" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="slug"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Slug *</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="salsanor-oslo" {...field} />
                                                </FormControl>
                                                <FormDescription>URL-friendly identifier (lowercase, hyphens)</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Description</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="Brief description of the organizer" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="city"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>City</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Oslo" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="country"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Country *</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Norway" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="contactEmail"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Contact Email</FormLabel>
                                                <FormControl>
                                                    <Input type="email" placeholder="info@example.com" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="website"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Website</FormLabel>
                                                <FormControl>
                                                    <Input type="url" placeholder="https://example.com" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="logoUrl"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Logo URL</FormLabel>
                                                <FormControl>
                                                    <Input type="url" placeholder="https://example.com/logo.png" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="timezone"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Timezone *</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Europe/Oslo" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <Separator />

                            <div>
                                <h3 className="text-lg font-semibold mb-4">Legal & Business Information</h3>
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField
                                            control={form.control}
                                            name="organizationNumber"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Organization Number *</FormLabel>
                                                    <div className="flex gap-2">
                                                        <FormControl>
                                                            <Input placeholder="123456789" maxLength={9} {...field} />
                                                        </FormControl>
                                                        <Button 
                                                            type="button" 
                                                            variant="outline"
                                                            onClick={lookupOrganization}
                                                            disabled={brregLoading || !form.watch('organizationNumber') || form.watch('organizationNumber').length !== 9}
                                                        >
                                                            {brregLoading ? 'Søker...' : 'Søk opp'}
                                                        </Button>
                                                    </div>
                                                    <FormDescription>
                                                        9-digit Norwegian org.nr - Click button to auto-fill from Brønnøysundregisteret
                                                    </FormDescription>
                                                    {brregError && (
                                                        <p className="text-sm text-destructive">{brregError}</p>
                                                    )}
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="companyType"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Company Type *</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select type" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="AS">AS (Aksjeselskap)</SelectItem>
                                                            <SelectItem value="ASA">ASA (Allmennaksjeselskap)</SelectItem>
                                                            <SelectItem value="ENK">ENK (Enkeltpersonforetak)</SelectItem>
                                                            <SelectItem value="DA">DA (Ansvarlig selskap)</SelectItem>
                                                            <SelectItem value="NUF">NUF (Norskregistrert utenlandsk foretak)</SelectItem>
                                                            <SelectItem value="BA">BA (Samvirkeforetak)</SelectItem>
                                                            <SelectItem value="FLI">FLI (Forening/lag/innretning)</SelectItem>
                                                            <SelectItem value="IKJP">IKJP (Interkommunalt selskap)</SelectItem>
                                                            <SelectItem value="KF">KF (Kommunalt foretak)</SelectItem>
                                                            <SelectItem value="STI">STI (Stiftelse)</SelectItem>
                                                            <SelectItem value="SA">SA (Selskap med delt ansvar)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField
                                            control={form.control}
                                            name="legalName"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Legal Name</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="SalsaNor Oslo AS" {...field} />
                                                    </FormControl>
                                                    <FormDescription>Official registered company name</FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="legalEmail"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Legal Email</FormLabel>
                                                    <FormControl>
                                                        <Input type="email" placeholder="legal@salsanor.no" {...field} />
                                                    </FormControl>
                                                    <FormDescription>Email for legal correspondence and invoices</FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="legalAddress"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Legal Address</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Street name 123, 0123 Oslo, Norway" {...field} />
                                                </FormControl>
                                                <FormDescription>Full legal/registered business address</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField
                                            control={form.control}
                                            name="bankAccount"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Bank Account</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="1234.56.78901" {...field} />
                                                    </FormControl>
                                                    <FormDescription>Norwegian bank account number</FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        
                                        <FormField
                                            control={form.control}
                                            name="orderPrefix"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Order Number Prefix</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="ORD" maxLength={5} {...field} />
                                                    </FormControl>
                                                    {prefixValidation.checking ? (
                                                        <FormDescription className="text-muted-foreground">Checking availability...</FormDescription>
                                                    ) : prefixValidation.message ? (
                                                        <FormDescription className="text-destructive">{prefixValidation.message}</FormDescription>
                                                    ) : (
                                                        <FormDescription>Prefix for order numbers (3-5 characters, uppercase)</FormDescription>
                                                    )}
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="vatRegistered"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <div className="space-y-1 leading-none">
                                                    <FormLabel>
                                                        VAT Registered (MVA-registrert)
                                                    </FormLabel>
                                                    <FormDescription>
                                                        Check if organization is registered for VAT/MVA
                                                    </FormDescription>
                                                </div>
                                            </FormItem>
                                        )}
                                    />

                                    {form.watch('vatRegistered') && (
                                        <FormField
                                            control={form.control}
                                            name="mvaRate"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>MVA Rate (%)</FormLabel>
                                                    <Select 
                                                        onValueChange={(value) => field.onChange(Number(value))} 
                                                        defaultValue={field.value?.toString()}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="0">0% (No VAT)</SelectItem>
                                                            <SelectItem value="12">12% (Reduced rate - food, transport)</SelectItem>
                                                            <SelectItem value="15">15% (Reduced rate - food services)</SelectItem>
                                                            <SelectItem value="25">25% (Standard rate)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormDescription>
                                                        Norwegian VAT rate for your products/services
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-4">
                                <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                                <Button type="submit" disabled={isPending}>
                                    {isPending ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Organizer' : 'Create Organizer')}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>✅ Organizer Created Successfully!</AlertDialogTitle>
                        <AlertDialogDescription>
                            The organizer has been created. What would you like to do next?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleCreateAnother}>Create Another</AlertDialogCancel>
                        <AlertDialogAction onClick={handleFinished}>Finished</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
