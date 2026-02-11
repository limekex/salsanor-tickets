import { prisma } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { CalendarX } from 'lucide-react'
import { EventFilters } from './event-filters'
import { EventCard, EventGrid, EmptyState } from '@/components'

type SearchParams = Promise<{ 
    org?: string
    category?: string
    tag?: string
}>

export default async function EventsPage({ searchParams }: { searchParams: SearchParams }) {
    const params = await searchParams
    const { org, category, tag } = params
    
    const now = new Date()
    
    // Build where conditions
    const where: any = {
        published: true,
        startDateTime: { gte: now },
    }
    
    if (org && org !== 'all') {
        where.organizerId = org
    }
    
    if (category && category !== 'all') {
        where.categories = { some: { id: category } }
    }
    
    if (tag && tag !== 'all') {
        where.tags = { some: { id: tag } }
    }

    const [events, organizers, categories, tags] = await Promise.all([
        prisma.event.findMany({
            where,
            include: {
                Organizer: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        logoUrl: true,
                    }
                },
                Category: true,
                Tag: true,
                EventRegistration: {
                    select: { quantity: true },
                    where: { status: 'ACTIVE' }
                }
            },
            orderBy: { startDateTime: 'asc' },
            take: 50,
        }),
        prisma.organizer.findMany({
            select: { id: true, name: true, slug: true },
            orderBy: { name: 'asc' }
        }),
        prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
        prisma.tag.findMany({ orderBy: { name: 'asc' } })
    ])

    const hasActiveFilters = org || category || tag

    return (
        <main className="container mx-auto py-rn-7 px-rn-4 space-y-rn-7 max-w-6xl">
            <div className="text-center space-y-rn-4">
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Upcoming Events</h1>
                <p className="rn-h3 text-rn-text-muted">Discover and join exciting dance events</p>
            </div>

            {/* Filters */}
            <Card className="border-rn-border">
                <CardContent className="pt-rn-6">
                    <EventFilters 
                        organizers={organizers}
                        categories={categories}
                        tags={tags}
                        currentOrg={org}
                        currentCategory={category}
                        currentTag={tag}
                    />
                </CardContent>
            </Card>

            {/* Events or Empty State */}
            {events.length === 0 ? (
                <EmptyState 
                    icon={CalendarX}
                    title="No Upcoming Events"
                    description={hasActiveFilters 
                        ? "No events match your current filters. Try adjusting or clearing them to see more events."
                        : "There are currently no upcoming events scheduled. Check back soon for new events!"
                    }
                    action={hasActiveFilters ? {
                        label: "Clear Filters",
                        href: "/events"
                    } : undefined}
                />
            ) : (
                <EventGrid>
                    {events.map((event) => (
                        <EventCard 
                            key={event.id}
                            event={event}
                            showOrganizer={true}
                            href={`/org/${event.Organizer.slug}/events/${event.slug}`}
                        />
                    ))}
                </EventGrid>
            )}
        </main>
    )
}
