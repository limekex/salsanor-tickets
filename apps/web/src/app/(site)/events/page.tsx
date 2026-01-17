import { prisma } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import Link from 'next/link'
import { Calendar, MapPin, Users, Clock, CalendarX } from 'lucide-react'
import { EventFilters } from './event-filters'

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

            {events.length === 0 && (
                <Card className="border-rn-border">
                    <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
                        <CalendarX className="h-16 w-16 text-muted-foreground" />
                        <div className="text-center space-y-2">
                            <h3 className="text-xl font-semibold">No Upcoming Events</h3>
                            <p className="text-muted-foreground max-w-md">
                                There are currently no upcoming events scheduled. Check back soon for new events, or try adjusting your filters.
                            </p>
                        </div>
                        {(org || category || tag) && (
                            <Button asChild variant="outline">
                                <Link href="/events">Clear Filters</Link>
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {events.map((event) => {
                    // Sum up all ticket quantities from active registrations
                    const registeredCount = event.EventRegistration.reduce((sum, reg) => sum + reg.quantity, 0)
                    const spotsLeft = event.capacityTotal - registeredCount
                    const capacityPercent = event.capacityTotal > 0 
                        ? Math.round((registeredCount / event.capacityTotal) * 100)
                        : 0

                    return (
                        <Card key={event.id} className="flex flex-col">
                            {event.imageUrl && (
                                <div className="aspect-video relative overflow-hidden rounded-t-lg">
                                    <img 
                                        src={event.imageUrl} 
                                        alt={event.title}
                                        className="object-cover w-full h-full"
                                    />
                                </div>
                            )}
                            <CardHeader>
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <CardTitle className="text-xl">{event.title}</CardTitle>
                                    {event.featured && (
                                        <Badge variant="default">Featured</Badge>
                                    )}
                                </div>
                                <CardDescription>{event.shortDescription}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3 flex-grow">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Calendar className="h-4 w-4" />
                                    <span>{format(event.startDateTime, 'PPP')}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock className="h-4 w-4" />
                                    <span>{format(event.startDateTime, 'p')}</span>
                                    {event.endDateTime && ` - ${format(event.endDateTime, 'p')}`}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <MapPin className="h-4 w-4" />
                                    <span>{event.locationName}, {event.city}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Users className="h-4 w-4" />
                                    <span>
                                        {spotsLeft > 0 
                                            ? `${spotsLeft} spots left` 
                                            : 'Full'
                                        } • {capacityPercent}% full
                                    </span>
                                </div>

                                {/* Categories */}
                                {event.Category.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {event.Category.map(cat => (
                                            <Badge key={cat.id} variant="outline" className="text-xs">
                                                {cat.icon} {cat.name}
                                            </Badge>
                                        ))}
                                    </div>
                                )}

                                {/* Tags */}
                                {event.Tag.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {event.Tag.map(t => (
                                            <Badge 
                                                key={t.id} 
                                                variant="secondary"
                                                className="text-xs"
                                                style={{ 
                                                    backgroundColor: (t.color ?? '#888888') + '20',
                                                    borderColor: t.color ?? undefined,
                                                    color: t.color ?? undefined
                                                }}
                                            >
                                                {t.name}
                                            </Badge>
                                        ))}
                                    </div>
                                )}

                                <div className="pt-2">
                                    <p className="text-lg font-bold">
                                        {event.basePriceCents === 0 ? 'Free' : `${(event.basePriceCents / 100).toFixed(0)} kr`}
                                    </p>
                                    {event.memberPriceCents && event.memberPriceCents > 0 && event.memberPriceCents < event.basePriceCents && (
                                        <p className="text-sm text-muted-foreground">
                                            Members: {(event.memberPriceCents / 100).toFixed(0)} kr
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                            <CardFooter className="flex flex-col gap-2">
                                <Button asChild className="w-full">
                                    <Link href={`/org/${event.Organizer.slug}/events/${event.slug}`}>
                                        View Details
                                    </Link>
                                </Button>
                                <Link 
                                    href={`/org/${event.Organizer.slug}`}
                                    className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2"
                                >
                                    {event.Organizer.logoUrl && (
                                        <img 
                                            src={event.Organizer.logoUrl} 
                                            alt={event.Organizer.name}
                                            className="h-5 w-5 object-contain"
                                        />
                                    )}
                                    {event.Organizer.name}
                                </Link>
                            </CardFooter>
                        </Card>
                    )
                })}
            </div>
        </main>
    )
}
