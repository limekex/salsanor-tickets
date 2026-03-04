import { prisma } from '@/lib/db'
import { SuccessClient } from './success-client'

interface Props {
    searchParams: Promise<{ orderId?: string }>
}

/**
 * Success page – server component.
 *
 * Fetches the organizer's tracking IDs and the order value so that the
 * client component can fire the appropriate conversion pixels (GA4, Meta
 * Pixel, Google Ads).
 */
export default async function SuccessPage({ searchParams }: Props) {
    const { orderId } = await searchParams

    let trackingData: {
        googleAnalyticsId: string | null
        facebookPixelId: string | null
        googleAdsConversionId: string | null
        googleAdsConversionLabel: string | null
        orderValueNOK: number
        currency: string
        utmSource: string | null
        utmMedium: string | null
        utmCampaign: string | null
    } | null = null

    if (orderId) {
        try {
            const order = await prisma.order.findUnique({
                where: { id: orderId },
                select: {
                    totalCents: true,
                    currency: true,
                    utmSource: true,
                    utmMedium: true,
                    utmCampaign: true,
                    Organizer: {
                        select: {
                            googleAnalyticsId: true,
                            facebookPixelId: true,
                            googleAdsConversionId: true,
                            googleAdsConversionLabel: true,
                        },
                    },
                },
            })

            if (order) {
                trackingData = {
                    googleAnalyticsId: order.Organizer.googleAnalyticsId,
                    facebookPixelId: order.Organizer.facebookPixelId,
                    googleAdsConversionId: order.Organizer.googleAdsConversionId,
                    googleAdsConversionLabel: order.Organizer.googleAdsConversionLabel,
                    // Convert øre → NOK for pixel values
                    orderValueNOK: order.totalCents / 100,
                    currency: order.currency,
                    utmSource: order.utmSource,
                    utmMedium: order.utmMedium,
                    utmCampaign: order.utmCampaign,
                }
            }
        } catch {
            // Non-critical – proceed without tracking data
        }
    }

    return <SuccessClient orderId={orderId} trackingData={trackingData} />
}
