'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { updateMembershipStatus } from '@/app/actions/memberships-admin'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'

type MembershipStatus = 'ACTIVE' | 'PENDING_PAYMENT' | 'EXPIRED' | 'CANCELLED'

interface MembershipStatusSelectProps {
  membershipId: string
  currentStatus: MembershipStatus
}

export function MembershipStatusSelect({ membershipId, currentStatus }: MembershipStatusSelectProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleStatusChange = (newStatus: MembershipStatus) => {
    if (newStatus === currentStatus) return

    startTransition(async () => {
      try {
        await updateMembershipStatus(membershipId, newStatus)
        router.refresh()
      } catch (error) {
        console.error('Status update error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to update status'
        alert(`Error: ${errorMessage}`)
      }
    })
  }

  const getStatusColor = (status: MembershipStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/20 dark:text-green-400'
      case 'PENDING_PAYMENT':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'EXPIRED':
        return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/20 dark:text-gray-400'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/20 dark:text-red-400'
    }
  }

  const getStatusLabel = (status: MembershipStatus) => {
    switch (status) {
      case 'ACTIVE': return 'Active'
      case 'PENDING_PAYMENT': return 'Pending'
      case 'EXPIRED': return 'Expired'
      case 'CANCELLED': return 'Cancelled'
    }
  }

  return (
    <Select
      value={currentStatus}
      onValueChange={handleStatusChange}
      disabled={isPending}
    >
      <SelectTrigger className="w-auto h-auto border-none p-0 bg-transparent hover:bg-transparent focus:ring-0 focus:ring-offset-0">
        <SelectValue asChild>
          <Badge variant="outline" className={getStatusColor(currentStatus)}>
            {isPending ? 'Updating...' : getStatusLabel(currentStatus)}
          </Badge>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ACTIVE">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full bg-green-500`} />
            Active
          </div>
        </SelectItem>
        <SelectItem value="PENDING_PAYMENT">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full bg-yellow-500`} />
            Pending
          </div>
        </SelectItem>
        <SelectItem value="EXPIRED">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full bg-gray-500`} />
            Expired
          </div>
        </SelectItem>
        <SelectItem value="CANCELLED">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full bg-red-500`} />
            Cancelled
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  )
}
