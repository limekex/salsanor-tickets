import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, Building2 } from 'lucide-react'
import { OrgDiscountRuleForm } from '../org-discount-rule-form'
import { getSelectedOrganizerForAdmin } from '@/utils/auth-org-admin'

export default async function NewOrgDiscountRulePage() {
  // Get selected organization (from cookie or first available)
  const organizerId = await getSelectedOrganizerForAdmin()

  // Get organization details
  const organizer = await prisma.organizer.findUnique({
    where: { id: organizerId },
    select: { id: true, name: true }
  })

  if (!organizer) {
    return <div>Organization not found</div>
  }

  // Get membership tiers for this organization
  const tiers = await prisma.membershipTier.findMany({
    where: { organizerId },
    orderBy: { priority: 'desc' },
    select: {
      id: true,
      name: true,
      slug: true,
    }
  })

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/staffadmin/discounts">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="rn-h2 flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            New Organization Rule
          </h1>
          <p className="rn-meta text-rn-text-muted">For {organizer.name}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rule Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <OrgDiscountRuleForm key={organizerId} organizerId={organizerId} tiers={tiers} />
        </CardContent>
      </Card>
    </div>
  )
}
