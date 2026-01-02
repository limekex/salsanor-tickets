import { getPublicMembershipTiers } from '@/app/actions/membership-tiers'
import { notFound } from 'next/navigation'
import { MembershipCheckoutForm } from './membership-checkout-form'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

type Params = Promise<{ slug: string; tierId: string }>

export default async function MembershipCheckoutPage({ params }: { params: Params }) {
  const { slug, tierId } = await params
  const data = await getPublicMembershipTiers(slug)

  if (!data || !data.organizer.membershipEnabled || !data.organizer.membershipSalesOpen) {
    return notFound()
  }

  const tier = data.tiers.find(t => t.id === tierId)

  if (!tier) {
    return notFound()
  }

  return (
    <main className="container mx-auto py-rn-7 px-rn-4 max-w-2xl">
      <Link 
        href={`/org/${slug}/membership`} 
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to membership options
      </Link>

      <MembershipCheckoutForm 
        organizerSlug={slug}
        organizerName={data.organizer.name}
        tier={tier}
      />
    </main>
  )
}
