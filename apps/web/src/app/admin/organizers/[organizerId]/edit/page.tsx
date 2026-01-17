'use client'

import { getOrganizer } from '@/app/actions/organizers'
import { notFound } from 'next/navigation'
import { OrganizerForm } from '../../organizer-form'
import { useEffect, useState } from 'react'
import type { Organizer } from '@salsanor/database'

type Params = Promise<{ organizerId: string }>
type SerializedOrganizer = Omit<Organizer, 'mvaRate' | 'stripeFeePercentage' | 'fiscalYearStart'> & {
    mvaRate: number
    stripeFeePercentage: number
    fiscalYearStart: string | null
}

export default function EditOrganizerPage({ params }: { params: Params }) {
    const [organizer, setOrganizer] = useState<SerializedOrganizer | null | undefined>(undefined)
    
    useEffect(() => {
        params.then(({ organizerId }) => {
            getOrganizer(organizerId).then((org) => {
                if (!org) {
                    setOrganizer(null)
                    return
                }
                
                // Serialize Decimal fields for client component
                const serializedOrganizer = {
                    ...org,
                    mvaRate: Number(org.mvaRate),
                    stripeFeePercentage: Number(org.stripeFeePercentage),
                    fiscalYearStart: org.fiscalYearStart?.toISOString() ?? null,
                }
                setOrganizer(serializedOrganizer)
            })
        })
    }, [params])
    
    if (organizer === undefined) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold">Edit Organizer</h2>
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        )
    }
    
    if (organizer === null) {
        return notFound()
    }

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
