'use client'

import { useEffect, useRef, useState } from 'react'
import { loadConnectAndInitialize, StripeConnectInstance } from '@stripe/connect-js'
import { Loader2 } from 'lucide-react'
import { createStripeEmbeddedSession } from './actions'

interface StripeEmbeddedOnboardingProps {
    organizerId: string
    publishableKey: string
}

export function StripeEmbeddedOnboarding({ organizerId, publishableKey }: StripeEmbeddedOnboardingProps) {
    const [stripeConnect, setStripeConnect] = useState<StripeConnectInstance | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        let mounted = true

        const initializeStripeConnect = async () => {
            try {
                // Get client secret from server
                const result = await createStripeEmbeddedSession(organizerId, 'onboarding')
                
                if (!result.success || !result.clientSecret) {
                    if (mounted) {
                        setError(result.error || 'Failed to initialize onboarding')
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
            const component = stripeConnect.create('account-onboarding') as any
            component.setOnExit(() => {
                // User exited onboarding - reload page to show updated status
                window.location.reload()
            })
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
