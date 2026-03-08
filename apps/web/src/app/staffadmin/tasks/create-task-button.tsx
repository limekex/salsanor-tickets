'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Loader2 } from 'lucide-react'
import { upsertScheduledTask } from '@/app/actions/scheduled-tasks'
import { type ScheduledTaskType } from '@/lib/scheduled-tasks-types'

interface CreateTaskButtonProps {
    organizerId: string
    taskType: ScheduledTaskType
}

export function CreateTaskButton({ organizerId, taskType }: CreateTaskButtonProps) {
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    function handleCreate() {
        setError(null)
        startTransition(async () => {
            const result = await upsertScheduledTask(organizerId, taskType, { isActive: true })
            if (!result.success) {
                setError(result.error || 'Failed to create task')
            }
        })
    }

    return (
        <div className="flex flex-col items-end gap-1">
            <Button
                size="sm"
                variant="outline"
                onClick={handleCreate}
                disabled={isPending}
                className="gap-1"
            >
                {isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                    <Plus className="h-3 w-3" />
                )}
                Enable
            </Button>
            {error && <span className="text-xs text-destructive">{error}</span>}
        </div>
    )
}
