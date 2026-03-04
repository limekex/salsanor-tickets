/**
 * readUtmCookie
 *
 * Reads the `_rn_utm` cookie that is written client-side by <UtmCapture />.
 * Call this inside server actions (which can use Next.js `cookies()`) to get
 * the UTM attribution data for the current user session.
 *
 * Returns null if no UTM cookie is present or if the cookie value is invalid.
 */
export interface UtmData {
    utmSource: string | null
    utmMedium: string | null
    utmCampaign: string | null
    utmContent: string | null
    utmTerm: string | null
    utmReferrer: string | null
}

const COOKIE_NAME = '_rn_utm'

export async function readUtmCookie(): Promise<UtmData | null> {
    try {
        const { cookies } = await import('next/headers')
        const cookieStore = await cookies()
        const raw = cookieStore.get(COOKIE_NAME)?.value
        if (!raw) return null

        const parsed = JSON.parse(decodeURIComponent(raw))
        return {
            utmSource: parsed.utmSource ?? null,
            utmMedium: parsed.utmMedium ?? null,
            utmCampaign: parsed.utmCampaign ?? null,
            utmContent: parsed.utmContent ?? null,
            utmTerm: parsed.utmTerm ?? null,
            utmReferrer: parsed.utmReferrer ?? null,
        }
    } catch {
        return null
    }
}
