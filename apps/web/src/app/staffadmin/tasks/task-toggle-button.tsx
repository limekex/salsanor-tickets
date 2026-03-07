'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Pause, Loader2 } from 'lucide-react'
import { toggleScheduledTask } from '@/app/actions/scheduled-tasks'

interface TaskToggleButtonProps {
    taskId: string
    isActive: boolean
}

export function TaskToggleButton({ taskId, isActive }: TaskToggleButtonProps) {
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    function handleToggle() {
        setError(null)
        startTransition(async () => {
            const result = await toggleScheduledTask(taskId)
            if (!result.success) {
                setError(result.error || 'Failed to toggle task')
            }
        })
    }

    return (
        <div className="flex flex-col items-end gap-1">
            <Button
                size="sm"
                variant={isActive ? 'default' : 'outline'}
                onClick={handleToggle}
                disabled={isPending}
                className="gap-1"
            >
                {isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                ) : isActive ? (
                    <Pause className="h-3 w-3" />
                ) : (
                    <Play className="h-3 w-3" />
                )}
                {isActive ? 'Pause' : 'Enable'}
            </Button>
            {error && <span className="text-xs text-destructive">{error}</span>}
        </div>
    )
}
