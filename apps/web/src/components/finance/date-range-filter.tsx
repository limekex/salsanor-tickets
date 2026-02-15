'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, subYears, startOfDay, endOfDay, format } from 'date-fns'
import { useState, useCallback } from 'react'

type DateRange = {
    from: Date | undefined
    to: Date | undefined
}

type PresetKey = 'today' | 'this-week' | 'this-month' | 'this-year' | 'last-year' | 'all-time' | 'custom'

const presets: { key: PresetKey; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'this-week', label: 'This Week' },
    { key: 'this-month', label: 'This Month' },
    { key: 'this-year', label: 'Year to Date' },
    { key: 'last-year', label: 'Last Year' },
    { key: 'all-time', label: 'All Time' },
]

function getPresetDates(key: PresetKey): DateRange {
    const now = new Date()
    
    switch (key) {
        case 'today':
            return { from: startOfDay(now), to: endOfDay(now) }
        case 'this-week':
            return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) }
        case 'this-month':
            return { from: startOfMonth(now), to: endOfMonth(now) }
        case 'this-year':
            return { from: startOfYear(now), to: now }
        case 'last-year':
            const lastYear = subYears(now, 1)
            return { from: startOfYear(lastYear), to: new Date(lastYear.getFullYear(), 11, 31, 23, 59, 59) }
        case 'all-time':
            return { from: undefined, to: undefined }
        default:
            return { from: undefined, to: undefined }
    }
}

export function DateRangeFilter() {
    const pathname = usePathname()
    const router = useRouter()
    const searchParams = useSearchParams()
    
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')
    const presetParam = searchParams.get('preset') as PresetKey | null
    
    const [dateRange, setDateRange] = useState<DateRange>({
        from: fromParam ? new Date(fromParam) : undefined,
        to: toParam ? new Date(toParam) : undefined
    })
    const [activePreset, setActivePreset] = useState<PresetKey>(presetParam || 'all-time')
    const [showCustom, setShowCustom] = useState(presetParam === 'custom')

    const applyFilter = useCallback((range: DateRange, preset: PresetKey) => {
        const params = new URLSearchParams(searchParams.toString())
        
        if (range.from) {
            params.set('from', range.from.toISOString())
        } else {
            params.delete('from')
        }
        
        if (range.to) {
            params.set('to', range.to.toISOString())
        } else {
            params.delete('to')
        }
        
        params.set('preset', preset)
        
        router.push(`${pathname}?${params.toString()}`)
    }, [pathname, router, searchParams])

    const handlePresetClick = (key: PresetKey) => {
        const range = getPresetDates(key)
        setDateRange(range)
        setActivePreset(key)
        setShowCustom(false)
        applyFilter(range, key)
    }

    const handleCustomDateChange = (field: 'from' | 'to', value: string) => {
        const newRange = { ...dateRange }
        newRange[field] = value ? new Date(value) : undefined
        setDateRange(newRange)
    }

    const handleApplyCustom = () => {
        setActivePreset('custom')
        applyFilter(dateRange, 'custom')
    }

    return (
        <div className="space-y-3">
            {/* Preset Buttons */}
            <div className="flex gap-1 flex-wrap">
                {presets.map(preset => (
                    <Button
                        key={preset.key}
                        variant={activePreset === preset.key ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePresetClick(preset.key)}
                    >
                        {preset.label}
                    </Button>
                ))}
                <Button
                    variant={showCustom ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setShowCustom(!showCustom)}
                >
                    Custom...
                </Button>
            </div>

            {/* Custom Date Range */}
            {showCustom && (
                <div className="flex items-end gap-3 p-3 border rounded-lg bg-rn-surface">
                    <div className="space-y-1">
                        <Label htmlFor="from-date" className="text-xs">From Date</Label>
                        <Input
                            id="from-date"
                            type="date"
                            value={dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : ''}
                            onChange={(e) => handleCustomDateChange('from', e.target.value)}
                            className="w-40"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="to-date" className="text-xs">To Date</Label>
                        <Input
                            id="to-date"
                            type="date"
                            value={dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : ''}
                            onChange={(e) => handleCustomDateChange('to', e.target.value)}
                            className="w-40"
                        />
                    </div>
                    <Button size="sm" onClick={handleApplyCustom}>
                        Apply
                    </Button>
                </div>
            )}
        </div>
    )
}
