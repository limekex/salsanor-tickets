import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { StaffDiscountRuleForm } from '../../staff-discount-rule-form'

type Params = Promise<{ periodId: string; ruleId: string }>

export default async function EditDiscountRulePage({ params }: { params: Params }) {
  const { periodId, ruleId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  // Get user's organization
  const userAccount = await prisma.userAccount.findUnique({
    where: { supabaseUid: user.id },
    include: {
      roles: {
        where: { role: 'ORG_ADMIN' }
      }
    }
  })

  const organizerId = userAccount?.roles?.[0]?.organizerId

  if (!organizerId) {
    redirect('/staffadmin')
  }

  // Verify period belongs to organization
  const period = await prisma.coursePeriod.findFirst({
    where: {
      id: periodId,
      organizerId
    }
  })

  if (!period) {
    notFound()
  }

  // Get the discount rule and verify it belongs to this organization's period
  const rule = await prisma.discountRule.findUnique({
    where: { id: ruleId }
  })
  
  if (!rule || rule.periodId !== periodId) {
    notFound()
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
          <h1 className="text-2xl font-bold">Edit Discount Rule</h1>
          <p className="text-muted-foreground">For {period.name}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rule Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <StaffDiscountRuleForm periodId={periodId} tiers={tiers} existingRule={rule} />
        </CardContent>
      </Card>
    </div>
  )
}
