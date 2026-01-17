import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { TierForm } from '../tier-form'
import { requireOrganizerAccess } from '@/utils/auth-admin'
import { prisma } from '@/lib/db'

export default async function NewTierPage() {
  const user = await requireOrganizerAccess()
  const organizerId = user.userAccount.UserAccountRole[0]?.organizerId

  let organizerVatRegistered = false
  if (organizerId) {
    const organizer = await prisma.organizer.findUnique({
      where: { id: organizerId },
      select: { vatRegistered: true }
    })
    organizerVatRegistered = organizer?.vatRegistered || false
  }

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
