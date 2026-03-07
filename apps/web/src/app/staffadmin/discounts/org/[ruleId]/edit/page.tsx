import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, Building2 } from 'lucide-react'
import { OrgDiscountRuleForm } from '../../org-discount-rule-form'
import { getSelectedOrganizerForAdmin } from '@/utils/auth-org-admin'
import { getOrgDiscountRule } from '@/app/actions/discounts'

type Params = Promise<{ ruleId: string }>

export default async function EditOrgDiscountRulePage({ params }: { params: Params }) {
  const { ruleId } = await params
  
  // Get selected organization (from cookie or first available)
  const organizerId = await getSelectedOrganizerForAdmin()

  // Get the rule and verify it belongs to this organization
  const rule = await getOrgDiscountRule(ruleId)

  if (!rule) {
    notFound()
  }

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
            Edit Organization Rule
          </h1>
          <p className="rn-meta text-rn-text-muted">{rule.name}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rule Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <OrgDiscountRuleForm 
            key={rule.id} 
            organizerId={organizerId} 
            tiers={tiers} 
            existingRule={{
              id: rule.id,
              code: rule.code,
              name: rule.name,
              priority: rule.priority,
              enabled: rule.enabled,
              ruleType: rule.ruleType,
              config: (rule.config ?? {}) as Record<string, unknown>,
              appliesTo: rule.appliesTo
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
