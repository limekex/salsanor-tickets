'use client'

import { useEffect, useRef, useState } from 'react'
import { loadConnectAndInitialize, StripeConnectInstance } from '@stripe/connect-js'
import { Loader2 } from 'lucide-react'
import { createStripeEmbeddedSession } from './actions'

interface StripeEmbeddedManagementProps {
    organizerId: string
    publishableKey: string
}

export function StripeEmbeddedManagement({ organizerId, publishableKey }: StripeEmbeddedManagementProps) {
    const [stripeConnect, setStripeConnect] = useState<StripeConnectInstance | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        let mounted = true

        const initializeStripeConnect = async () => {
            try {
                // Get client secret from server
                const result = await createStripeEmbeddedSession(organizerId, 'management')
                
                if (!result.success || !result.clientSecret) {
                    if (mounted) {
                        setError(result.error || 'Failed to initialize management')
                        setLoading(false)
                    }
                    return
                }

                // Initialize Stripe Connect
                const instance = loadConnectAndInitialize({
                    publishableKey,
                    fetchClientSecret: async () => result.clientSecret!,
                    appearance: {
                        variables: {
                            colorPrimary: '#2563eb',
                        }
                    }
                })

                if (mounted) {
                    setStripeConnect(instance)
                    setLoading(false)
                }
            } catch (err) {
                if (mounted) {
                    setError(err instanceof Error ? err.message : 'An error occurred')
                    setLoading(false)
                }
            }
        }

        initializeStripeConnect()

        return () => {
            mounted = false
        }
    }, [organizerId, publishableKey])

    useEffect(() => {
        if (stripeConnect && containerRef.current) {
            const component = stripeConnect.create('account-management') as any
            containerRef.current.innerHTML = ''
            component.mount(containerRef.current)
        }
    }, [stripeConnect])

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="text-sm text-destructive p-4 border border-destructive/20 rounded">
                {error}
            </div>
        )
    }

    return (
        <div ref={containerRef} className="min-h-[400px]" />
    )
}
