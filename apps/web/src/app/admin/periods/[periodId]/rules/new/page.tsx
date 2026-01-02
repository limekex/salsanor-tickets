
import { RuleForm } from '../rule-form'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'

interface PageProps {
    params: Promise<{ periodId: string }>
}

export default async function NewRulePage({ params }: PageProps) {
    const { periodId } = await params
    const period = await prisma.coursePeriod.findUnique({ where: { id: periodId } })
    if (!period) notFound()

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Create Discount Rule</h1>
                <p className="text-muted-foreground">Add a new pricing rule for {period.name}</p>
            </div>
            <RuleForm periodId={periodId} />
        </div>
    )
}
