
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/utils/auth-admin'
import { notFound } from 'next/navigation'
import { PeriodForm } from '../../period-form'

type Params = Promise<{ id: string }>

export default async function EditPeriodPage({ params }: { params: Params }) {
    await requireAdmin()
    const { id } = await params

    const period = await prisma.coursePeriod.findUnique({
        where: { id }
    })

    if (!period) return notFound()

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold">Edit Period</h2>
                <p className="text-muted-foreground">Update period details and dates</p>
            </div>
            <PeriodForm period={period} />
        </div>
    )
}
