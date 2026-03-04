'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

const COOKIE_NAME = '_rn_utm'
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 // 30 days in seconds

/**
 * UtmCapture
 *
 * Silently captures UTM parameters and the referrer from the current URL the
 * first time a visitor lands on our platform.  The values are written to a
 * first-party session cookie so that the checkout action can read them (via
 * Next.js `cookies()`) and persist them on the Order for attribution.
 *
 * The component renders nothing – it is purely a side-effect hook.
 * It must be rendered inside a Suspense boundary because it calls
 * useSearchParams().
 */
export function UtmCapture() {
    const searchParams = useSearchParams()

    useEffect(() => {
        const source = searchParams.get('utm_source')
        const medium = searchParams.get('utm_medium')
        const campaign = searchParams.get('utm_campaign')
        const content = searchParams.get('utm_content')
        const term = searchParams.get('utm_term')

        // Only overwrite the cookie when at least one UTM param is present
        if (!source && !medium && !campaign && !content && !term) return

        // First-touch attribution: don't overwrite an existing cookie so the
        // original acquisition source is preserved through the checkout flow.
        if (document.cookie.includes(`${COOKIE_NAME}=`)) return

        const referrer = document.referrer || ''

        const value = JSON.stringify({
            utmSource: source ?? null,
            utmMedium: medium ?? null,
            utmCampaign: campaign ?? null,
            utmContent: content ?? null,
            utmTerm: term ?? null,
            utmReferrer: referrer || null,
        })

        document.cookie = [
            `${COOKIE_NAME}=${encodeURIComponent(value)}`,
            `Max-Age=${COOKIE_MAX_AGE}`,
            'Path=/',
            'SameSite=Lax',
        ].join('; ')
    }, [searchParams])

    return null
}
