'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { coursePeriodSchema, type CoursePeriodFormValues } from '@/lib/schemas/period'
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
import { createCoursePeriod, updateCoursePeriod } from '@/app/actions/periods'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { CoursePeriod } from '@salsanor/database'
import { getPublicOrganizers } from '@/app/actions/organizers'
import { useEffect, useState } from 'react'

interface PeriodFormProps {
    period?: CoursePeriod
}

export function PeriodForm({ period }: PeriodFormProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [organizers, setOrganizers] = useState<Awaited<ReturnType<typeof getPublicOrganizers>>>([])
    const isEditing = !!period

    useEffect(() => {
        getPublicOrganizers().then(setOrganizers)
    }, [])

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
            organizerId: '',
            code: '',
            name: '',
            city: 'Oslo',
            locationName: '',
        },
    })

    async function onSubmit(data: CoursePeriodFormValues) {
        const formData = new FormData()
        formData.append('code', data.code)
        formData.append('name', data.name)
        formData.append('city', data.city)
        if (data.locationName) formData.append('locationName', data.locationName)

        // Convert dates to string for serialization in Server Action
        formData.append('startDate', new Date(data.startDate).toISOString())
        formData.append('endDate', new Date(data.endDate).toISOString())
        formData.append('salesOpenAt', new Date(data.salesOpenAt).toISOString())
        formData.append('salesCloseAt', new Date(data.salesCloseAt).toISOString())

        startTransition(async () => {
            const result = isEditing
                ? await updateCoursePeriod(period!.id, null, formData)
                : await createCoursePeriod(null, formData)

            if (result?.error) {
                // Handle server errors
                console.error(result.error)
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
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select organizer" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {organizers.map((org) => (
                                                <SelectItem key={org.id} value={org.id}>
                                                    {org.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
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

                        <div className="flex justify-end gap-4">
                            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
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
