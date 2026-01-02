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
import { useState, useTransition } from 'react'
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
    contactEmail: z.string().email().optional().or(z.literal('')),
    city: z.string().optional(),
    country: z.string(),
    timezone: z.string(),
    // Legal/Business Info
    organizationNumber: z.string().regex(/^\d{9}$/, 'Must be 9 digits').optional().or(z.literal('')),
    legalName: z.string().optional(),
    companyType: z.string().optional(),
    vatRegistered: z.boolean().default(false),
    bankAccount: z.string().optional(),
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
    const isEditing = !!organizer

    const form = useForm<OrganizerFormValues>({
        resolver: zodResolver(organizerSchema),
        defaultValues: organizer ? {
            slug: organizer.slug,
            name: organizer.name,
            description: organizer.description || '',
            logoUrl: organizer.logoUrl || '',
            website: organizer.website || '',
            contactEmail: organizer.contactEmail || '',
            city: organizer.city || '',
            country: organizer.country,
            timezone: organizer.timezone,
            organizationNumber: organizer.organizationNumber || '',
            legalName: organizer.legalName || '',
            companyType: organizer.companyType || '',
            vatRegistered: organizer.vatRegistered,
            bankAccount: organizer.bankAccount || '',
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
            companyType: '',
            vatRegistered: false,
            bankAccount: '',
        },
    })

    async function onSubmit(data: OrganizerFormValues) {
        const formData = new FormData()
        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                formData.append(key, typeof value === 'boolean' ? value.toString() : value)
            }
        })

        startTransition(async () => {
            const result = isEditing
                ? await updateOrganizer(organizer!.id, null, formData)
                : await createOrganizer(null, formData)

            if (result?.error) {
                console.error(result.error)
            } else if (!isEditing) {
                // Show success dialog for new organizers
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
                                                    <FormLabel>Organization Number</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="123456789" maxLength={9} {...field} />
                                                    </FormControl>
                                                    <FormDescription>9-digit Norwegian org.nr</FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="companyType"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Company Type</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                                                            <SelectItem value="FLI">FLI (Fylkeskommunalt foretak)</SelectItem>
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
