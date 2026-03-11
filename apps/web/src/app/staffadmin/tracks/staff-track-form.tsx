'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { courseTrackSchema, type CourseTrackFormValues, TRACK_IMAGE_CONSTRAINTS } from '@/lib/schemas/track'
import { Button } from '@/components/ui/button'
import { useState, useEffect, useCallback } from 'react'
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
import { createCourseTrackStaff, updateCourseTrackStaff, saveTrackCustomFields } from '@/app/actions/staffadmin-tracks'
import { uploadTrackImage } from '@/app/actions/upload'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ImageUpload } from '@/components/image-upload'
import { LocationPicker, type LocationValue } from '@/components/location-picker'
import { CustomFieldBuilder } from '@/components/custom-field-builder'
import type { CustomFieldDefinition } from '@/types/custom-fields'
import { ExternalLink, Clock, MapPin, Users, CreditCard, Image as ImageIcon, ScanLine, Info, Video, Baby, UsersRound, UserCheck, Settings2, Calendar, Ticket, User, CalendarClock, FormInput } from 'lucide-react'
import Link from 'next/link'
import type { CourseTrack, CourseTemplateType, DeliveryMethod } from '@salsanor/database'
import { COURSE_TEMPLATE_LABELS, DELIVERY_METHOD_LABELS } from '@/types/custom-fields'
import { TEMPLATE_PRESETS, isSectionVisible, getTemplateDefaults } from '@/lib/course-templates'
import { UI_TEXT } from '@/lib/i18n'

const DEFAULT_CHECK_IN_WINDOW = 30 // minutes
const DEFAULT_ROLE_CAPACITY = 10 // default leaders / followers cap for PARTNER template

// i18n text shortcuts
const T = UI_TEXT.trackForm
const TEMPLATES = UI_TEXT.templates

// Template icon mapping
const TEMPLATE_ICONS: Record<CourseTemplateType, React.ElementType> = {
    PARTNER: Users,
    INDIVIDUAL: User,
    WORKSHOP: Calendar,
    DROP_IN: Ticket,
    VIRTUAL: Video,
    KIDS_YOUTH: Baby,
    TEAM: UsersRound,
    SUBSCRIPTION: CreditCard,
    PRIVATE: UserCheck,
    CUSTOM: Settings2,
}

// Map enum values to UI_TEXT.templates keys (camelCase)
const TEMPLATE_KEY_MAP: Record<CourseTemplateType, keyof typeof TEMPLATES> = {
    PARTNER: 'partner',
    INDIVIDUAL: 'individual',
    WORKSHOP: 'workshop',
    DROP_IN: 'dropIn',
    VIRTUAL: 'virtual',
    KIDS_YOUTH: 'kidsYouth',
    TEAM: 'team',
    SUBSCRIPTION: 'subscription',
    PRIVATE: 'private',
    CUSTOM: 'custom',
}

interface StaffTrackFormProps {
    periodId: string
    track?: CourseTrack
    hasMembershipProduct?: boolean
    /** Default template from period - can be overridden per track */
    defaultTemplateType?: CourseTemplateType
    /** Default delivery from period - can be overridden per track */
    defaultDeliveryMethod?: DeliveryMethod
}

export function StaffTrackForm({ periodId, track, hasMembershipProduct = false, defaultTemplateType = 'INDIVIDUAL', defaultDeliveryMethod = 'IN_PERSON' }: StaffTrackFormProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const isEditing = !!track

    // Determine initial pricing type based on whether member prices are set
    const hasMemberPricing = track?.memberPriceSingleCents !== null && track?.memberPriceSingleCents !== undefined && track.memberPriceSingleCents > 0
    const [memberPriceType, setMemberPriceType] = useState<'discount' | 'fixed'>(hasMemberPricing ? 'fixed' : 'discount')
    
    // Track imageUrl separately since it's uploaded separately from form submit
    const [imageUrl, setImageUrl] = useState<string>(track?.imageUrl || '')

    // Location state
    const [location, setLocation] = useState<LocationValue>({
        locationName: track?.locationName || undefined,
        locationAddress: track?.locationAddress || undefined,
        latitude: track?.latitude || undefined,
        longitude: track?.longitude || undefined,
    })

    // Custom fields state (track can override period-level custom fields)
    const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>(
        Array.isArray((track as any)?.customFields) ? ((track as any).customFields as CustomFieldDefinition[]) : []
    )
    const [isSavingFields, setIsSavingFields] = useState(false)

    const form = useForm<CourseTrackFormValues>({
        resolver: zodResolver(courseTrackSchema),
        defaultValues: track ? {
            periodId: track.periodId,
            title: track.title,
            description: track.description || '',
            imageUrl: track.imageUrl || '',
            levelLabel: track.levelLabel || '',
            templateType: track.templateType ?? defaultTemplateType,
            deliveryMethod: track.deliveryMethod ?? defaultDeliveryMethod,
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
            // Virtual meeting fields
            meetingUrl: track.meetingUrl || '',
            meetingPassword: track.meetingPassword || '',
            // Age fields
            minAge: track.minAge || undefined,
            maxAge: track.maxAge || undefined,
            // Team fields
            teamMinSize: track.teamMinSize || undefined,
            teamMaxSize: track.teamMaxSize || undefined,
            // Custom role labels
            roleALabel: track.roleALabel || '',
            roleBLabel: track.roleBLabel || '',
            // Slot booking fields (PRIVATE template)
            slotStartTime: track.slotStartTime || '12:00',
            slotDurationMinutes: track.slotDurationMinutes || 30,
            slotBreakMinutes: track.slotBreakMinutes || 0,
            slotCount: track.slotCount || 8,
            pricePerSlotCents: track.pricePerSlotCents || 50000,
            maxContinuousSlots: track.maxContinuousSlots || 2,
        } : {
            periodId,
            title: '',
            description: '',
            imageUrl: '',
            levelLabel: '',
            templateType: defaultTemplateType,
            deliveryMethod: defaultDeliveryMethod,
            weekday: 1,
            timeStart: '18:00',
            timeEnd: '19:00',
            locationName: undefined,
            locationAddress: undefined,
            latitude: undefined,
            longitude: undefined,
            capacityTotal: 20,
            capacityLeaders: defaultTemplateType === 'PARTNER' ? DEFAULT_ROLE_CAPACITY : undefined,
            capacityFollowers: defaultTemplateType === 'PARTNER' ? DEFAULT_ROLE_CAPACITY : undefined,
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
            // Virtual meeting fields
            meetingUrl: '',
            meetingPassword: '',
            // Age fields (KIDS_YOUTH template defaults)
            minAge: defaultTemplateType === 'KIDS_YOUTH' ? 6 : undefined,
            maxAge: defaultTemplateType === 'KIDS_YOUTH' ? 12 : undefined,
            // Team fields (TEAM template defaults)
            teamMinSize: defaultTemplateType === 'TEAM' ? 4 : undefined,
            teamMaxSize: defaultTemplateType === 'TEAM' ? 8 : undefined,
            // Custom role labels (defaults for dance)
            roleALabel: '',
            roleBLabel: '',
            // Slot booking fields (PRIVATE template defaults)
            slotStartTime: '12:00',
            slotDurationMinutes: 30,
            slotBreakMinutes: 0,
            slotCount: 8,
            pricePerSlotCents: 50000,
            maxContinuousSlots: 2,
        },
    })

    // Watch templateType for dynamic UI changes
    const watchedTemplateType = form.watch('templateType') as CourseTemplateType
    const watchedDeliveryMethod = form.watch('deliveryMethod') as DeliveryMethod
    const preset = TEMPLATE_PRESETS[watchedTemplateType]
    
    // Derived visibility flags from preset
    const showRoles = isSectionVisible(watchedTemplateType, 'roles')
    const showPairPricing = isSectionVisible(watchedTemplateType, 'pairPricing')
    const showLocation = isSectionVisible(watchedTemplateType, 'location')
    const showCheckIn = isSectionVisible(watchedTemplateType, 'checkIn')
    const showVirtualMeeting = isSectionVisible(watchedTemplateType, 'virtualMeeting') || watchedDeliveryMethod === 'VIRTUAL' || watchedDeliveryMethod === 'HYBRID'
    
    // Legacy flags for backward compatibility during transition
    const isPartner = watchedTemplateType === 'PARTNER'
    const isVirtual = watchedDeliveryMethod === 'VIRTUAL' || watchedDeliveryMethod === 'HYBRID'
    
    // Apply template defaults when template changes (only for new tracks)
    const applyTemplateDefaults = useCallback((templateType: CourseTemplateType) => {
        if (isEditing) return // Don't override existing track values
        
        const defaults = getTemplateDefaults(templateType)
        const presetConfig = TEMPLATE_PRESETS[templateType]
        
        form.setValue('capacityTotal', defaults.capacityTotal)
        form.setValue('waitlistEnabled', defaults.waitlistEnabled)
        form.setValue('priceSingleCents', defaults.priceSingleCents)
        form.setValue('deliveryMethod', presetConfig.defaultDeliveryMethod)
        
        if (defaults.capacityLeaders !== undefined) {
            form.setValue('capacityLeaders', defaults.capacityLeaders)
        } else {
            form.setValue('capacityLeaders', undefined)
        }
        
        if (defaults.capacityFollowers !== undefined) {
            form.setValue('capacityFollowers', defaults.capacityFollowers)
        } else {
            form.setValue('capacityFollowers', undefined)
        }
        
        if (defaults.pricePairCents !== undefined) {
            form.setValue('pricePairCents', defaults.pricePairCents)
        } else {
            form.setValue('pricePairCents', undefined)
        }
    }, [form, isEditing])
    
    // Watch for template changes and apply defaults
    useEffect(() => {
        const subscription = form.watch((value, { name }) => {
            if (name === 'templateType' && value.templateType) {
                applyTemplateDefaults(value.templateType as CourseTemplateType)
            }
        })
        return () => subscription.unsubscribe()
    }, [form, applyTemplateDefaults])

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
        // Template and delivery method
        formData.append('templateType', data.templateType || 'INDIVIDUAL')
        formData.append('deliveryMethod', data.deliveryMethod || 'IN_PERSON')
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
        // Always send member pricing fields — empty string signals "clear to null"
        formData.append('memberPriceSingleCents', data.memberPriceSingleCents?.toString() ?? '')
        formData.append('memberPricePairCents', data.memberPricePairCents?.toString() ?? '')
        // Virtual meeting fields
        if (data.meetingUrl) formData.append('meetingUrl', data.meetingUrl)
        if (data.meetingPassword) formData.append('meetingPassword', data.meetingPassword)
        // Age restriction fields
        if (data.minAge !== undefined) formData.append('minAge', data.minAge.toString())
        if (data.maxAge !== undefined) formData.append('maxAge', data.maxAge.toString())
        // Team configuration fields
        if (data.teamMinSize !== undefined) formData.append('teamMinSize', data.teamMinSize.toString())
        if (data.teamMaxSize !== undefined) formData.append('teamMaxSize', data.teamMaxSize.toString())
        // Custom role labels
        if (data.roleALabel) formData.append('roleALabel', data.roleALabel)
        if (data.roleBLabel) formData.append('roleBLabel', data.roleBLabel)
        // Slot booking fields (PRIVATE template)
        if (data.slotStartTime) formData.append('slotStartTime', data.slotStartTime)
        if (data.slotDurationMinutes !== undefined) formData.append('slotDurationMinutes', data.slotDurationMinutes.toString())
        if (data.slotBreakMinutes !== undefined) formData.append('slotBreakMinutes', data.slotBreakMinutes.toString())
        if (data.slotCount !== undefined) formData.append('slotCount', data.slotCount.toString())
        if (data.pricePerSlotCents !== undefined) formData.append('pricePerSlotCents', data.pricePerSlotCents.toString())
        if (data.maxContinuousSlots !== undefined) formData.append('maxContinuousSlots', data.maxContinuousSlots.toString())

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

    // Handler for saving custom fields separately
    async function handleSaveCustomFields() {
        if (!track) return
        setIsSavingFields(true)
        try {
            await saveTrackCustomFields(track.id, customFields)
        } catch (e) {
            console.error('Failed to save custom fields:', e)
        } finally {
            setIsSavingFields(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* ROW 1: Basic Information - Full Width */}
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <ImageIcon className="h-5 w-5" />
                            {T.sections.basicInfoTitle}
                        </CardTitle>
                        <CardDescription>{T.sections.basicInfoDescription}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{T.fields.title}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={T.fields.titlePlaceholder} {...field} />
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
                                    <FormLabel>{T.fields.levelLabel} (Optional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder={T.fields.levelLabelPlaceholder} {...field} />
                                    </FormControl>
                                    <FormDescription>{T.fields.levelLabelHelp}</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{T.fields.description} (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea 
                                            placeholder={T.fields.descriptionPlaceholder}
                                            rows={4}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        {T.fields.descriptionHelp}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Hero Image */}
                        <div className="space-y-2">
                            <Label>{T.fields.heroImage} (Optional)</Label>
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
                                {T.fields.heroImageHelp}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* ROW 2: Course Type (1/2) | Schedule (1/2) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Course Type */}
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Info className="h-5 w-5" />
                                {T.sections.courseTypeTitle}
                            </CardTitle>
                            <CardDescription>{T.sections.courseTypeDescription}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="templateType"
                                render={({ field }) => {
                                    const Icon = TEMPLATE_ICONS[field.value as CourseTemplateType] || Settings2
                                    return (
                                    <FormItem>
                                        <FormLabel>{T.fields.templateType}</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select template type">
                                                        <span className="flex items-center gap-2">
                                                            <Icon className="h-4 w-4" />
                                                            {COURSE_TEMPLATE_LABELS[field.value as CourseTemplateType]}
                                                        </span>
                                                    </SelectValue>
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {(Object.entries(COURSE_TEMPLATE_LABELS) as [CourseTemplateType, string][]).map(([value, label]) => {
                                                    const ItemIcon = TEMPLATE_ICONS[value]
                                                    return (
                                                    <SelectItem key={value} value={value}>
                                                        <span className="flex items-center gap-2">
                                                            <ItemIcon className="h-4 w-4" />
                                                            {label}
                                                        </span>
                                                    </SelectItem>
                                                )})}
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>{T.fields.templateTypeDescription}</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}}
                            />

                            <FormField
                                control={form.control}
                                name="deliveryMethod"
                                render={({ field }) => {
                                    const isVirtualTemplate = watchedTemplateType === 'VIRTUAL'
                                    return (
                                        <FormItem>
                                            <FormLabel>{T.fields.deliveryMethod}</FormLabel>
                                            <Select 
                                                onValueChange={field.onChange} 
                                                value={field.value}
                                                disabled={isVirtualTemplate}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select delivery method" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {(Object.entries(DELIVERY_METHOD_LABELS) as [string, string][]).map(([value, label]) => (
                                                        <SelectItem key={value} value={value}>
                                                            {label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>
                                                {isVirtualTemplate 
                                                    ? T.fields.deliveryMethodVirtualNote ?? 'Virtual template is always delivered online'
                                                    : T.fields.deliveryMethodDescription
                                                }
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )
                                }}
                            />
                            
                            {/* Template description hint */}
                            {preset && (
                                <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
                                    <strong>{COURSE_TEMPLATE_LABELS[watchedTemplateType]}:</strong>{' '}
                                    {TEMPLATES[TEMPLATE_KEY_MAP[watchedTemplateType]]?.description || preset.descriptionKey}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Schedule */}
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Clock className="h-5 w-5" />
                                {T.sections.scheduleTitle}
                            </CardTitle>
                            <CardDescription>{T.sections.scheduleDescription}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="weekday"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{T.fields.weekday}</FormLabel>
                                        <Select onValueChange={(val: string) => field.onChange(parseInt(val))} value={field.value.toString()}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select day" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="1">{T.weekdays.monday}</SelectItem>
                                                <SelectItem value="2">{T.weekdays.tuesday}</SelectItem>
                                                <SelectItem value="3">{T.weekdays.wednesday}</SelectItem>
                                                <SelectItem value="4">{T.weekdays.thursday}</SelectItem>
                                                <SelectItem value="5">{T.weekdays.friday}</SelectItem>
                                                <SelectItem value="6">{T.weekdays.saturday}</SelectItem>
                                                <SelectItem value="7">{T.weekdays.sunday}</SelectItem>
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
                                            <FormLabel>{T.fields.timeStart}</FormLabel>
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
                                            <FormLabel>{T.fields.timeEnd}</FormLabel>
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
                </div>

                {/* ROW 3: Pricing (1/2) | Capacity (1/2) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Pricing */}
                    <Card>
                        <CardHeader className="pb-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <CreditCard className="h-5 w-5" />
                                        {T.sections.pricingTitle}
                                    </CardTitle>
                                    <CardDescription>{T.sections.pricingDescription}</CardDescription>
                                </div>
                                {hasMembershipProduct && (
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href="/staffadmin/memberships/product" target="_blank">
                                            <ExternalLink className="h-4 w-4 mr-2" />
                                            Memberships
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className={`grid gap-4 ${showPairPricing ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                <FormField
                                    control={form.control}
                                    name="priceSingleCents"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{showPairPricing ? 'Per Person' : 'Price'} (kr)</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    type="number" 
                                                    step="1"
                                                    min="0"
                                                    value={field.value ? field.value / 100 : ''}
                                                    onChange={e => field.onChange(e.target.value ? Math.round(parseFloat(e.target.value) * 100) : 0)}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                {showPairPricing && (
                                    <FormField
                                        control={form.control}
                                        name="pricePairCents"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Per Pair (kr)</FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        type="number" 
                                                        step="1"
                                                        min="0"
                                                        value={field.value ? field.value / 100 : ''}
                                                        onChange={e => field.onChange(e.target.value ? Math.round(parseFloat(e.target.value) * 100) : undefined)}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">Prices in NOK (Norwegian Kroner)</p>

                            {/* Member Pricing */}
                            <div className={`border-t pt-4 ${!hasMembershipProduct ? 'opacity-50' : ''}`}>
                                <Label className="mb-3 block text-sm font-medium">{T.sections.memberPricingTitle}</Label>
                                {!hasMembershipProduct ? (
                                    <p className="text-sm text-muted-foreground">Requires a membership product to be configured for this organization.</p>
                                ) : (
                                <div className="space-y-2">
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
                                        <span className="text-sm">Use membership discount engine</span>
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
                                        <div className="ml-6 pt-2">
                                            <div className={`grid gap-4 ${showPairPricing ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                                <FormField
                                                    control={form.control}
                                                    name="memberPriceSingleCents"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>{showPairPricing ? 'Per Person' : 'Member Price'} (kr)</FormLabel>
                                                            <FormControl>
                                                                <Input 
                                                                    type="number" 
                                                                    step="1"
                                                                    min="0"
                                                                    value={field.value ? field.value / 100 : ''}
                                                                    onChange={e => field.onChange(e.target.value ? Math.round(parseFloat(e.target.value) * 100) : undefined)}
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                {showPairPricing && (
                                                    <FormField
                                                        control={form.control}
                                                        name="memberPricePairCents"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Per Pair (kr)</FormLabel>
                                                                <FormControl>
                                                                    <Input 
                                                                        type="number" 
                                                                        step="1"
                                                                        min="0"
                                                                        value={field.value ? field.value / 100 : ''}
                                                                        onChange={e => field.onChange(e.target.value ? Math.round(parseFloat(e.target.value) * 100) : undefined)}
                                                                    />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Capacity */}
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Users className="h-5 w-5" />
                                {showRoles ? T.sections.capacityWithRolesTitle : T.sections.capacityTitle}
                            </CardTitle>
                            <CardDescription>{T.sections.capacityDescription}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className={`grid gap-4 ${showRoles ? 'sm:grid-cols-3' : 'grid-cols-1 max-w-xs'}`}>
                                <FormField
                                    control={form.control}
                                    name="capacityTotal"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{T.fields.capacityTotal}</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                {showRoles && (
                                    <>
                                        <FormField
                                            control={form.control}
                                            name="capacityLeaders"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{form.watch('roleALabel') || 'Role A'} Cap</FormLabel>
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
                                                    <FormLabel>{form.watch('roleBLabel') || 'Role B'} Cap</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" {...field} value={field.value || ''} onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </>
                                )}
                            </div>

                            {showRoles && (
                                <>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <FormField
                                            control={form.control}
                                            name="roleALabel"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{T.fields.roleALabel}</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder={T.fields.roleALabelPlaceholder} {...field} />
                                                    </FormControl>
                                                    <FormDescription className="text-xs">{T.fields.roleALabelHelp}</FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="roleBLabel"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{T.fields.roleBLabel}</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder={T.fields.roleBLabelPlaceholder} {...field} />
                                                    </FormControl>
                                                    <FormDescription className="text-xs">{T.fields.roleBLabelHelp}</FormDescription>
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
                                                <FormLabel>{T.fields.rolePolicy}</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="w-full max-w-xs">
                                                            <SelectValue placeholder="Select policy" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="ANY">{T.rolePolicies.any}</SelectItem>
                                                        <SelectItem value="LEADER">{form.watch('roleALabel') || T.rolePolicies.leader}</SelectItem>
                                                        <SelectItem value="FOLLOWER">{form.watch('roleBLabel') || T.rolePolicies.follower}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormDescription className="text-xs">{T.fields.rolePolicyHelp}</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </>
                            )}

                            <FormField
                                control={form.control}
                                name="waitlistEnabled"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center gap-3">
                                            <FormControl>
                                                <input
                                                    type="checkbox"
                                                    id="waitlistEnabled"
                                                    checked={field.value}
                                                    onChange={field.onChange}
                                                    className="h-4 w-4 cursor-pointer"
                                                />
                                            </FormControl>
                                            <FormLabel htmlFor="waitlistEnabled" className="cursor-pointer font-normal">
                                                {T.fields.waitlistEnabled}
                                            </FormLabel>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* ROW 4: Location - Full Width */}
                {showLocation && (
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <MapPin className="h-5 w-5" />
                            {T.sections.locationTitle}
                        </CardTitle>
                        <CardDescription>
                            {isVirtual
                                ? 'Optional for virtual/hybrid sessions'
                                : 'Where does the course take place?'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <LocationPicker
                            value={location}
                            onChange={setLocation}
                        />
                        <p className="text-xs text-muted-foreground">
                            Powered by OpenStreetMap. Location data is used for Wallet Tickets{form.watch('geofenceEnabled') ? ' and geofencing check-in verification' : ''}.
                        </p>
                    </CardContent>
                </Card>
                )}

                {/* ROW 5: Template-specific fields */}
                {/* Virtual Meeting Section */}
                {showVirtualMeeting && (
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Video className="h-5 w-5" />
                            {T.sections.virtualMeetingTitle}
                        </CardTitle>
                        <CardDescription>{T.sections.virtualMeetingDescription}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="meetingUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{T.fields.meetingUrl}</FormLabel>
                                        <FormControl>
                                            <Input 
                                                placeholder={T.fields.meetingUrlPlaceholder} 
                                                {...field} 
                                                value={field.value || ''} 
                                            />
                                        </FormControl>
                                        <FormDescription className="text-xs">{T.fields.meetingUrlHelp}</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="meetingPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{T.fields.meetingPassword} (Optional)</FormLabel>
                                        <FormControl>
                                            <Input 
                                                {...field} 
                                                value={field.value || ''} 
                                            />
                                        </FormControl>
                                        <FormDescription className="text-xs">{T.fields.meetingPasswordHelp}</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </CardContent>
                </Card>
                )}

                {/* Age/Team specific fields in a row */}
                {(watchedTemplateType === 'KIDS_YOUTH' || watchedTemplateType === 'TEAM') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Age Restrictions - for KIDS_YOUTH template */}
                    {watchedTemplateType === 'KIDS_YOUTH' && (
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Baby className="h-5 w-5" />
                                Age Restrictions
                            </CardTitle>
                            <CardDescription>Define the age range for participants</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="minAge"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{T.fields.minAge}</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    type="number" 
                                                    min={0} 
                                                    max={100}
                                                    {...field} 
                                                    value={field.value || ''} 
                                                    onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} 
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="maxAge"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{T.fields.maxAge}</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    type="number" 
                                                    min={0} 
                                                    max={100}
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
                        </CardContent>
                    </Card>
                    )}

                    {/* Team Size - for TEAM template */}
                    {watchedTemplateType === 'TEAM' && (
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <UsersRound className="h-5 w-5" />
                                Team Configuration
                            </CardTitle>
                            <CardDescription>Define team sizes</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="teamMinSize"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{T.fields.teamMinSize}</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    type="number" 
                                                    min={1}
                                                    {...field} 
                                                    value={field.value || ''} 
                                                    onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} 
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="teamMaxSize"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{T.fields.teamMaxSize}</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    type="number" 
                                                    min={1}
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
                        </CardContent>
                    </Card>
                    )}
                </div>
                )}

                {/* Slot Booking Section - for PRIVATE template */}
                {watchedTemplateType === 'PRIVATE' && (
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <CalendarClock className="h-5 w-5" />
                            Time Slot Configuration
                        </CardTitle>
                        <CardDescription>
                            Configure available time slots for private lessons. Participants can book individual slots that repeat each week of the course period.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Weekday Selection for PRIVATE template */}
                        <FormField
                            control={form.control}
                            name="weekday"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Day of Week</FormLabel>
                                    <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value?.toString()}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select day for private lessons" />
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
                                    <FormDescription className="text-xs">
                                        Day when private lesson slots are available (slots repeat weekly)
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <FormField
                                control={form.control}
                                name="slotStartTime"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Start of Day</FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="time"
                                                {...field} 
                                                value={field.value || '12:00'} 
                                            />
                                        </FormControl>
                                        <FormDescription className="text-xs">When slots begin</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="slotDurationMinutes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Slot Duration (min)</FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="number"
                                                min={15}
                                                max={240}
                                                {...field} 
                                                value={field.value || 30} 
                                                onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : 30)} 
                                            />
                                        </FormControl>
                                        <FormDescription className="text-xs">Length of each slot</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="slotBreakMinutes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Break Between Slots (min)</FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="number"
                                                min={0}
                                                max={60}
                                                {...field} 
                                                value={field.value ?? 0} 
                                                onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : 0)} 
                                            />
                                        </FormControl>
                                        <FormDescription className="text-xs">Rest time between slots</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="slotCount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Number of Slots</FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="number"
                                                min={1}
                                                max={24}
                                                {...field} 
                                                value={field.value || 8} 
                                                onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : 8)} 
                                            />
                                        </FormControl>
                                        <FormDescription className="text-xs">Slots available per session</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="pricePerSlotCents"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Price per Slot (kr)</FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="number"
                                                min={0}
                                                {...field} 
                                                value={field.value ? field.value / 100 : 500} 
                                                onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) * 100 : 50000)} 
                                            />
                                        </FormControl>
                                        <FormDescription className="text-xs">Cost per slot booked</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="maxContinuousSlots"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Max Continuous Slots</FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="number"
                                                min={1}
                                                max={12}
                                                {...field} 
                                                value={field.value || 2} 
                                                onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : 2)} 
                                            />
                                        </FormControl>
                                        <FormDescription className="text-xs">Max slots per booking</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        
                        {/* Calculated End Time Display */}
                        {form.watch('slotStartTime') && form.watch('slotCount') && form.watch('slotDurationMinutes') && (
                        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                            <p className="text-sm text-muted-foreground">
                                <span className="font-medium">Calculated end time: </span>
                                {(() => {
                                    const startTime = form.watch('slotStartTime') || '12:00'
                                    const slotCount = form.watch('slotCount') || 8
                                    const duration = form.watch('slotDurationMinutes') || 30
                                    const breakTime = form.watch('slotBreakMinutes') || 0
                                    
                                    const [hours, minutes] = startTime.split(':').map(Number)
                                    const totalMinutes = hours * 60 + minutes + (slotCount * duration) + ((slotCount - 1) * breakTime)
                                    const endHours = Math.floor(totalMinutes / 60) % 24
                                    const endMinutes = totalMinutes % 60
                                    
                                    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`
                                })()}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {form.watch('slotCount')} slots × {form.watch('slotDurationMinutes')} min
                                {(form.watch('slotBreakMinutes') ?? 0) > 0 && ` + ${(form.watch('slotCount') || 1) - 1} breaks × ${form.watch('slotBreakMinutes')} min`}
                            </p>
                        </div>
                        )}
                    </CardContent>
                </Card>
                )}

                {/* ROW 6: Self Check-in Section (where relevant) */}
                {showCheckIn && (
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <ScanLine className="h-5 w-5" />
                            {T.sections.checkInTitle}
                        </CardTitle>
                        <CardDescription>{T.sections.checkInDescription}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                                                {T.fields.allowSelfCheckIn}
                                            </FormLabel>
                                        </div>
                                        <FormDescription className="text-xs">
                                            {T.fields.allowSelfCheckInHelp}
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {form.watch('allowSelfCheckIn') && (
                                <>
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
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="checkInWindowAfter"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Minutes after start</FormLabel>
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
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </>
                            )}
                        </div>
                        {form.watch('allowSelfCheckIn') && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                                <FormField
                                    control={form.control}
                                    name="allowDashboardCheckIn"
                                    render={({ field }) => (
                                        <FormItem>
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
                                            <FormDescription className="text-xs">
                                                Participants can check in from their dashboard without QR code.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                {form.watch('allowDashboardCheckIn') && (
                                    <div className="space-y-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
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
                                                            Require location verification
                                                        </FormLabel>
                                                    </div>
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
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        )}
                                        {form.watch('geofenceEnabled') && (!form.watch('latitude') || !form.watch('longitude')) && (
                                            <div className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                                                <span className="text-amber-500">⚠️</span>
                                                Set location coordinates above for geofencing.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
                )}

                {/* Custom Registration Fields — track-level override */}
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <FormInput className="h-5 w-5" />
                            Custom Registration Fields
                        </CardTitle>
                        <CardDescription>
                            Add extra questions specific to this track that participants must answer when registering.
                            These will be shown in addition to any period-level custom fields.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {!isEditing && (
                            <p className="text-sm text-muted-foreground">
                                Save the track first to add track-specific custom registration fields.
                            </p>
                        )}
                        {isEditing && (
                            <>
                                <CustomFieldBuilder
                                    fields={customFields}
                                    onChange={setCustomFields}
                                />
                                <div className="flex justify-end">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleSaveCustomFields}
                                        disabled={isSavingFields}
                                    >
                                        {isSavingFields ? 'Saving...' : 'Save Custom Fields'}
                                    </Button>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Form Actions */}
                <div className="flex justify-end gap-4 pt-4 border-t">
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
