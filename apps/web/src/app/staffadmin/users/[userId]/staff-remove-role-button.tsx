'use client'

import { Button } from '@/components/ui/button'
import { removeUserRoleStaff } from '@/app/actions/staffadmin'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { useTransition } from 'react'

export function StaffRemoveRoleButton({ roleId, roleName }: { roleId: string; roleName: string }) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    const handleRemove = () => {
        if (!confirm(`Are you sure you want to remove the ${roleName} role from this user?`)) {
            return
        }

        startTransition(async () => {
            try {
                await removeUserRoleStaff(roleId)
                router.refresh()
            } catch (e: any) {
                alert(e.message || 'Failed to remove role')
            }
        })
    }

    return (
        <Button
            onClick={handleRemove}
            variant="ghost"
            size="sm"
            disabled={isPending}
        >
            <X className="h-4 w-4" />
        </Button>
    )
}
