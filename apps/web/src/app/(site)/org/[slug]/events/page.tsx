import { getOrganizerEvents } from '@/app/actions/organizers'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import Link from 'next/link'
import { ArrowLeft, Calendar, MapPin, Clock } from 'lucide-react'

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

            {/* Events Grid */}
            {hasEvents ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {organizer.Event?.map((event) => (
                        <Card key={event.id} className="flex flex-col h-full">
                            <CardHeader>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                    <Calendar className="h-4 w-4" />
                                    {format(event.startDateTime, 'EEEE, MMMM d, yyyy')}
                                </div>
                                <CardTitle className="line-clamp-2">{event.title}</CardTitle>
                                {event.locationName && (
                                    <CardDescription className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {event.locationName}
                                    </CardDescription>
                                )}
                            </CardHeader>
                            <CardContent className="flex-1 space-y-3">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock className="h-4 w-4" />
                                    {format(event.startDateTime, 'HH:mm')}
                                    {event.endDateTime && ` - ${format(event.endDateTime, 'HH:mm')}`}
                                </div>
                                {event.shortDescription && (
                                    <p className="text-sm text-muted-foreground line-clamp-3">
                                        {event.shortDescription}
                                    </p>
                                )}
                            </CardContent>
                            <CardFooter className="flex justify-between items-center">
                                <span className="font-semibold text-lg">
                                    {(event.basePriceCents ?? 0) === 0 ? 'Free' : `${(event.basePriceCents ?? 0) / 100},-`}
                                </span>
                                <Button asChild>
                                    <Link href={`/events/${event.id}`}>
                                        View details
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        No upcoming events scheduled yet.
                    </CardContent>
                </Card>
            )}
        </main>
    )
}
