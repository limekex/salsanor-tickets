'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { DownloadIcon, CalendarIcon, RefreshCw } from 'lucide-react'
import { syncAllMissingStripeFees } from '@/app/actions/sync-stripe-fees'

type DatePreset = 'all' | 'last-year' | 'current-year' | 'last-month' | 'current-month' | 'custom'

interface ExportFormProps {
    organizerId: string
}

function getDateRange(preset: DatePreset): { startDate: string | null; endDate: string | null } {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()
    
    switch (preset) {
        case 'all':
            return { startDate: null, endDate: null }
        
        case 'last-year':
            return {
                startDate: `${currentYear - 1}-01-01`,
                endDate: `${currentYear - 1}-12-31`
            }
        
        case 'current-year':
            return {
                startDate: `${currentYear}-01-01`,
                endDate: now.toISOString().split('T')[0]
            }
        
        case 'last-month': {
            const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
            const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear
            const lastDayOfLastMonth = new Date(lastMonthYear, lastMonth + 1, 0).getDate()
            return {
                startDate: `${lastMonthYear}-${String(lastMonth + 1).padStart(2, '0')}-01`,
                endDate: `${lastMonthYear}-${String(lastMonth + 1).padStart(2, '0')}-${lastDayOfLastMonth}`
            }
        }
        
        case 'current-month':
            return {
                startDate: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`,
                endDate: now.toISOString().split('T')[0]
            }
        
        case 'custom':
            return { startDate: null, endDate: null }
        
        default:
            return { startDate: null, endDate: null }
    }
}

export function ExportForm({ organizerId }: ExportFormProps) {
    const [preset, setPreset] = useState<DatePreset>('all')
    const [customStartDate, setCustomStartDate] = useState('')
    const [customEndDate, setCustomEndDate] = useState('')
    
    const handleDownload = () => {
        let startDate: string | null = null
        let endDate: string | null = null
        
        if (preset === 'custom') {
            startDate = customStartDate || null
            endDate = customEndDate || null
        } else {
            const range = getDateRange(preset)
            startDate = range.startDate
            endDate = range.endDate
        }
        
        // Build URL with query parameters
        const params = new URLSearchParams()
        params.set('organizerId', organizerId)
        if (startDate) params.set('startDate', startDate)
        if (endDate) params.set('endDate', endDate)
        
        window.location.href = `/api/staffadmin/export/finance?${params.toString()}`
    }
    
    const presetOptions: { value: DatePreset; label: string }[] = [
        { value: 'all', label: 'All Time' },
        { value: 'last-year', label: 'Last Year' },
        { value: 'current-year', label: 'Current Year to Date' },
        { value: 'last-month', label: 'Last Month' },
        { value: 'current-month', label: 'Current Month to Date' },
        { value: 'custom', label: 'Custom Date Range' },
    ]
    
    return (
        <div className="space-y-rn-4">
            <div className="space-y-rn-3">
                <Label className="text-sm font-medium">Date Range</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-rn-2">
                    {presetOptions.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => setPreset(option.value)}
                            className={`px-rn-3 py-rn-2 text-sm rounded-lg border transition-colors ${
                                preset === option.value
                                    ? 'bg-rn-primary text-white border-rn-primary'
                                    : 'bg-rn-surface border-rn-border hover:bg-rn-surface-hover text-rn-text'
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>
            
            {preset === 'custom' && (
                <div className="flex flex-col sm:flex-row gap-rn-4 p-rn-4 bg-rn-surface-raised rounded-lg border border-rn-border">
                    <div className="flex-1 space-y-rn-2">
                        <Label htmlFor="startDate" className="text-sm">Start Date</Label>
                        <div className="relative">
                            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-rn-text-muted" />
                            <input
                                type="date"
                                id="startDate"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="w-full pl-10 pr-3 py-2 rounded-lg border border-rn-border bg-rn-surface text-sm focus:outline-none focus:ring-2 focus:ring-rn-primary"
                            />
                        </div>
                    </div>
                    <div className="flex-1 space-y-rn-2">
                        <Label htmlFor="endDate" className="text-sm">End Date</Label>
                        <div className="relative">
                            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-rn-text-muted" />
                            <input
                                type="date"
                                id="endDate"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="w-full pl-10 pr-3 py-2 rounded-lg border border-rn-border bg-rn-surface text-sm focus:outline-none focus:ring-2 focus:ring-rn-primary"
                            />
                        </div>
                    </div>
                </div>
            )}
            
            <div className="pt-rn-4 border-t border-rn-border space-y-rn-3">
                <SyncFeesButton organizerId={organizerId} />
                <Button onClick={handleDownload} size="lg" className="w-full">
                    <DownloadIcon className="mr-2 h-4 w-4" />
                    Download CSV Export
                </Button>
            </div>
        </div>
    )
}

function SyncFeesButton({ organizerId }: { organizerId: string }) {
    const [syncing, setSyncing] = useState(false)
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

    const handleSync = async () => {
        setSyncing(true)
        setResult(null)
        
        try {
            const response = await syncAllMissingStripeFees(organizerId)
            setResult({
                success: response.success,
                message: response.message + (response.failed > 0 ? ` (${response.failed} failed)` : '')
            })
        } catch (err: any) {
            setResult({ success: false, message: `Error: ${err.message}` })
        } finally {
            setSyncing(false)
        }
    }

    return (
        <div className="space-y-rn-2">
            <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSync}
                disabled={syncing}
                className="w-full"
            >
                <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing Stripe Fees...' : 'Sync All Stripe Fees'}
            </Button>
            {result && (
                <p className={`text-xs ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                    {result.message}
                </p>
            )}
            <p className="text-xs text-rn-text-muted">
                Fetches missing fee data from Stripe for accurate exports
            </p>
        </div>
    )
}
