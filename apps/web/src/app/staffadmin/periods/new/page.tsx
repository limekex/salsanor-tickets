import { prisma } from '@/lib/db'
import { StaffPeriodForm } from '../staff-period-form'
import { getSelectedOrganizerForAdmin } from '@/utils/auth-org-admin'

export default async function NewStaffPeriodPage() {
    // Get selected organization (from cookie or first available)
    const organizerId = await getSelectedOrganizerForAdmin()

    // Get organization details
    const organizer = await prisma.organizer.findUnique({
        where: { id: organizerId }
    })

    if (!organizer) {
        throw new Error('Organization not found')
    }

    // Fetch categories (global) and tags (for selected org)
    const [categories, tags] = await Promise.all([
        prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
        prisma.tag.findMany({ 
            where: { organizerId },
            orderBy: { name: 'asc' }
        })
    ])

    // Serialize Decimal fields for client component
    const serializedOrganizer = {
        ...organizer,
        mvaRate: organizer.mvaRate ? Number(organizer.mvaRate) : null,
        stripeFeePercentage: organizer.stripeFeePercentage ? Number(organizer.stripeFeePercentage) : null,
        platformFeePercent: organizer.platformFeePercent ? Number(organizer.platformFeePercent) : null,
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">New Course Period</h2>
            </div>
            <StaffPeriodForm 
                key={organizerId}
                organizerIds={[organizerId]}
                organizers={[serializedOrganizer as any]}
                categories={categories}
                tags={tags}
            />
        </div>
    )
}
