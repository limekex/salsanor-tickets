'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { courseTrackSchema, type CourseTrackFormValues, TRACK_IMAGE_CONSTRAINTS } from '@/lib/schemas/track'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { createCourseTrackStaff, updateCourseTrackStaff } from '@/app/actions/staffadmin-tracks'
import { uploadTrackImage } from '@/app/actions/upload'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ImageUpload } from '@/components/image-upload'
import { LocationPicker } from '@/components/location-picker'
import { ExternalLink, Clock, MapPin, Users, CreditCard, Image as ImageIcon, ScanLine } from 'lucide-react'
import Link from 'next/link'
import type { CourseTrack } from '@salsanor/database'

const DEFAULT_CHECK_IN_WINDOW = 30 // minutes

interface StaffTrackFormProps {
    periodId: string
    track?: CourseTrack
    hasMembershipProduct?: boolean
}

export function StaffTrackForm({ periodId, track, hasMembershipProduct = false }: StaffTrackFormProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const isEditing = !!track
    
    // Determine initial pricing type based on whether member prices are set
    const hasMemberPricing = track?.memberPriceSingleCents !== null && track?.memberPriceSingleCents !== undefined && track.memberPriceSingleCents > 0
    const [memberPriceType, setMemberPriceType] = useState<'discount' | 'fixed'>(hasMemberPricing ? 'fixed' : 'discount')
    
    // Track imageUrl separately since it's uploaded separately from form submit
    const [imageUrl, setImageUrl] = useState<string>(track?.imageUrl || '')

    // Location state
    const [location, setLocation] = useState({
        locationName: track?.locationName || undefined,
        locationAddress: track?.locationAddress || undefined,
        latitude: track?.latitude || undefined,
        longitude: track?.longitude || undefined,
    })

    const form = useForm<CourseTrackFormValues>({
        resolver: zodResolver(courseTrackSchema),
        defaultValues: track ? {
            periodId: track.periodId,
            title: track.title,
            description: track.description || '',
            imageUrl: track.imageUrl || '',
            levelLabel: track.levelLabel || '',
            weekday: track.weekday,
            timeStart: track.timeStart,
            timeEnd: track.timeEnd,
            locationName: track.locationName || undefined,
            locationAddress: track.locationAddress || undefined,
            latitude: track.latitude || undefined,
            longitude: track.longitude || undefined,
            capacityTotal: track.capacityTotal,
            capacityLeaders: track.capacityLeaders || undefined,
            capacityFollowers: track.capacityFollowers || undefined,
            rolePolicy: track.rolePolicy,
            waitlistEnabled: track.waitlistEnabled,
            allowSelfCheckIn: track.allowSelfCheckIn,
            allowDashboardCheckIn: track.allowDashboardCheckIn,
            geofenceEnabled: track.geofenceEnabled,
            geofenceRadius: track.geofenceRadius ?? 100,
            checkInWindowBefore: track.checkInWindowBefore ?? DEFAULT_CHECK_IN_WINDOW,
            checkInWindowAfter: track.checkInWindowAfter ?? DEFAULT_CHECK_IN_WINDOW,
            priceSingleCents: track.priceSingleCents,
            pricePairCents: track.pricePairCents || undefined,
            memberPriceSingleCents: track.memberPriceSingleCents || undefined,
            memberPricePairCents: track.memberPricePairCents || undefined,
        } : {
            periodId,
            title: '',
            description: '',
            imageUrl: '',
            levelLabel: '',
            weekday: 1,
            timeStart: '18:00',
            timeEnd: '19:00',
            locationName: undefined,
            locationAddress: undefined,
            latitude: undefined,
            longitude: undefined,
            capacityTotal: 20,
            capacityLeaders: 10,
            capacityFollowers: 10,
            rolePolicy: 'ANY',
            waitlistEnabled: true,
            allowSelfCheckIn: false,
            allowDashboardCheckIn: false,
            geofenceEnabled: false,
            geofenceRadius: 100,
            checkInWindowBefore: DEFAULT_CHECK_IN_WINDOW,
            checkInWindowAfter: DEFAULT_CHECK_IN_WINDOW,
            priceSingleCents: 20000,
            pricePairCents: 35000,
            memberPriceSingleCents: undefined,
            memberPricePairCents: undefined,
        },
    })

    // Handle image upload
    const handleImageUpload = async (file: File): Promise<string> => {
        const formData = new FormData()
        formData.append('file', file)
        const result = await uploadTrackImage(formData)
        if (result.error) {
            throw new Error(result.error)
        }
        if (result.url) {
            setImageUrl(result.url)
            form.setValue('imageUrl', result.url)
            return result.url
        }
        throw new Error('Upload failed')
    }

    async function onSubmit(data: CourseTrackFormValues) {
        const formData = new FormData()
        formData.append('periodId', periodId)
        formData.append('title', data.title)
        if (data.description) formData.append('description', data.description)
        if (imageUrl) formData.append('imageUrl', imageUrl)
        if (data.levelLabel) formData.append('levelLabel', data.levelLabel)
        formData.append('weekday', data.weekday.toString())
        formData.append('timeStart', data.timeStart)
        formData.append('timeEnd', data.timeEnd)
        // Location fields
        if (location.locationName) formData.append('locationName', location.locationName)
        if (location.locationAddress) formData.append('locationAddress', location.locationAddress)
        if (location.latitude !== undefined) formData.append('latitude', location.latitude.toString())
        if (location.longitude !== undefined) formData.append('longitude', location.longitude.toString())
        // Capacity
        formData.append('capacityTotal', data.capacityTotal.toString())
        if (data.capacityLeaders) formData.append('capacityLeaders', data.capacityLeaders.toString())
        if (data.capacityFollowers) formData.append('capacityFollowers', data.capacityFollowers.toString())
        formData.append('rolePolicy', data.rolePolicy)
        if (data.waitlistEnabled) formData.append('waitlistEnabled', 'on')
        if (data.allowSelfCheckIn) formData.append('allowSelfCheckIn', 'on')
        if (data.allowDashboardCheckIn) formData.append('allowDashboardCheckIn', 'on')
        if (data.geofenceEnabled) formData.append('geofenceEnabled', 'on')
        if (data.geofenceRadius !== undefined) formData.append('geofenceRadius', data.geofenceRadius.toString())
        if (data.checkInWindowBefore !== undefined) formData.append('checkInWindowBefore', data.checkInWindowBefore.toString())
        if (data.checkInWindowAfter !== undefined) formData.append('checkInWindowAfter', data.checkInWindowAfter.toString())
        // Pricing
        formData.append('priceSingleCents', data.priceSingleCents.toString())
        if (data.pricePairCents) formData.append('pricePairCents', data.pricePairCents.toString())
        if (data.memberPriceSingleCents) formData.append('memberPriceSingleCents', data.memberPriceSingleCents.toString())
        if (data.memberPricePairCents) formData.append('memberPricePairCents', data.memberPricePairCents.toString())

        startTransition(async () => {
            const result = isEditing 
                ? await updateCourseTrackStaff(track!.id, null, formData)
                : await createCourseTrackStaff(null, formData)
                
            if (result?.error) {
                // Log full error for debugging
                console.error('Track form error:', JSON.stringify(result.error, null, 2))
                
                // Set form errors for specific fields
                if (result.error._form) {
                    form.setError('root', { message: result.error._form.join(', ') })
                }
                Object.entries(result.error).forEach(([key, messages]) => {
                    if (key !== '_form' && Array.isArray(messages)) {
                        form.setError(key as any, { message: messages.join(', ') })
                    }
                })
            }
        })
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Basic Info Section */}
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <ImageIcon className="h-5 w-5" />
                            Basic Information
                        </CardTitle>
                        <CardDescription>Course title, description, and hero image</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
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

                        <FormField
                            control={form.control}
                            name="levelLabel"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Level Label (Optional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Beginner" {...field} />
                                    </FormControl>
                                    <FormDescription>e.g., Beginner, Intermediate, Advanced</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea 
                                            placeholder="Describe what participants will learn in this course..."
                                            rows={4}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Brief description shown on the course detail page
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Hero Image */}
                        <div className="space-y-2">
                            <Label>Hero Image (Optional)</Label>
                            <ImageUpload
                                value={imageUrl}
                                onChange={(url) => {
                                    setImageUrl(url)
                                    form.setValue('imageUrl', url)
                                }}
                                onUpload={handleImageUpload}
                                constraints={TRACK_IMAGE_CONSTRAINTS}
                                disabled={isPending}
                            />
                            <p className="text-sm text-muted-foreground">
                                Landscape image for the course header. Recommended: 1600x800px
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Schedule Section */}
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Clock className="h-5 w-5" />
                            Schedule
                        </CardTitle>
                        <CardDescription>When does the course take place?</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                    </CardContent>
                </Card>

                {/* Location Section */}
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <MapPin className="h-5 w-5" />
                            Location
                        </CardTitle>
                        <CardDescription>Where does the course take place? Used for Wallet Tickets.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <LocationPicker
                            value={location}
                            onChange={setLocation}
                        />
                    </CardContent>
                </Card>

                {/* Capacity Section */}
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Users className="h-5 w-5" />
                            Capacity & Roles
                        </CardTitle>
                        <CardDescription>How many participants can join?</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                    </CardContent>
                </Card>

                {/* Self Check-in Section */}
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <ScanLine className="h-5 w-5" />
                            Self Check-in
                        </CardTitle>
                        <CardDescription>Allow participants to check themselves in using a QR code or phone number</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField
                            control={form.control}
                            name="allowSelfCheckIn"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center gap-3">
                                        <FormControl>
                                            <input
                                                type="checkbox"
                                                id="allowSelfCheckIn"
                                                checked={field.value}
                                                onChange={field.onChange}
                                                className="h-4 w-4 cursor-pointer"
                                            />
                                        </FormControl>
                                        <FormLabel htmlFor="allowSelfCheckIn" className="cursor-pointer font-normal">
                                            Enable self check-in for participants
                                        </FormLabel>
                                    </div>
                                    <FormDescription>
                                        When enabled, a public check-in page (<code>/selfcheckin?trackId=…</code>) lets participants scan their ticket QR or enter their phone number.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {form.watch('allowSelfCheckIn') && (
                            <div className="grid grid-cols-2 gap-4 pl-7">
                                <FormField
                                    control={form.control}
                                    name="checkInWindowBefore"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Minutes before class</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={240}
                                                    {...field}
                                                    value={field.value ?? DEFAULT_CHECK_IN_WINDOW}
                                                    onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : DEFAULT_CHECK_IN_WINDOW)}
                                                />
                                            </FormControl>
                                            <FormDescription>How early check-in opens (default: {DEFAULT_CHECK_IN_WINDOW})</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="checkInWindowAfter"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Minutes after class starts</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={240}
                                                    {...field}
                                                    value={field.value ?? DEFAULT_CHECK_IN_WINDOW}
                                                    onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : DEFAULT_CHECK_IN_WINDOW)}
                                                />
                                            </FormControl>
                                            <FormDescription>How late check-in stays open (default: {DEFAULT_CHECK_IN_WINDOW})</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}
                        {form.watch('allowSelfCheckIn') && (
                            <FormField
                                control={form.control}
                                name="allowDashboardCheckIn"
                                render={({ field }) => (
                                    <FormItem className="pl-7 mt-4">
                                        <div className="flex items-center gap-3">
                                            <FormControl>
                                                <input
                                                    type="checkbox"
                                                    id="allowDashboardCheckIn"
                                                    checked={field.value}
                                                    onChange={field.onChange}
                                                    className="h-4 w-4 cursor-pointer"
                                                />
                                            </FormControl>
                                            <FormLabel htmlFor="allowDashboardCheckIn" className="cursor-pointer font-normal">
                                                Allow check-in from participant portal
                                            </FormLabel>
                                        </div>
                                        <FormDescription>
                                            When enabled, participants can check in directly from their &quot;My Dashboard&quot; page without scanning a QR code.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                        {form.watch('allowDashboardCheckIn') && (
                            <div className="pl-7 mt-4 space-y-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                                <FormField
                                    control={form.control}
                                    name="geofenceEnabled"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="flex items-center gap-3">
                                                <FormControl>
                                                    <input
                                                        type="checkbox"
                                                        id="geofenceEnabled"
                                                        checked={field.value}
                                                        onChange={field.onChange}
                                                        className="h-4 w-4 cursor-pointer"
                                                    />
                                                </FormControl>
                                                <FormLabel htmlFor="geofenceEnabled" className="cursor-pointer font-normal">
                                                    Require location verification (geofencing)
                                                </FormLabel>
                                            </div>
                                            <FormDescription>
                                                Participants must be physically at the venue to check in. Requires location coordinates above.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                {form.watch('geofenceEnabled') && (
                                    <FormField
                                        control={form.control}
                                        name="geofenceRadius"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Geofence radius (meters)</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        min={10}
                                                        max={5000}
                                                        {...field}
                                                        value={field.value ?? 100}
                                                        onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : 100)}
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Distance in meters from venue where check-in is allowed (10–5000m, recommended: 50–200m)
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                                {form.watch('geofenceEnabled') && (!form.watch('latitude') || !form.watch('longitude')) && (
                                    <div className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                                        <span className="text-amber-500">⚠️</span>
                                        Location coordinates are required for geofencing. Set latitude and longitude in the Location section above.
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Pricing Section */}
                <Card>
                    <CardHeader className="pb-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <CreditCard className="h-5 w-5" />
                                    Pricing & Discounts
                                </CardTitle>
                                <CardDescription>Set prices and member discounts</CardDescription>
                            </div>
                            {hasMembershipProduct && (
                                <Button variant="outline" size="sm" asChild>
                                    <Link href="/staffadmin/memberships/product" target="_blank">
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        Browse Memberships
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="priceSingleCents"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Single Price (øre/cents)</FormLabel>
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
                                        <FormLabel>Pair Price (øre) - Optional</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} value={field.value || ''} onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Member Pricing Section */}
                        <div className="border-t pt-4">
                            <Label className="mb-3 block">Member Pricing</Label>
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="memberPriceType"
                                        value="discount"
                                        checked={memberPriceType === 'discount'}
                                        onChange={() => {
                                            setMemberPriceType('discount')
                                            form.setValue('memberPriceSingleCents', undefined)
                                            form.setValue('memberPricePairCents', undefined)
                                        }}
                                        className="h-4 w-4"
                                    />
                                    <span className="text-sm">Use standard membership discount from discount engine</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="memberPriceType"
                                        value="fixed"
                                        checked={memberPriceType === 'fixed'}
                                        onChange={() => setMemberPriceType('fixed')}
                                        className="h-4 w-4"
                                    />
                                    <span className="text-sm">Set fixed member prices</span>
                                </label>
                                
                                {memberPriceType === 'fixed' && (
                                    <div className="ml-6 space-y-4 pt-2">
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="memberPriceSingleCents"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Member Single Price (øre)</FormLabel>
                                                        <FormControl>
                                                            <Input 
                                                                type="number" 
                                                                {...field} 
                                                                value={field.value || ''} 
                                                                onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} 
                                                            />
                                                        </FormControl>
                                                        <FormDescription>e.g. 15000 = 150 NOK</FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="memberPricePairCents"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Member Pair Price (øre) - Optional</FormLabel>
                                                        <FormControl>
                                                            <Input 
                                                                type="number" 
                                                                {...field} 
                                                                value={field.value || ''} 
                                                                onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} 
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Form Actions */}
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
    )
}
