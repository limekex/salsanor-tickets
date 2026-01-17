'use client'

import { publishEvent } from '@/app/actions/events'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff } from 'lucide-react'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function PublishEventButton({ 
    eventId, 
    eventTitle,
    isPublished 
}: { 
    eventId: string
    eventTitle: string
    isPublished: boolean
}) {
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const handleToggle = () => {
        startTransition(async () => {
            const result = await publishEvent(eventId)
            
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success(result.published ? `"${eventTitle}" published` : `"${eventTitle}" unpublished`)
                router.refresh()
            }
        })
    }

    return (
        <Button 
            variant={isPublished ? "outline" : "default"}
            size="sm"
            onClick={handleToggle}
            disabled={isPending}
        >
            {isPublished ? (
                <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Unpublish
                </>
            ) : (
                <>
                    <Eye className="h-4 w-4 mr-2" />
                    Publish
                </>
            )}
        </Button>
    )
}
