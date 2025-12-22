'use client'

import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { useState, useTransition } from 'react'
import { cancelOrder } from '@/app/actions/payments'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export function CancelOrderButton({ orderId }: { orderId: string }) {
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    const handleCancel = () => {
        setError(null)
        startTransition(async () => {
            const result = await cancelOrder(orderId)
            if (result?.error) {
                setError(result.error)
            }
        })
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isPending}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Cancel Order
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Order?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will delete all registrations in this order. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                {error && (
                    <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                        {error}
                    </div>
                )}
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>Keep Order</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={(e) => {
                            e.preventDefault()
                            handleCancel()
                        }}
                        disabled={isPending}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isPending ? 'Canceling...' : 'Yes, Cancel Order'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
