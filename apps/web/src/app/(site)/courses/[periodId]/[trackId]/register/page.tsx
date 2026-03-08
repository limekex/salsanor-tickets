
import { getCourseTrack } from '@/app/actions/courses'
import { notFound } from 'next/navigation'
import { RegistrationWizard } from './wizard'
import type { CustomFieldDefinition } from '@/types/custom-fields'

interface PageProps {
    params: Promise<{
        periodId: string
        trackId: string
    }>
}

export default async function RegisterPage({ params }: PageProps) {
    const { trackId, periodId } = await params
    const track = await getCourseTrack(trackId)

    if (!track) {
        notFound()
    }

    const customFields: CustomFieldDefinition[] = Array.isArray(track.CoursePeriod?.customFields)
        ? (track.CoursePeriod.customFields as CustomFieldDefinition[])
        : []

    return (
        <main className="container mx-auto py-rn-7 px-rn-4">
            <RegistrationWizard track={track} periodId={periodId} customFields={customFields} />
        </main>
    )
}
