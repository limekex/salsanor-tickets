'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { X } from 'lucide-react'

interface CourseFiltersProps {
    organizers: Array<{
        id: string
        name: string
        slug: string
    }>
    availableLevels: string[]
    currentFilters: {
        org?: string
        level?: string
        weekday?: string
        timeAfter?: string
        timeBefore?: string
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

const TIME_OPTIONS = [
    { value: '16:00', label: '4:00 PM' },
    { value: '17:00', label: '5:00 PM' },
    { value: '18:00', label: '6:00 PM' },
    { value: '19:00', label: '7:00 PM' },
    { value: '20:00', label: '8:00 PM' },
    { value: '21:00', label: '9:00 PM' },
    { value: '22:00', label: '10:00 PM' },
]

export function CourseFilters({ organizers, availableLevels, currentFilters }: CourseFiltersProps) {
    const router = useRouter()
    
    const [filters, setFilters] = useState({
        org: currentFilters.org || 'all',
        level: currentFilters.level || 'all',
        weekday: currentFilters.weekday || 'all',
        timeAfter: currentFilters.timeAfter || '',
        timeBefore: currentFilters.timeBefore || '',
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
        if (filters.timeAfter) {
            params.set('timeAfter', filters.timeAfter)
        }
        if (filters.timeBefore) {
            params.set('timeBefore', filters.timeBefore)
        }

        router.push(`/courses?${params.toString()}`)
    }

    const clearFilters = () => {
        setFilters({
            org: 'all',
            level: 'all',
            weekday: 'all',
            timeAfter: '',
            timeBefore: '',
        })
        router.push('/courses')
    }

    const hasActiveFilters = filters.org !== 'all' || 
                            filters.level !== 'all' || 
                            filters.weekday !== 'all' ||
                            filters.timeAfter !== '' ||
                            filters.timeBefore !== ''

    return (
        <div className="space-y-4 bg-muted/30 p-6 rounded-lg">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Filter Courses</h3>
                {hasActiveFilters && (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={clearFilters}
                        className="gap-2"
                    >
                        <X className="h-4 w-4" />
                        Clear all
                    </Button>
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Organizer Filter */}
                {organizers.length > 1 && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Organizer</label>
                        <Select 
                            value={filters.org} 
                            onValueChange={(value: string) => updateFilter('org', value)}
                        >
                            <SelectTrigger>
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
                <div className="space-y-2">
                    <label className="text-sm font-medium">Level</label>
                    <Select 
                        value={filters.level} 
                        onValueChange={(value: string) => updateFilter('level', value)}
                    >
                        <SelectTrigger>
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
                <div className="space-y-2">
                    <label className="text-sm font-medium">Day of Week</label>
                    <Select 
                        value={filters.weekday} 
                        onValueChange={(value: string) => updateFilter('weekday', value)}
                    >
                        <SelectTrigger>
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

                {/* Time After Filter */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Starts After</label>
                    <Select 
                        value={filters.timeAfter} 
                        onValueChange={(value: string) => updateFilter('timeAfter', value)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Any Time" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">Any Time</SelectItem>
                            {TIME_OPTIONS.map((time) => (
                                <SelectItem key={time.value} value={time.value}>
                                    {time.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Time Before Filter */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Starts Before</label>
                    <Select 
                        value={filters.timeBefore} 
                        onValueChange={(value: string) => updateFilter('timeBefore', value)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Any Time" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">Any Time</SelectItem>
                            {TIME_OPTIONS.map((time) => (
                                <SelectItem key={time.value} value={time.value}>
                                    {time.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Apply Button */}
                <div className="space-y-2 flex items-end">
                    <Button 
                        onClick={applyFilters} 
                        className="w-full"
                    >
                        Apply Filters
                    </Button>
                </div>
            </div>
        </div>
    )
}
