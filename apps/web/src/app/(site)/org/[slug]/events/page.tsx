import { getOrganizerEvents } from '@/app/actions/organizers'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, CalendarX } from 'lucide-react'
import { EventCard, EventGrid, EmptyState } from '@/components'

type Params = Promise<{ slug: string }>

export default async function OrganizerEventsPage({ params }: { params: Params }) {
    const { slug } = await params
    const organizer = await getOrganizerEvents(slug)

    if (!organizer) return notFound()

    const hasEvents = organizer.Event && organizer.Event.length > 0

    return (
        <main className="container mx-auto py-rn-7 px-rn-4 space-y-rn-6 max-w-5xl">
            {/* Header */}
            <div className="space-y-4">
                <Button variant="ghost" size="sm" asChild>
                    <Link href={`/org/${slug}`}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to {organizer.name}
                    </Link>
                </Button>
                
                <div>
                    <h1 className="rn-h1">Events</h1>
                    <p className="text-muted-foreground mt-1">
                        All upcoming events from {organizer.name}
                    </p>
                </div>
            </div>

            {/* Events Grid or Empty State */}
            {hasEvents ? (
                <EventGrid>
                    {organizer.Event?.map((event) => (
                        <EventCard 
                            key={event.id}
                            event={event}
                            href={`/org/${slug}/events/${event.slug}`}
                        />
                    ))}
                </EventGrid>
            ) : (
                <EmptyState 
                    icon={CalendarX}
                    title="No Upcoming Events"
                    description={`${organizer.name} has no upcoming events scheduled yet. Check back soon for new events!`}
                />
            )}
        </main>
    )
}
