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
import { createOrganizer, updateOrganizer } from '@/app/actions/organizers'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
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
})

type OrganizerFormValues = z.infer<typeof organizerSchema>

interface OrganizerFormProps {
    organizer?: Organizer
}

export function OrganizerForm({ organizer }: OrganizerFormProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
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
        },
    })

    async function onSubmit(data: OrganizerFormValues) {
        const formData = new FormData()
        Object.entries(data).forEach(([key, value]) => {
            if (value) formData.append(key, value)
        })

        startTransition(async () => {
            const result = isEditing
                ? await updateOrganizer(organizer!.id, null, formData)
                : await createOrganizer(null, formData)

            if (result?.error) {
                console.error(result.error)
            }
        })
    }

    return (
        <Card>
            <CardContent className="pt-6">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Name</FormLabel>
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
                                        <FormLabel>Slug</FormLabel>
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
                                        <FormLabel>Country</FormLabel>
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
                                        <FormLabel>Timezone</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Europe/Oslo" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
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
    )
}
