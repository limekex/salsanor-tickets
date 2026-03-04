'use client'

import { useEffect } from 'react'

interface ConversionPixelProps {
    googleAnalyticsId: string | null
    facebookPixelId: string | null
    googleAdsConversionId: string | null
    googleAdsConversionLabel: string | null
    orderValueNOK: number
    currency: string
    orderId: string
    utmSource?: string | null
    utmMedium?: string | null
    utmCampaign?: string | null
}

declare global {
    interface Window {
        gtag?: (...args: any[]) => void
        fbq?: (...args: any[]) => void
        dataLayer?: any[]
    }
}

/**
 * ConversionPixels
 *
 * Client-only component that fires purchase/conversion events to the
 * organizer's configured analytics platforms once the payment success page
 * mounts.  Fires:
 *  - GA4   `purchase` event via gtag.js
 *  - Meta  `Purchase` event via Pixel
 *  - Google Ads conversion via gtag.js
 *
 * The scripts are injected dynamically (only when the relevant IDs are set)
 * so users who have not configured any tracking see no extra network requests.
 */
export function ConversionPixels({
    googleAnalyticsId,
    facebookPixelId,
    googleAdsConversionId,
    googleAdsConversionLabel,
    orderValueNOK,
    currency,
    orderId,
    utmSource,
    utmMedium,
    utmCampaign,
}: ConversionPixelProps) {
    useEffect(() => {
        // ── GA4 purchase event ────────────────────────────────────────────────
        if (googleAnalyticsId) {
            // Inject gtag.js if not already present
            if (!document.querySelector(`script[src*="googletagmanager.com/gtag"]`)) {
                const script = document.createElement('script')
                script.async = true
                script.src = `https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`
                document.head.appendChild(script)
                script.onload = () => fireGa4()
            } else {
                fireGa4()
            }
        }

        function fireGa4() {
            if (!googleAnalyticsId) return
            window.dataLayer = window.dataLayer ?? []
            window.gtag =
                window.gtag ??
                function (...args: any[]) {
                    window.dataLayer!.push(args)
                }
            window.gtag('js', new Date())
            window.gtag('config', googleAnalyticsId)
            window.gtag('event', 'purchase', {
                transaction_id: orderId,
                value: orderValueNOK,
                currency,
                ...(utmSource ? { traffic_source: utmSource } : {}),
                ...(utmCampaign ? { campaign: utmCampaign } : {}),
            })

            // Also fire Google Ads conversion if configured
            if (googleAdsConversionId && googleAdsConversionLabel) {
                window.gtag('event', 'conversion', {
                    send_to: `${googleAdsConversionId}/${googleAdsConversionLabel}`,
                    value: orderValueNOK,
                    currency,
                    transaction_id: orderId,
                })
            }
        }

        // ── Meta / Facebook Pixel ─────────────────────────────────────────────
        if (facebookPixelId) {
            if (!document.querySelector('script[src*="connect.facebook.net"]')) {
                // Inline pixel init snippet
                const fbScript = document.createElement('script')
                fbScript.innerHTML = `
                    !function(f,b,e,v,n,t,s){
                    if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                    n.queue=[];t=b.createElement(e);t.async=!0;
                    t.src=v;s=b.getElementsByTagName(e)[0];
                    s.parentNode.insertBefore(t,s)}(window,document,'script',
                    'https://connect.facebook.net/en_US/fbevents.js');
                    fbq('init','${facebookPixelId}');
                `
                document.head.appendChild(fbScript)
            }
            window.fbq?.('track', 'Purchase', {
                value: orderValueNOK,
                currency,
            })
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    return null
}
