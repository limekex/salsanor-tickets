'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Mail, CheckCircle2, AlertCircle } from 'lucide-react'

interface NotifyLowAttendanceButtonProps {
    trackId: string
    lowCount: number
}

export function NotifyLowAttendanceButton({ trackId, lowCount }: NotifyLowAttendanceButtonProps) {
    const [isPending, startTransition] = useTransition()
    const [result, setResult] = useState<{ sent: number; failed: number } | null>(null)
    const [error, setError] = useState<string | null>(null)

    function handleNotify() {
        setResult(null)
        setError(null)
        startTransition(async () => {
            try {
                const res = await fetch(`/api/staffadmin/tracks/${trackId}/notify-low-attendance`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ threshold: 0.75 }),
                })
                const data = await res.json()
                if (!res.ok) {
                    setError(data.error ?? 'Failed to send notifications')
                } else {
                    setResult({ sent: data.sent, failed: data.failed })
                }
            } catch (e) {
                setError('Network error')
            }
        })
    }

    if (result) {
        return (
            <span className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {result.sent} sent{result.failed > 0 ? `, ${result.failed} failed` : ''}
            </span>
        )
    }

    if (error) {
        return (
            <span className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5" />
                {error}
            </span>
        )
    }

    return (
        <Button
            size="sm"
            variant="outline"
            className="h-6 text-xs px-2 gap-1"
            onClick={handleNotify}
            disabled={isPending}
        >
            <Mail className="h-3 w-3" />
            {isPending ? 'Sending…' : `Notify ${lowCount}`}
        </Button>
    )
}
