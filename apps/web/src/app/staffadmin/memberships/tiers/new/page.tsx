import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { TierForm } from '../tier-form'
import { prisma } from '@/lib/db'
import { getSelectedOrganizerForAdmin } from '@/utils/auth-org-admin'

export default async function NewTierPage() {
  // Get selected organization (from cookie or first available)
  const organizerId = await getSelectedOrganizerForAdmin()

  const organizer = await prisma.organizer.findUnique({
    where: { id: organizerId },
    select: { vatRegistered: true }
  })
  const organizerVatRegistered = organizer?.vatRegistered || false

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/staffadmin/memberships/tiers">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">New Membership Tier</h1>
      </div>

      <TierForm organizerVatRegistered={organizerVatRegistered} />
    </div>
  )
}
