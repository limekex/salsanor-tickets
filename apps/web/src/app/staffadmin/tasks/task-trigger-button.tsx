'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Loader2, CheckCircle2 } from 'lucide-react'
import { triggerTaskRun } from '@/app/actions/scheduled-tasks'

interface TaskTriggerButtonProps {
    taskId: string
    disabled?: boolean
}

export function TaskTriggerButton({ taskId, disabled }: TaskTriggerButtonProps) {
    const [isPending, startTransition] = useTransition()
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)

    function handleTrigger() {
        setError(null)
        setSuccess(false)
        startTransition(async () => {
            const result = await triggerTaskRun(taskId)
            if (result.success) {
                setSuccess(true)
                setTimeout(() => setSuccess(false), 3000)
            } else {
                setError(result.error || 'Failed to trigger task')
            }
        })
    }

    if (success) {
        return (
            <span className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Task triggered
            </span>
        )
    }

    return (
        <div className="flex flex-col items-end gap-1">
            <Button
                size="sm"
                variant="outline"
                onClick={handleTrigger}
                disabled={disabled || isPending}
                className="gap-1 text-xs"
            >
                {isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                    <Play className="h-3 w-3" />
                )}
                Run Now
            </Button>
            {error && <span className="text-xs text-destructive">{error}</span>}
        </div>
    )
}
