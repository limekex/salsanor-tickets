
import { getOrganizer } from '@/app/actions/organizers'
import { notFound } from 'next/navigation'
import { OrganizerForm } from '../../organizer-form'

type Params = Promise<{ id: string }>

export default async function EditOrganizerPage({ params }: { params: Params }) {
    const { id } = await params
    const organizer = await getOrganizer(id)

    if (!organizer) return notFound()

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold">Edit Organizer</h2>
                <p className="text-muted-foreground">Update organizer details</p>
            </div>
            <OrganizerForm organizer={organizer} />
        </div>
    )
}
