'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Mail, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { type ScheduledTaskType } from '@/lib/scheduled-tasks-types'
import { sendTestEmail } from '@/app/actions/scheduled-tasks'

interface TestEmailButtonProps {
    taskType: ScheduledTaskType
}

export function TestEmailButton({ taskType }: TestEmailButtonProps) {
    const [isPending, startTransition] = useTransition()
    const [result, setResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null)

    const handleSendTest = () => {
        setResult(null)
        startTransition(async () => {
            const res = await sendTestEmail(taskType)
            setResult(res)
            
            // Clear result after 5 seconds
            setTimeout(() => setResult(null), 5000)
        })
    }

    return (
        <div className="flex items-center gap-2">
            {result && (
                <span className={`text-xs flex items-center gap-1 ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                    {result.success ? (
                        <CheckCircle className="h-3 w-3" />
                    ) : (
                        <XCircle className="h-3 w-3" />
                    )}
                    {result.message || result.error}
                </span>
            )}
            <Button
                variant="ghost"
                size="sm"
                onClick={handleSendTest}
                disabled={isPending}
                className="text-muted-foreground hover:text-foreground"
                title="Send test email to yourself"
            >
                {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Mail className="h-4 w-4" />
                )}
            </Button>
        </div>
    )
}
