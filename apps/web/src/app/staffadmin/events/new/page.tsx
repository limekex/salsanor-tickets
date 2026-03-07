import { getSelectedOrganizerForAdmin } from '@/utils/auth-org-admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { EventForm } from '../event-form'
import { prisma } from '@/lib/db'

export default async function NewEventPage() {
    // Get selected organization (from cookie or first available)
    const organizerId = await getSelectedOrganizerForAdmin()

    // Get categories and tags for dropdowns
    const [categories, tags] = await Promise.all([
        prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
        prisma.tag.findMany({ 
            where: { organizerId },
            orderBy: { name: 'asc' }
        })
    ])

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/staffadmin/events">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Link>
                </Button>
                <div>
                    <h2 className="rn-h2">New Event</h2>
                    <p className="rn-body text-rn-text-muted mt-1">
                        Create a new event
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Event Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <EventForm 
                        key={organizerId}
                        organizerId={organizerId}
                        categories={categories}
                        tags={tags}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
