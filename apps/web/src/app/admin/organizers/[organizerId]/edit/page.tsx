
import { getOrganizer } from '@/app/actions/organizers'
import { notFound } from 'next/navigation'
import { OrganizerForm } from '../../organizer-form'

type Params = Promise<{ organizerId: string }>

export default async function EditOrganizerPage({ params }: { params: Params }) {
    const { organizerId } = await params
    const organizer = await getOrganizer(organizerId)

    if (!organizer) return notFound()

    // Serialize Decimal fields for client component
    const serializedOrganizer = {
        ...organizer,
        mvaRate: Number(organizer.mvaRate),
        stripeFeePercentage: Number(organizer.stripeFeePercentage),
        fiscalYearStart: organizer.fiscalYearStart?.toISOString() ?? null,
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold">Edit Organizer</h2>
                <p className="text-muted-foreground">Update organizer details</p>
            </div>
            <OrganizerForm organizer={serializedOrganizer} />
        </div>
    )
}
