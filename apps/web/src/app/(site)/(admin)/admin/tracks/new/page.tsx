
import { TrackForm } from '../track-form'

type SearchParams = Promise<{ periodId?: string }>

export default async function NewTrackPage({
    searchParams,
}: {
    searchParams: SearchParams
}) {
    const { periodId } = await searchParams

    if (!periodId) {
        return <div>Error: No period specified</div>
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">New Course Track</h2>
            </div>
            <TrackForm periodId={periodId} />
        </div>
    )
}
