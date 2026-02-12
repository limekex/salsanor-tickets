'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface OrgAutoSelectorProps {
    currentOrgId: string | null
    organizers: Array<{ id: string; name: string; slug: string }>
    onOrgChange: (orgId: string) => Promise<void>
}

/**
 * Client component that auto-selects first org if:
 * - User has multiple orgs
 * - No org is currently selected
 * This avoids cookie modification in layout (server component)
 */
export function OrgAutoSelector({ currentOrgId, organizers, onOrgChange }: OrgAutoSelectorProps) {
    const router = useRouter()

    useEffect(() => {
        // Only auto-select if no org is selected and user has orgs
        if (!currentOrgId && organizers.length > 0) {
            const selectFirstOrg = async () => {
                try {
                    await onOrgChange(organizers[0].id)
                    router.refresh()
                } catch (error) {
                    console.error('Failed to auto-select organization:', error)
                }
            }
            selectFirstOrg()
        }
    }, [currentOrgId, organizers, onOrgChange, router])

    return null // This component doesn't render anything
}
