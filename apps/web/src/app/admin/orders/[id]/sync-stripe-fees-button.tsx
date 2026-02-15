'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { syncStripeFees } from '@/app/actions/sync-stripe-fees'
import { useRouter } from 'next/navigation'

interface SyncStripeFeesButtonProps {
    orderId: string
    hasFees: boolean
}

export function SyncStripeFeesButton({ orderId, hasFees }: SyncStripeFeesButtonProps) {
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<string | null>(null)
    const router = useRouter()

    if (hasFees) {
        return null // Don't show button if fees already synced
    }

    const handleSync = async () => {
        setLoading(true)
        setResult(null)
        
        try {
            const response = await syncStripeFees(orderId)
            setResult(response.message)
            if (response.success) {
                // Refresh the page to show updated data
                router.refresh()
            }
        } catch (err: any) {
            setResult(`Error: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col gap-1">
            <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSync}
                disabled={loading}
                className="text-xs"
            >
                <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Syncing...' : 'Sync Stripe Fees'}
            </Button>
            {result && (
                <p className="text-xs text-rn-text-muted">{result}</p>
            )}
        </div>
    )
}
