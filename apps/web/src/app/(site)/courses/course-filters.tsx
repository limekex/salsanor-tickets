'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { X, SlidersHorizontal } from 'lucide-react'
import type { Category, Tag } from '@prisma/client'

interface CourseFiltersProps {
    organizers: Array<{
        id: string
        name: string
        slug: string
    }>
    availableLevels: string[]
    categories: Category[]
    tags: Tag[]
    currentFilters: {
        org: string
        level: string
        weekday: string
        timeAfter: string
        timeBefore: string
        category: string
        tag: string
    }
}

const WEEKDAYS = [
    { value: '1', label: 'Monday' },
    { value: '2', label: 'Tuesday' },
    { value: '3', label: 'Wednesday' },
    { value: '4', label: 'Thursday' },
    { value: '5', label: 'Friday' },
    { value: '6', label: 'Saturday' },
    { value: '7', label: 'Sunday' },
]

const TIME_RANGES = [
    { value: 'all', label: 'Any Time' },
    { value: 'morning', label: 'Morning (8-12)', after: '08:00', before: '12:00' },
    { value: 'afternoon', label: 'Afternoon (12-17)', after: '12:00', before: '17:00' },
    { value: 'evening', label: 'Evening (17-21)', after: '17:00', before: '21:00' },
    { value: 'night', label: 'Night (21-24)', after: '21:00', before: '23:59' },
]

export function CourseFilters({ organizers, availableLevels, categories, tags, currentFilters }: CourseFiltersProps) {
    const router = useRouter()
    
    // Determine initial time range based on current filters
    const getInitialTimeRange = () => {
        const range = TIME_RANGES.find(
            r => r.after === currentFilters.timeAfter && r.before === currentFilters.timeBefore
        )
        return range?.value || 'all'
    }
    
    const [filters, setFilters] = useState({
        org: currentFilters.org,
        level: currentFilters.level,
        weekday: currentFilters.weekday,
        timeRange: getInitialTimeRange(),
        category: currentFilters.category,
        tag: currentFilters.tag,
    })

    const updateFilter = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }))
    }

    const applyFilters = () => {
        const params = new URLSearchParams()
        
        if (filters.org && filters.org !== 'all') {
            params.set('org', filters.org)
        }
        if (filters.level && filters.level !== 'all') {
            params.set('level', filters.level)
        }
        if (filters.weekday && filters.weekday !== 'all') {
            params.set('weekday', filters.weekday)
        }
        if (filters.category && filters.category !== 'all') {
            params.set('category', filters.category)
        }
        if (filters.tag && filters.tag !== 'all') {
            params.set('tag', filters.tag)
        }
        
        // Convert time range to timeAfter/timeBefore
        const selectedRange = TIME_RANGES.find(r => r.value === filters.timeRange)
        if (selectedRange && selectedRange.after) {
            params.set('timeAfter', selectedRange.after)
            params.set('timeBefore', selectedRange.before!)
        }

        router.push(`/courses?${params.toString()}`)
    }

    const clearFilters = () => {
        setFilters({
            org: 'all',
            level: 'all',
            weekday: 'all',
            timeRange: 'all',
            category: 'all',
            tag: 'all',
        })
        router.push('/courses')
    }

    const hasActiveFilters = filters.org !== 'all' || 
                            filters.level !== 'all' || 
                            filters.weekday !== 'all' ||
                            filters.timeRange !== 'all' ||
                            filters.category !== 'all' ||
                            filters.tag !== 'all'

    return (
        <Card className="border-rn-border">
            <CardContent className="pt-rn-6">
                <div className="space-y-rn-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-rn-2">
                            <SlidersHorizontal className="h-5 w-5 text-rn-text-muted" />
                            <h3 className="rn-h4">Filter Courses</h3>
                        </div>
                        {hasActiveFilters && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={clearFilters}
                                className="gap-rn-2 text-rn-text-muted hover:text-rn-text"
                            >
                                <X className="h-4 w-4" />
                                Clear all
                            </Button>
                        )}
                    </div>

                    <div className="grid gap-rn-4 sm:grid-cols-2 lg:grid-cols-4">
                        {/* Organizer Filter */}
                        {organizers.length > 1 && (
                            <div className="space-y-rn-2">
                                <label className="rn-meta font-medium">Organizer</label>
                                <Select 
                                    value={filters.org} 
                                    onValueChange={(value: string) => updateFilter('org', value)}
                                >
                                    <SelectTrigger className="h-10">
                                        <SelectValue placeholder="All Organizers" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Organizers</SelectItem>
                                        {organizers.map((organizer) => (
                                            <SelectItem key={organizer.id} value={organizer.id}>
                                                {organizer.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Level Filter */}
                        <div className="space-y-rn-2">
                            <label className="rn-meta font-medium">Level</label>
                            <Select 
                                value={filters.level} 
                                onValueChange={(value: string) => updateFilter('level', value)}
                            >
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder="All Levels" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Levels</SelectItem>
                                    {availableLevels.map((level) => (
                                        <SelectItem key={level} value={level}>
                                            {level}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Weekday Filter */}
                        <div className="space-y-rn-2">
                            <label className="rn-meta font-medium">Day of Week</label>
                            <Select 
                                value={filters.weekday} 
                                onValueChange={(value: string) => updateFilter('weekday', value)}
                            >
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Any Day" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Any Day</SelectItem>
                                    {WEEKDAYS.map((day) => (
                                        <SelectItem key={day.value} value={day.value}>
                                            {day.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Category Filter */}
                        <div className="space-y-rn-2">
                            <label className="rn-meta font-medium">Category</label>
                            <Select 
                                value={filters.category} 
                                onValueChange={(value: string) => updateFilter('category', value)}
                            >
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder="All Categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id}>
                                            {cat.icon} {cat.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Tag Filter */}
                        <div className="space-y-rn-2">
                            <label className="rn-meta font-medium">Tag</label>
                            <Select 
                                value={filters.tag} 
                                onValueChange={(value: string) => updateFilter('tag', value)}
                            >
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder="All Tags" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Tags</SelectItem>
                                    {tags.map((tag) => (
                                        <SelectItem key={tag.id} value={tag.id}>
                                            <div className="flex items-center gap-2">
                                                <span 
                                                    className="inline-block w-3 h-3 rounded" 
                                                    style={{ backgroundColor: tag.color ?? undefined }}
                                                />
                                                {tag.name}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Time Range Filter */}
                        <div className="space-y-rn-2">
                            <label className="rn-meta font-medium">Time of Day</label>
                            <Select 
                                value={filters.timeRange} 
                                onValueChange={(value: string) => updateFilter('timeRange', value)}
                            >
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Any Time" />
                                </SelectTrigger>
                                <SelectContent>
                                    {TIME_RANGES.map((range) => (
                                        <SelectItem key={range.value} value={range.value}>
                                            {range.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Apply Button */}
                    <div className="flex justify-end pt-rn-2">
                        <Button 
                            onClick={applyFilters} 
                            size="lg"
                            className="w-full sm:w-auto min-w-[200px]"
                        >
                            Apply Filters
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
