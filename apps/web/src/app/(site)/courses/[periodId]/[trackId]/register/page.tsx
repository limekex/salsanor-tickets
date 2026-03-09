
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

    const period = track.CoursePeriod as { customFields?: unknown } | null
    const customFields: CustomFieldDefinition[] = Array.isArray(period?.customFields)
        ? (period.customFields as CustomFieldDefinition[])
        : []

    // Read templateType from track (track-level setting)
    const templateType = (track as { templateType?: string }).templateType ?? 'INDIVIDUAL'
    
    // Extract slot booking fields for PRIVATE template
    const trackWithSlots = track as typeof track & {
        slotStartTime?: string | null
        slotDurationMinutes?: number | null
        slotBreakMinutes?: number | null
        slotCount?: number | null
        pricePerSlotCents?: number | null
        maxContinuousSlots?: number | null
    }

    // Build wizard track data, explicitly including slot booking fields
    const wizardTrack = {
        id: track.id,
        title: track.title,
        priceSingleCents: track.priceSingleCents,
        pricePairCents: track.pricePairCents,
        // Slot booking fields
        slotStartTime: trackWithSlots.slotStartTime,
        slotDurationMinutes: trackWithSlots.slotDurationMinutes,
        slotBreakMinutes: trackWithSlots.slotBreakMinutes,
        slotCount: trackWithSlots.slotCount,
        pricePerSlotCents: trackWithSlots.pricePerSlotCents,
        maxContinuousSlots: trackWithSlots.maxContinuousSlots,
        CoursePeriod: track.CoursePeriod
    }

    return (
        <main className="container mx-auto py-rn-7 px-rn-4">
            <RegistrationWizard
                track={wizardTrack}
                periodId={periodId}
                customFields={customFields}
                templateType={templateType}
            />
        </main>
    )
}
