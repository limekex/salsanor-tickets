import { getOrgEvents } from '@/app/actions/events'
import { getSelectedOrganizerForAdmin } from '@/utils/auth-org-admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Plus, Calendar, MapPin, Users, ExternalLink } from 'lucide-react'
import { PublishEventButton } from './publish-event-button'
import { DeleteEventButton } from './delete-event-button'
import { formatDateTimeShort } from '@/lib/formatters'
import { EmptyState } from '@/components/empty-state'

export default async function StaffAdminEventsPage() {
    // Get selected organization (from cookie or first available)
    const organizerId = await getSelectedOrganizerForAdmin()

    const events = await getOrgEvents(organizerId)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="rn-h2">Events</h2>
                    <p className="rn-body text-rn-text-muted mt-1">
                        Manage your organization's events
                    </p>
                </div>
                <Button asChild>
                    <Link href="/staffadmin/events/new">
                        <Plus className="h-4 w-4 mr-2" />
                        New Event
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Events</CardTitle>
                    <CardDescription>
                        {events.length} event{events.length !== 1 ? 's' : ''}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {events.length === 0 ? (
                        <EmptyState
                            icon={Calendar}
                            title="No Events Yet"
                            description="Create your first event to get started."
                            action={{
                                label: "Create First Event",
                                href: "/staffadmin/events/new"
                            }}
                        />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Event</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead>Capacity</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {events.map((event) => {
                                    const registrationCount = event._count.EventRegistration
                                    const capacityPercent = Math.round((registrationCount / event.capacityTotal) * 100)

                                    return (
                                        <TableRow key={event.id}>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">{event.title}</span>
                                                        {event.featured && (
                                                            <Badge variant="default" className="text-xs">Featured</Badge>
                                                        )}
                                                    </div>
                                                    {event.Category.length > 0 && (
                                                        <div className="flex gap-1 flex-wrap">
                                                            {event.Category.map(cat => (
                                                                <Badge key={cat.id} variant="outline" className="text-xs">
                                                                    {cat.icon} {cat.name}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {event.Tag.length > 0 && (
                                                        <div className="flex gap-1 flex-wrap">
                                                            {event.Tag.map(tag => (
                                                                <Badge 
                                                                    key={tag.id} 
                                                                    variant="secondary" 
                                                                    className="text-xs"
                                                                    style={{ 
                                                                        backgroundColor: (tag.color || '#888') + '20',
                                                                        color: tag.color || undefined,
                                                                        borderColor: tag.color || undefined
                                                                    }}
                                                                >
                                                                    {tag.name}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {event.eventType === 'RECURRING' ? 'Recurring' : 'Single'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                                    {formatDateTimeShort(event.startDateTime)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {event.city && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                                        {event.city}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Users className="h-4 w-4 text-muted-foreground" />
                                                    <span>{registrationCount} / {event.capacityTotal}</span>
                                                    <span className="text-muted-foreground">({capacityPercent}%)</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Badge 
                                                        variant={event.published ? 'default' : 'secondary'}
                                                    >
                                                        {event.status}
                                                    </Badge>
                                                    {!event.published && (
                                                        <Badge variant="outline">Draft</Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button asChild variant="ghost" size="sm">
                                                        <Link 
                                                            href={`/org/${event.Organizer.slug}/events/${event.slug}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1"
                                                        >
                                                            <ExternalLink className="h-4 w-4" />
                                                            View
                                                        </Link>
                                                    </Button>
                                                    <Button asChild variant="ghost" size="sm">
                                                        <Link href={`/staffadmin/events/${event.id}`}>
                                                            Edit
                                                        </Link>
                                                    </Button>
                                                    <PublishEventButton 
                                                        eventId={event.id}
                                                        eventTitle={event.title}
                                                        isPublished={event.published}
                                                    />
                                                    <DeleteEventButton 
                                                        eventId={event.id}
                                                        eventTitle={event.title}
                                                        hasRegistrations={registrationCount > 0}
                                                    />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
