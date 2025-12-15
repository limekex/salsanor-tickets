
import { getCourseTrack } from '@/app/actions/courses'
import { notFound } from 'next/navigation'
import { RegistrationWizard } from './wizard'

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

    return (
        <div className="container mx-auto py-10">
            <RegistrationWizard track={track} periodId={periodId} />
        </div>
    )
}
