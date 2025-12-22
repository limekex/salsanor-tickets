'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ExternalLink, Loader2 } from 'lucide-react'
import { createStripeConnectLink } from './actions'

interface StripeConnectButtonProps {
    organizerId: string
    action: 'connect' | 'dashboard' | 'complete'
    children: React.ReactNode
}

export function StripeConnectButton({ organizerId, action, children }: StripeConnectButtonProps) {
    const [isLoading, setIsLoading] = useState(false)

    const handleClick = async () => {
        setIsLoading(true)
        try {
            const result = await createStripeConnectLink(organizerId, action)
            if (result.success && result.url) {
                // Redirect to Stripe
                window.location.href = result.url
            } else {
                alert(result.error || 'Failed to create Stripe Connect link')
                setIsLoading(false)
            }
        } catch (error) {
            alert('An error occurred')
            setIsLoading(false)
        }
    }

    return (
        <Button 
            onClick={handleClick} 
            disabled={isLoading}
            variant={action === 'connect' ? 'default' : 'outline'}
            className={action === 'connect' ? 'bg-blue-600 hover:bg-blue-700' : ''}
        >
            {isLoading ? (
                <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                </>
            ) : (
                <>
                    {children}
                    <ExternalLink className="h-4 w-4 ml-2" />
                </>
            )}
        </Button>
    )
}
