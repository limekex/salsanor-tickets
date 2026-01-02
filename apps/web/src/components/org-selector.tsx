'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRouter } from 'next/navigation'
import { Building2 } from 'lucide-react'

interface OrgSelectorProps {
    organizers: Array<{
        id: string
        name: string
        slug: string
    }>
    currentOrgId: string | null
    onOrgChange: (orgId: string) => Promise<void>
}

export function OrgSelector({ organizers, currentOrgId, onOrgChange }: OrgSelectorProps) {
    const router = useRouter()

    const handleChange = async (value: string) => {
        await onOrgChange(value)
        router.refresh()
    }

    return (
        <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <Select value={currentOrgId || 'none'} onValueChange={handleChange}>
                <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select Organization" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">All Organizations</SelectItem>
                    {organizers.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                            {org.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}
