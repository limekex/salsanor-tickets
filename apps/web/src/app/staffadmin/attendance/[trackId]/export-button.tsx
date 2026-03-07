'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'

interface AttendanceExportButtonProps {
    trackId: string
    trackTitle: string
    periodName: string
}

export function AttendanceExportButton({ trackId, trackTitle, periodName }: AttendanceExportButtonProps) {
    const [isExporting, setIsExporting] = useState(false)

    async function handleExport() {
        setIsExporting(true)
        try {
            const res = await fetch(`/api/attendance/export?trackId=${trackId}`)
            if (!res.ok) throw new Error('Export failed')
            
            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `attendance-${trackTitle.replace(/\s+/g, '-').toLowerCase()}-${periodName.replace(/\s+/g, '-').toLowerCase()}.csv`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        } catch (e) {
            console.error('Export failed:', e)
            alert('Failed to export attendance data')
        } finally {
            setIsExporting(false)
        }
    }

    return (
        <Button onClick={handleExport} disabled={isExporting} variant="outline">
            {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
                <Download className="h-4 w-4 mr-2" />
            )}
            Export CSV
        </Button>
    )
}
