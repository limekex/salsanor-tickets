'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { createEvent, updateEvent } from '@/app/actions/events'
import { createTag } from '@/app/actions/tags'
import type { Category, Tag, Event, EventType } from '@prisma/client'
import { Plus, X } from 'lucide-react'

type EventFormProps = {
    organizerId: string
    categories: Category[]
    tags: Tag[]
    event?: Event & { categories: Category[]; tags: Tag[] }
}

export function EventForm({ organizerId, categories, tags, event }: EventFormProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [availableTags, setAvailableTags] = useState<Tag[]>(tags)
    const [newTagName, setNewTagName] = useState('')
    const [newTagColor, setNewTagColor] = useState('#3b82f6')
    const [isCreatingTag, setIsCreatingTag] = useState(false)

    const [formData, setFormData] = useState({
        title: event?.title ?? '',
        slug: event?.slug ?? '',
        shortDescription: event?.shortDescription ?? '',
        longDescription: event?.longDescription ?? '',
        eventType: event?.eventType ?? 'SINGLE' as EventType,
        startDateTime: event?.startDateTime ? event.startDateTime.toISOString().slice(0, 16) : '',
        endDateTime: event?.endDateTime ? event.endDateTime.toISOString().slice(0, 16) : '',
        timezone: event?.timezone ?? 'Europe/Oslo',
        locationName: event?.locationName ?? '',
        locationAddress: event?.locationAddress ?? '',
        city: event?.city ?? '',
        salesOpenAt: event?.salesOpenAt ? event.salesOpenAt.toISOString().slice(0, 16) : '',
        salesCloseAt: event?.salesCloseAt ? event.salesCloseAt.toISOString().slice(0, 16) : '',
        capacityTotal: event?.capacityTotal ?? 100,
        basePriceCents: event?.basePriceCents ?? 0,
        memberPriceCents: event?.memberPriceCents ?? 0,
        memberPriceType: (event?.memberPriceCents && event.memberPriceCents > 0) ? 'fixed' : 'discount',
        imageUrl: event?.imageUrl ?? '',
        metaTitle: event?.metaTitle ?? '',
        metaDescription: event?.metaDescription ?? '',
        categoryIds: event?.categories.map(c => c.id) ?? [],
        tagIds: event?.tags.map(t => t.id) ?? [],
        recurrenceRule: event?.recurrenceRule ?? '',
        recurringUntil: event?.recurringUntil ? event.recurringUntil.toISOString().slice(0, 10) : '',
        featured: event?.featured ?? false,
    })

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        
        // Auto-generate slug from title
        if (field === 'title' && !event) {
            const slug = value
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '')
            setFormData(prev => ({ ...prev, slug }))
        }
    }

    const handleCreateTag = async () => {
        if (!newTagName.trim()) {
            toast.error('Tag name is required')
            return
        }

        setIsCreatingTag(true)
        try {
            const tagFormData = new FormData()
            tagFormData.append('organizerId', organizerId)
            tagFormData.append('name', newTagName.trim())
            tagFormData.append('slug', newTagName.trim().toLowerCase().replace(/\s+/g, '-'))
            tagFormData.append('color', newTagColor)
            
            const result = await createTag(tagFormData)

            if (result.success && result.tag) {
                setAvailableTags(prev => [...prev, result.tag!])
                handleChange('tagIds', [...formData.tagIds, result.tag!.id])
                setNewTagName('')
                setNewTagColor('#3b82f6')
                toast.success('Tag created and added')
            } else {
                toast.error(result.error || 'Failed to create tag')
            }
        } catch (error) {
            toast.error('An unexpected error occurred')
            console.error(error)
        } finally {
            setIsCreatingTag(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        startTransition(async () => {
            try {
                // Build FormData for the action
                const eventFormData = new FormData()
                
                // Add all form fields
                if (!event) {
                    eventFormData.append('organizerId', organizerId)
                }
                eventFormData.append('title', formData.title)
                eventFormData.append('slug', formData.slug)
                if (formData.shortDescription) eventFormData.append('shortDescription', formData.shortDescription)
                if (formData.longDescription) eventFormData.append('longDescription', formData.longDescription)
                eventFormData.append('eventType', formData.eventType)
                eventFormData.append('startDateTime', formData.startDateTime)
                if (formData.endDateTime) eventFormData.append('endDateTime', formData.endDateTime)
                eventFormData.append('timezone', formData.timezone)
                if (formData.locationName) eventFormData.append('locationName', formData.locationName)
                if (formData.locationAddress) eventFormData.append('locationAddress', formData.locationAddress)
                if (formData.city) eventFormData.append('city', formData.city)
                if (formData.salesOpenAt) eventFormData.append('salesOpenAt', formData.salesOpenAt)
                if (formData.salesCloseAt) eventFormData.append('salesCloseAt', formData.salesCloseAt)
                eventFormData.append('capacityTotal', String(formData.capacityTotal))
                eventFormData.append('basePriceCents', String(formData.basePriceCents))
                if (formData.memberPriceCents) eventFormData.append('memberPriceCents', String(formData.memberPriceCents))
                if (formData.imageUrl) eventFormData.append('imageUrl', formData.imageUrl)
                if (formData.recurrenceRule) eventFormData.append('recurrenceRule', formData.recurrenceRule)
                if (formData.recurringUntil) eventFormData.append('recurringUntil', formData.recurringUntil)
                
                // Add array fields
                formData.categoryIds.forEach(id => eventFormData.append('categoryIds', id))
                formData.tagIds.forEach(id => eventFormData.append('tagIds', id))
                
                if (event) {
                    const result = await updateEvent(event.id, eventFormData)
                    if (result.success) {
                        toast.success('Event updated successfully')
                        router.push('/staffadmin/events')
                        router.refresh()
                    } else {
                        toast.error(result.error || 'Failed to update event')
                    }
                } else {
                    const result = await createEvent(eventFormData)
                    if (result.success) {
                        toast.success('Event created successfully')
                        router.push('/staffadmin/events')
                        router.refresh()
                    } else {
                        toast.error(result.error || 'Failed to create event')
                    }
                }
            } catch (error) {
                toast.error('An unexpected error occurred')
                console.error(error)
            }
        })
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Info */}
            <div className="space-y-5">
                <div>
                    <Label htmlFor="title" className="mb-2 block">Title *</Label>
                    <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => handleChange('title', e.target.value)}
                        required
                    />
                </div>

                <div>
                    <Label htmlFor="slug" className="mb-2 block">Slug *</Label>
                    <Input
                        id="slug"
                        value={formData.slug}
                        onChange={(e) => handleChange('slug', e.target.value)}
                        required
                        pattern="[a-z0-9-]+"
                    />
                    <p className="text-sm text-rn-text-muted mt-1">URL-friendly identifier</p>
                </div>

                <div>
                    <Label htmlFor="shortDescription" className="mb-2 block">Short Description *</Label>
                    <Textarea
                        id="shortDescription"
                        value={formData.shortDescription}
                        onChange={(e) => handleChange('shortDescription', e.target.value)}
                        rows={2}
                        required
                    />
                </div>

                <div>
                    <Label htmlFor="longDescription" className="mb-2 block">Long Description</Label>
                    <Textarea
                        id="longDescription"
                        value={formData.longDescription}
                        onChange={(e) => handleChange('longDescription', e.target.value)}
                        rows={6}
                    />
                </div>
            </div>

            {/* Event Type & Dates */}
            <div className="space-y-5">
                <div>
                    <Label htmlFor="eventType" className="mb-2 block">Event Type *</Label>
                    <select
                        id="eventType"
                        value={formData.eventType}
                        onChange={(e) => handleChange('eventType', e.target.value as EventType)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                        required
                    >
                        <option value="SINGLE">Single Event</option>
                        <option value="RECURRING">Recurring Event</option>
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="startDateTime" className="mb-2 block">Start Date & Time *</Label>
                        <Input
                            id="startDateTime"
                            type="datetime-local"
                            value={formData.startDateTime}
                            onChange={(e) => handleChange('startDateTime', e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <Label htmlFor="endDateTime" className="mb-2 block">End Date & Time</Label>
                        <Input
                            id="endDateTime"
                            type="datetime-local"
                            value={formData.endDateTime}
                            onChange={(e) => handleChange('endDateTime', e.target.value)}
                        />
                    </div>
                </div>

                {formData.eventType === 'RECURRING' && (
                    <>
                        <div>
                            <Label htmlFor="recurrenceRule" className="mb-2 block">Recurrence Rule (iCal RRULE)</Label>
                            <Input
                                id="recurrenceRule"
                                value={formData.recurrenceRule}
                                onChange={(e) => handleChange('recurrenceRule', e.target.value)}
                                placeholder="FREQ=WEEKLY;BYDAY=MO,WE,FR"
                            />
                            <p className="text-sm text-rn-text-muted mt-1">Example: FREQ=WEEKLY;BYDAY=MO,WE</p>
                        </div>
                        <div>
                            <Label htmlFor="recurringUntil" className="mb-2 block">Recurring Until</Label>
                            <Input
                                id="recurringUntil"
                                type="date"
                                value={formData.recurringUntil}
                                onChange={(e) => handleChange('recurringUntil', e.target.value)}
                            />
                        </div>
                    </>
                )}
            </div>

            {/* Location */}
            <div className="space-y-5">
                <div>
                    <Label htmlFor="locationName" className="mb-2 block">Location Name *</Label>
                    <Input
                        id="locationName"
                        value={formData.locationName}
                        onChange={(e) => handleChange('locationName', e.target.value)}
                        required
                    />
                </div>
                <div>
                    <Label htmlFor="locationAddress" className="mb-2 block">Address</Label>
                    <Input
                        id="locationAddress"
                        value={formData.locationAddress}
                        onChange={(e) => handleChange('locationAddress', e.target.value)}
                    />
                </div>
                <div>
                    <Label htmlFor="city" className="mb-2 block">City *</Label>
                    <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => handleChange('city', e.target.value)}
                        required
                    />
                </div>
            </div>

            {/* Sales & Capacity */}
            <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="salesOpenAt" className="mb-2 block">Sales Open</Label>
                        <Input
                            id="salesOpenAt"
                            type="datetime-local"
                            value={formData.salesOpenAt}
                            onChange={(e) => handleChange('salesOpenAt', e.target.value)}
                        />
                    </div>
                    <div>
                        <Label htmlFor="salesCloseAt" className="mb-2 block">Sales Close</Label>
                        <Input
                            id="salesCloseAt"
                            type="datetime-local"
                            value={formData.salesCloseAt}
                            onChange={(e) => handleChange('salesCloseAt', e.target.value)}
                        />
                    </div>
                </div>

                <div>
                    <Label htmlFor="capacityTotal" className="mb-2 block">Capacity *</Label>
                    <Input
                        id="capacityTotal"
                        type="number"
                        min="1"
                        value={formData.capacityTotal}
                        onChange={(e) => handleChange('capacityTotal', parseInt(e.target.value))}
                        required
                    />
                </div>

                <div>
                    <Label htmlFor="basePriceCents" className="mb-2 block">Base Price (NOK) *</Label>
                    <Input
                        id="basePriceCents"
                        type="number"
                        min="0"
                        step="0.01"
                        value={(formData.basePriceCents / 100).toFixed(2)}
                        onChange={(e) => handleChange('basePriceCents', Math.round(parseFloat(e.target.value) * 100))}
                        required
                    />
                </div>

                <div>
                    <Label className="mb-3 block">Member Pricing</Label>
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="memberPriceType"
                                value="discount"
                                checked={formData.memberPriceType === 'discount'}
                                onChange={(e) => {
                                    handleChange('memberPriceType', e.target.value)
                                    handleChange('memberPriceCents', 0)
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
                                checked={formData.memberPriceType === 'fixed'}
                                onChange={(e) => handleChange('memberPriceType', e.target.value)}
                                className="h-4 w-4"
                            />
                            <span className="text-sm">Set fixed member price</span>
                        </label>
                        
                        {formData.memberPriceType === 'fixed' && (
                            <div className="ml-6">
                                <Label htmlFor="memberPriceCents" className="mb-2 block">Member Price (NOK)</Label>
                                <Input
                                    id="memberPriceCents"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={(formData.memberPriceCents / 100).toFixed(2)}
                                    onChange={(e) => handleChange('memberPriceCents', Math.round(parseFloat(e.target.value) * 100))}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Categories & Tags */}
            <div className="space-y-5">
                <div>
                    <Label className="mb-3 block">Categories</Label>
                    <div className="flex flex-wrap gap-2">
                        {categories.map(cat => (
                            <label key={cat.id} className="flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer hover:bg-accent">
                                <input
                                    type="checkbox"
                                    checked={formData.categoryIds.includes(cat.id)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            handleChange('categoryIds', [...formData.categoryIds, cat.id])
                                        } else {
                                            handleChange('categoryIds', formData.categoryIds.filter(id => id !== cat.id))
                                        }
                                    }}
                                />
                                <span>{cat.icon} {cat.name}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div>
                    <Label className="mb-3 block">Tags</Label>
                    
                    {/* Existing Tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        {availableTags.map(tag => (
                            <label key={tag.id} className="flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer hover:bg-accent">
                                <input
                                    type="checkbox"
                                    checked={formData.tagIds.includes(tag.id)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            handleChange('tagIds', [...formData.tagIds, tag.id])
                                        } else {
                                            handleChange('tagIds', formData.tagIds.filter(id => id !== tag.id))
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

                    {/* Create New Tag */}
                    <div className="border rounded-lg p-4 bg-accent/50">
                        <div className="text-sm font-medium mb-3 flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Create New Tag
                        </div>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Tag name"
                                value={newTagName}
                                onChange={(e) => setNewTagName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        handleCreateTag()
                                    }
                                }}
                                className="flex-1"
                            />
                            <input
                                type="color"
                                value={newTagColor}
                                onChange={(e) => setNewTagColor(e.target.value)}
                                className="w-16 h-10 rounded border cursor-pointer"
                            />
                            <Button
                                type="button"
                                onClick={handleCreateTag}
                                disabled={isCreatingTag || !newTagName.trim()}
                                size="sm"
                            >
                                {isCreatingTag ? 'Creating...' : 'Add'}
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <input
                        id="featured"
                        type="checkbox"
                        checked={formData.featured}
                        onChange={(e) => handleChange('featured', e.target.checked)}
                        className="h-4 w-4"
                    />
                    <Label htmlFor="featured" className="cursor-pointer">
                        Featured Event (shown prominently on public pages)
                    </Label>
                </div>
            </div>

            {/* Media & SEO */}
            <div className="space-y-5">
                <div>
                    <Label htmlFor="imageUrl" className="mb-2 block">Image URL</Label>
                    <Input
                        id="imageUrl"
                        type="url"
                        value={formData.imageUrl}
                        onChange={(e) => handleChange('imageUrl', e.target.value)}
                    />
                </div>

                <div>
                    <Label htmlFor="metaTitle" className="mb-2 block">Meta Title (SEO)</Label>
                    <Input
                        id="metaTitle"
                        value={formData.metaTitle}
                        onChange={(e) => handleChange('metaTitle', e.target.value)}
                    />
                </div>

                <div>
                    <Label htmlFor="metaDescription" className="mb-2 block">Meta Description (SEO)</Label>
                    <Textarea
                        id="metaDescription"
                        value={formData.metaDescription}
                        onChange={(e) => handleChange('metaDescription', e.target.value)}
                        rows={2}
                    />
                </div>
            </div>

            <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={isPending}>
                    {isPending ? 'Saving...' : event ? 'Update Event' : 'Create Event'}
                </Button>
                <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => router.back()}
                    disabled={isPending}
                >
                    Cancel
                </Button>
            </div>
        </form>
    )
}
