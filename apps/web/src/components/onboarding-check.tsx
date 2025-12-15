'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export function OnboardingCheck({ needsOnboarding }: { needsOnboarding: boolean }) {
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        // If user needs onboarding and not already on onboarding or auth pages
        if (needsOnboarding && 
            !pathname.startsWith('/onboarding') && 
            !pathname.startsWith('/auth')) {
            router.push('/onboarding')
        }
        
        // If user doesn't need onboarding but is on onboarding page
        if (!needsOnboarding && pathname.startsWith('/onboarding')) {
            router.push('/')
        }
    }, [needsOnboarding, pathname, router])

    return null
}
