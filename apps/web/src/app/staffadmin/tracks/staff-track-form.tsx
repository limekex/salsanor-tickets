'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { courseTrackSchema, type CourseTrackFormValues } from '@/lib/schemas/track'
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { createCourseTrackStaff, updateCourseTrackStaff } from '@/app/actions/staffadmin-tracks'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import type { CourseTrack } from '@salsanor/database'

interface StaffTrackFormProps {
    periodId: string
    track?: CourseTrack
}

export function StaffTrackForm({ periodId, track }: StaffTrackFormProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const isEditing = !!track

    const form = useForm<CourseTrackFormValues>({
        resolver: zodResolver(courseTrackSchema),
        defaultValues: track ? {
            periodId: track.periodId,
            title: track.title,
            levelLabel: track.levelLabel || '',
            weekday: track.weekday,
            timeStart: track.timeStart,
            timeEnd: track.timeEnd,
            capacityTotal: track.capacityTotal,
            capacityLeaders: track.capacityLeaders || undefined,
            capacityFollowers: track.capacityFollowers || undefined,
            rolePolicy: track.rolePolicy,
            waitlistEnabled: track.waitlistEnabled,
            priceSingleCents: track.priceSingleCents,
            pricePairCents: track.pricePairCents || undefined,
        } : {
            periodId,
            title: '',
            levelLabel: '',
            weekday: 1,
            timeStart: '18:00',
            timeEnd: '19:00',
            capacityTotal: 20,
            capacityLeaders: 10,
            capacityFollowers: 10,
            rolePolicy: 'ANY',
            waitlistEnabled: true,
            priceSingleCents: 20000,
            pricePairCents: 35000,
        },
    })

    async function onSubmit(data: CourseTrackFormValues) {
        const formData = new FormData()
        formData.append('periodId', periodId)
        formData.append('title', data.title)
        if (data.levelLabel) formData.append('levelLabel', data.levelLabel)
        formData.append('weekday', data.weekday.toString())
        formData.append('timeStart', data.timeStart)
        formData.append('timeEnd', data.timeEnd)
        formData.append('capacityTotal', data.capacityTotal.toString())
        if (data.capacityLeaders) formData.append('capacityLeaders', data.capacityLeaders.toString())
        if (data.capacityFollowers) formData.append('capacityFollowers', data.capacityFollowers.toString())
        formData.append('rolePolicy', data.rolePolicy)
        if (data.waitlistEnabled) formData.append('waitlistEnabled', 'on')
        formData.append('priceSingleCents', data.priceSingleCents.toString())
        if (data.pricePairCents) formData.append('pricePairCents', data.pricePairCents.toString())

        startTransition(async () => {
            const result = isEditing 
                ? await updateCourseTrackStaff(track!.id, null, formData)
                : await createCourseTrackStaff(null, formData)
                
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
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Track Title</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Cuban Salsa Level 1" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="weekday"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Weekday</FormLabel>
                                        <Select onValueChange={(val: string) => field.onChange(parseInt(val))} defaultValue={field.value.toString()}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select day" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="1">Monday</SelectItem>
                                                <SelectItem value="2">Tuesday</SelectItem>
                                                <SelectItem value="3">Wednesday</SelectItem>
                                                <SelectItem value="4">Thursday</SelectItem>
                                                <SelectItem value="5">Friday</SelectItem>
                                                <SelectItem value="6">Saturday</SelectItem>
                                                <SelectItem value="7">Sunday</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="levelLabel"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Level Label (Optional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Beginner" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="timeStart"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Start Time</FormLabel>
                                        <FormControl>
                                            <Input type="time" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="timeEnd"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>End Time</FormLabel>
                                        <FormControl>
                                            <Input type="time" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <FormField
                                control={form.control}
                                name="capacityTotal"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Total Capacity</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="capacityLeaders"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Leaders Cap (Optional)</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} value={field.value || ''} onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="capacityFollowers"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Followers Cap (Optional)</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} value={field.value || ''} onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="rolePolicy"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Role Policy</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select policy" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="ANY">Any (No specific ratio)</SelectItem>
                                            <SelectItem value="LEADER">Leader Only</SelectItem>
                                            <SelectItem value="FOLLOWER">Follower Only</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>ANY allows both Leaders and Followers</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="priceSingleCents"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Single Price (Øre/Cents)</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                                        </FormControl>
                                        <FormDescription>e.g. 20000 = 200 NOK</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="pricePairCents"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Pair Price (Øre) - Optional</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} value={field.value || ''} onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="flex justify-end gap-4">
                            <Button type="button" variant="outline" onClick={() => router.push(`/staffadmin/periods/${periodId}/tracks`)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending ? 'Saving...' : (isEditing ? 'Update Track' : 'Create Track')}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}
