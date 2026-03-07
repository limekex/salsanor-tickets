'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { useCart } from '@/hooks/use-cart'
import { useEffect } from 'react'
import { ConversionPixels } from '@/components/conversion-pixels'

interface TrackingData {
    googleAnalyticsId: string | null
    facebookPixelId: string | null
    googleAdsConversionId: string | null
    googleAdsConversionLabel: string | null
    orderValueNOK: number
    currency: string
    utmSource: string | null
    utmMedium: string | null
    utmCampaign: string | null
}

interface Props {
    orderId?: string
    trackingData: TrackingData | null
}

export function SuccessClient({ orderId, trackingData }: Props) {
    const { clearCart } = useCart()

    // Clear cart on successful payment (only once on mount)
    useEffect(() => {
        clearCart()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <main className="container max-w-md mx-auto py-rn-20 px-rn-4 text-center space-y-rn-6">
            {/* Fire conversion pixels if tracking is configured */}
            {trackingData && orderId && (
                <ConversionPixels
                    googleAnalyticsId={trackingData.googleAnalyticsId}
                    facebookPixelId={trackingData.facebookPixelId}
                    googleAdsConversionId={trackingData.googleAdsConversionId}
                    googleAdsConversionLabel={trackingData.googleAdsConversionLabel}
                    orderValueNOK={trackingData.orderValueNOK}
                    currency={trackingData.currency}
                    orderId={orderId}
                    utmSource={trackingData.utmSource}
                    utmMedium={trackingData.utmMedium}
                    utmCampaign={trackingData.utmCampaign}
                />
            )}

            <div className="flex justify-center text-rn-success">
                <CheckCircle2 className="h-16 w-16" />
            </div>
            <h1 className="rn-h1">Payment Successful!</h1>
            <p className="rn-meta text-rn-text-muted">
                Thank you for your registration. You can now view your active courses and tickets in your profile.
            </p>
            <Button asChild size="lg">
                <Link href="/my">Go to My page</Link>
            </Button>
        </main>
    )
}
