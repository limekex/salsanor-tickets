'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Loader2 } from 'lucide-react'
import { type ScheduledTaskType } from '@/lib/scheduled-tasks-types'
import { runAllTasksOfType } from '@/app/actions/scheduled-tasks'

interface GlobalTaskTriggerButtonProps {
    taskType: ScheduledTaskType
    activeCount: number
}

export function GlobalTaskTriggerButton({ taskType, activeCount }: GlobalTaskTriggerButtonProps) {
    const [isPending, startTransition] = useTransition()
    const [result, setResult] = useState<{ success: boolean; message?: string } | null>(null)

    const handleTrigger = () => {
        setResult(null)
        startTransition(async () => {
            const res = await runAllTasksOfType(taskType)
            setResult(res)
            
            // Clear result after 5 seconds
            setTimeout(() => setResult(null), 5000)
        })
    }

    if (activeCount === 0) {
        return (
            <Button variant="outline" size="sm" disabled>
                <Play className="h-4 w-4 mr-1" />
                No active tasks
            </Button>
        )
    }

    return (
        <div className="flex items-center gap-2">
            {result && (
                <span className={`text-xs ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                    {result.message}
                </span>
            )}
            <Button
                variant="outline"
                size="sm"
                onClick={handleTrigger}
                disabled={isPending}
            >
                {isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                    <Play className="h-4 w-4 mr-1" />
                )}
                Run All ({activeCount})
            </Button>
        </div>
    )
}
