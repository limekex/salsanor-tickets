'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { coursePeriodSchema, type CoursePeriodFormValues } from '@/lib/schemas/period'
import { Button } from '@/components/ui/button'
import { useState, useTransition } from 'react'
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
import { createStaffCoursePeriod, updateStaffCoursePeriod } from '@/app/actions/staffadmin-periods'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { CoursePeriod, Category, Tag } from '@salsanor/database'

interface StaffPeriodFormProps {
    period?: CoursePeriod & { categories?: Category[]; tags?: Tag[] }
    organizerIds: string[]
    organizers: Array<{ id: string; name: string; slug: string }>
    categories: Category[]
    tags: Tag[]
}

export function StaffPeriodForm({ period, organizerIds, organizers, categories, tags }: StaffPeriodFormProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(period?.categories?.map(c => c.id) ?? [])
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>(period?.tags?.map(t => t.id) ?? [])
    const isEditing = !!period

    // Filter to only show organizers the user manages
    const availableOrganizers = organizers.filter(org => organizerIds.includes(org.id))

    const form = useForm<CoursePeriodFormValues>({
        resolver: zodResolver(coursePeriodSchema),
        defaultValues: period ? {
            organizerId: period.organizerId,
            code: period.code,
            name: period.name,
            city: period.city,
            locationName: period.locationName || '',
            startDate: period.startDate,
            endDate: period.endDate,
            salesOpenAt: period.salesOpenAt,
            salesCloseAt: period.salesCloseAt,
        } : {
            organizerId: availableOrganizers[0]?.id || '',
            code: '',
            name: '',
            city: 'Oslo',
            locationName: '',
        },
    })

    async function onSubmit(data: CoursePeriodFormValues) {
        // Verify organizer access
        if (!organizerIds.includes(data.organizerId)) {
            alert('You do not have access to this organizer')
            return
        }

        const formData = new FormData()
        formData.append('organizerId', data.organizerId)
        formData.append('code', data.code)
        formData.append('name', data.name)
        formData.append('city', data.city)
        if (data.locationName) formData.append('locationName', data.locationName)

        formData.append('startDate', new Date(data.startDate).toISOString())
        formData.append('endDate', new Date(data.endDate).toISOString())
        formData.append('salesOpenAt', new Date(data.salesOpenAt).toISOString())
        formData.append('salesCloseAt', new Date(data.salesCloseAt).toISOString())
        formData.append('categoryIds', JSON.stringify(selectedCategoryIds))
        formData.append('tagIds', JSON.stringify(selectedTagIds))

        startTransition(async () => {
            const result = isEditing
                ? await updateStaffCoursePeriod(period!.id, null, formData)
                : await createStaffCoursePeriod(null, formData)

            if (result?.error) {
                console.error('Form submission error:', result.error)
                // Set field errors from server response
                Object.entries(result.error).forEach(([field, messages]) => {
                    if (field === '_form') {
                        // General form error
                        alert(messages?.join(', ') || 'Form error')
                    } else if (Array.isArray(messages)) {
                        // Field-specific error
                        form.setError(field as any, {
                            type: 'server',
                            message: messages.join(', ')
                        })
                    }
                })
            } else if (result?.success) {
                // Navigate to tracks page for the created/updated period
                router.push(`/staffadmin/periods/${result.periodId}/tracks`)
                router.refresh()
            }
        })
    }

    return (
        <Card>
            <CardContent className="pt-6">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="organizerId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Organizer</FormLabel>
                                    <Select 
                                        onValueChange={field.onChange} 
                                        defaultValue={field.value}
                                        disabled={isEditing}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select organizer" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {availableOrganizers.map((org) => (
                                                <SelectItem key={org.id} value={org.id}>
                                                    {org.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        {isEditing ? 'Organizer cannot be changed after creation' : 'Select the organization this period belongs to'}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Period Code</FormLabel>
                                        <FormControl>
                                            <Input placeholder="TB-2026-P1" {...field} />
                                        </FormControl>
                                        <FormDescription>Unique identifier (e.g. YEAR-ROUND)</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Vår 2026, Runde 1" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="city"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>City</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="locationName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Location Name (Optional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Sentralen" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="startDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Start Date</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''} onChange={(e) => field.onChange(new Date(e.target.value))} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="endDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>End Date</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''} onChange={(e) => field.onChange(new Date(e.target.value))} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="salesOpenAt"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Sales Open</FormLabel>
                                        <FormControl>
                                            <Input type="datetime-local" {...field} value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''} onChange={(e) => field.onChange(new Date(e.target.value))} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="salesCloseAt"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Sales Close</FormLabel>
                                        <FormControl>
                                            <Input type="datetime-local" {...field} value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''} onChange={(e) => field.onChange(new Date(e.target.value))} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="space-y-4">
                            <div>
                                <FormLabel>Categories</FormLabel>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {categories.map(cat => (
                                        <label key={cat.id} className="flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer hover:bg-accent">
                                            <input
                                                type="checkbox"
                                                checked={selectedCategoryIds.includes(cat.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedCategoryIds([...selectedCategoryIds, cat.id])
                                                    } else {
                                                        setSelectedCategoryIds(selectedCategoryIds.filter(id => id !== cat.id))
                                                    }
                                                }}
                                            />
                                            <span>{cat.icon} {cat.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <FormLabel>Tags</FormLabel>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {tags.map(tag => (
                                        <label key={tag.id} className="flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer hover:bg-accent">
                                            <input
                                                type="checkbox"
                                                checked={selectedTagIds.includes(tag.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedTagIds([...selectedTagIds, tag.id])
                                                    } else {
                                                        setSelectedTagIds(selectedTagIds.filter(id => id !== tag.id))
                                                    }
                                                }}
                                            />
                                            <span 
                                                className="inline-block w-4 h-4 rounded" 
                                                style={{ backgroundColor: tag.color || undefined }}
                                            />
                                            <span>{tag.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-4">
                            <Button type="button" variant="outline" onClick={() => router.push('/staffadmin/periods')}>Cancel</Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Period' : 'Create Period')}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}
