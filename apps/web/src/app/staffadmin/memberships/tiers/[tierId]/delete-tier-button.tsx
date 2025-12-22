'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Trash2 } from 'lucide-react'
import { deleteMembershipTier } from '@/app/actions/membership-tiers'

interface DeleteTierButtonProps {
  tierId: string
  tierName: string
  hasMemberships: boolean
}

export function DeleteTierButton({ tierId, tierName, hasMemberships }: DeleteTierButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setLoading(true)
    setError(null)

    try {
      await deleteMembershipTier(tierId)
      router.push('/staffadmin/memberships/tiers')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tier')
    } finally {
      setLoading(false)
    }
  }

  if (hasMemberships) {
    return (
      <Button variant="outline" disabled>
        <Trash2 className="mr-2 h-4 w-4" />
        Cannot Delete (Has Members)
      </Button>
    )
  }

  return (
    <>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" disabled={loading}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Tier
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Membership Tier</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{tierName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={loading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {loading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
