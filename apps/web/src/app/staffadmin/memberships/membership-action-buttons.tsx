'use client'

import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Trash2 } from 'lucide-react'
import { approveMembership, rejectMembership, deleteMembership } from '@/app/actions/memberships-admin'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'

export function ApproveMembershipButton({ membershipId }: { membershipId: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleApprove = () => {
    if (!confirm('Approve this membership? The member will be activated and notified.')) {
      return
    }

    startTransition(async () => {
      try {
        await approveMembership(membershipId)
        router.refresh()
      } catch (error) {
        console.error('Approval error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to approve membership'
        alert(`Error: ${errorMessage}`)
      }
    })
  }

  return (
    <Button
      size="sm"
      variant="default"
      onClick={handleApprove}
      disabled={isPending}
      className="bg-green-600 hover:bg-green-700"
    >
      <CheckCircle2 className="h-4 w-4 mr-1" />
      {isPending ? 'Approving...' : 'Approve'}
    </Button>
  )
}

export function RejectMembershipButton({ membershipId }: { membershipId: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleReject = () => {
    if (!confirm('Reject this membership? This action cannot be undone.')) {
      return
    }

    startTransition(async () => {
      try {
        await rejectMembership(membershipId)
        router.refresh()
      } catch (error) {
        console.error('Rejection error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to reject membership'
        alert(`Error: ${errorMessage}`)
      }
    })
  }

  return (
    <Button
      size="sm"
      variant="destructive"
      onClick={handleReject}
      disabled={isPending}
    >
      <XCircle className="h-4 w-4 mr-1" />
      {isPending ? 'Rejecting...' : 'Reject'}
    </Button>
  )
}

export function DeleteMembershipButton({ membershipId }: { membershipId: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleDelete = () => {
    if (!confirm('Permanently delete this membership? This action cannot be undone.')) {
      return
    }

    startTransition(async () => {
      try {
        await deleteMembership(membershipId)
        router.refresh()
      } catch (error) {
        console.error('Delete error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete membership'
        alert(`Error: ${errorMessage}`)
      }
    })
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleDelete}
      disabled={isPending}
      className="text-red-600 hover:text-red-700 hover:bg-red-50"
    >
      <Trash2 className="h-4 w-4 mr-1" />
      {isPending ? 'Deleting...' : 'Delete'}
    </Button>
  )
}
