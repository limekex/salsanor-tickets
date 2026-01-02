import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { TierForm } from '../tier-form'
import { listMembershipTiers, deleteMembershipTier } from '@/app/actions/membership-tiers'
import { DeleteTierButton } from './delete-tier-button'

interface PageProps {
  params: Promise<{ tierId: string }>
}

export default async function EditTierPage({ params }: PageProps) {
  const { tierId } = await params
  const tiers = await listMembershipTiers()
  const tier = tiers.find(t => t.id === tierId)

  if (!tier) {
    notFound()
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/staffadmin/memberships/tiers">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Edit Membership Tier</h1>
        </div>
        <DeleteTierButton tierId={tier.id} tierName={tier.name} hasMemberships={tier.memberCount > 0} />
      </div>

      <TierForm tier={tier} />
    </div>
  )
}
