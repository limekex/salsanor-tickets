import { getDiscountRule } from '@/app/actions/discounts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { RuleForm } from '../../rule-form'

interface PageProps {
    params: Promise<{ periodId: string; ruleId: string }>
}

export default async function EditRulePage({ params }: PageProps) {
    const { periodId, ruleId } = await params
    
    const period = await prisma.coursePeriod.findUnique({ 
        where: { id: periodId } 
    })
    
    if (!period) notFound()

    const rule = await getDiscountRule(ruleId)
    
    if (!rule || rule.periodId !== periodId) notFound()

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Edit Discount Rule</h1>
                <p className="text-muted-foreground">Modify discount rule for {period.name}</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Rule Configuration</CardTitle>
                    <CardDescription>Update the discount rule settings</CardDescription>
                </CardHeader>
                <CardContent>
                    <RuleForm periodId={periodId} existingRule={rule} />
                </CardContent>
            </Card>
        </div>
    )
}
