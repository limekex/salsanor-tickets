import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calendar, MapPin, Users, Clock, DollarSign, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { nb } from 'date-fns/locale'
import Link from 'next/link'
import { RegisterButton } from './register-button'
import { createClient } from '@/utils/supabase/server'

type PageProps = {
    params: Promise<{ slug: string; eventSlug: string }>
}

export default async function PublicEventDetailPage({ params }: PageProps) {
    const { slug, eventSlug } = await params

    // Check user membership
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    let isMember = false

    if (user) {
        const userAccount = await prisma.userAccount.findUnique({
            where: { supabaseUid: user.id },
            include: {
                PersonProfile: {
                    include: {
                        Membership: {
                            where: {
                                status: 'ACTIVE',
                                validTo: {
                                    gte: new Date()
                                }
                            },
                            take: 1
                        }
                    }
                }
            }
        })

        isMember = (userAccount?.PersonProfile?.Membership?.length ?? 0) > 0
    }

    const event = await prisma.event.findFirst({
        where: {
            slug: eventSlug,
            Organizer: {
                slug: slug
            },
            published: true
        },
        include: {
            Organizer: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    logoUrl: true
                }
            },
            Category: {
                select: {
                    name: true,
                    icon: true,
                    slug: true
                }
            },
            Tag: {
                select: {
                    name: true,
                    color: true
                }
            },
            EventRegistration: {
                select: { quantity: true },
                where: { status: 'ACTIVE' }
            },
            _count: {
                select: {
                    EventSession: true
                }
            }
        }
    })

    if (!event) {
        notFound()
    }

    // Sum up all ticket quantities from active registrations
    const registeredCount = event.EventRegistration.reduce((sum, reg) => sum + reg.quantity, 0)
    const spotsLeft = event.capacityTotal - registeredCount
    const isFull = spotsLeft <= 0
    const salesOpen = event.salesOpenAt ? new Date(event.salesOpenAt) <= new Date() : true
    const salesClosed = event.salesCloseAt ? new Date(event.salesCloseAt) <= new Date() : false
    const canRegister = salesOpen && !salesClosed && !isFull

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            {/* Header */}
            <div className="mb-6">
                <Link 
                    href={`/org/${slug}/events`}
                    className="text-sm text-rn-text-muted hover:text-rn-text inline-block"
                >
                    ← Back to Events
                </Link>
                
                {event.featured && (
                    <Badge className="mb-3 ml-6">Featured Event</Badge>
                )}
                
                <h1 className="text-4xl font-bold text-rn-text mb-3">{event.title}</h1>
                
                <p className="text-lg text-rn-text-muted mb-4">{event.shortDescription}</p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                    {event.Category.map(cat => (
                        <Badge key={cat.slug} variant="secondary">
                            {cat.icon} {cat.name}
                        </Badge>
                    ))}
                    {event.Tag.map((tag, idx) => (
                        <Badge 
                            key={idx}
                            variant="outline"
                            style={{ 
                                borderColor: tag.color ?? undefined,
                                color: tag.color ?? undefined
                            }}
                        >
                            {tag.name}
                        </Badge>
                    ))}
                </div>
            </div>

            {/* Main Image */}
            {event.imageUrl && (
                <div className="mb-8 rounded-lg overflow-hidden">
                    <img 
                        src={event.imageUrl} 
                        alt={event.title}
                        className="w-full h-96 object-cover"
                    />
                </div>
            )}

            <div className="grid md:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="md:col-span-2 space-y-6">
                    {/* Event Details Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Event Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-start gap-3">
                                <Calendar className="h-5 w-5 text-rn-text-muted mt-0.5" />
                                <div>
                                    <div className="font-medium">
                                        {format(new Date(event.startDateTime), 'EEEE, d. MMMM yyyy', { locale: nb })}
                                    </div>
                                    <div className="text-sm text-rn-text-muted">
                                        {format(new Date(event.startDateTime), 'HH:mm')}
                                        {event.endDateTime && ` - ${format(new Date(event.endDateTime), 'HH:mm')}`}
                                    </div>
                                    {event.eventType === 'RECURRING' && event._count.EventSession > 0 && (
                                        <div className="text-sm text-rn-text-muted mt-1">
                                            Recurring event ({event._count.EventSession} sessions)
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <MapPin className="h-5 w-5 text-rn-text-muted mt-0.5" />
                                <div>
                                    <div className="font-medium">{event.locationName}</div>
                                    {event.locationAddress && (
                                        <div className="text-sm text-rn-text-muted">{event.locationAddress}</div>
                                    )}
                                    <div className="text-sm text-rn-text-muted">{event.city}</div>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <Users className="h-5 w-5 text-rn-text-muted mt-0.5" />
                                <div>
                                    <div className="font-medium">Capacity</div>
                                    <div className="text-sm text-rn-text-muted">
                                        {registeredCount} / {event.capacityTotal} registered
                                    </div>
                                    {spotsLeft > 0 && spotsLeft <= 15 && (
                                        <div className="text-sm font-semibold text-amber-600 mt-1">
                                            🔥 Few tickets left! Only {spotsLeft} remaining
                                        </div>
                                    )}
                                </div>
                            </div>

                            {(event.basePriceCents > 0 || (event.memberPriceCents && event.memberPriceCents > 0)) && (
                                <div className="flex items-start gap-3">
                                    <DollarSign className="h-5 w-5 text-rn-text-muted mt-0.5" />
                                    <div>
                                        <div className="font-medium">Price</div>
                                        {event.basePriceCents > 0 && (
                                            <div className="text-sm text-rn-text-muted">
                                                Regular: {(event.basePriceCents / 100).toFixed(0)} NOK
                                            </div>
                                        )}
                                        {event.memberPriceCents && event.memberPriceCents > 0 && (
                                            <div className="text-sm text-rn-text-muted">
                                                Members: {(event.memberPriceCents / 100).toFixed(0)} NOK
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Description */}
                    {event.longDescription && (
                        <Card>
                            <CardHeader>
                                <CardTitle>About This Event</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-rn-text-muted whitespace-pre-wrap">
                                    {event.longDescription}
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                    {/* Registration Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Registration</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {isFull ? (
                                <div className="text-center">
                                    <Badge variant="secondary" className="mb-2">Event Full</Badge>
                                    <p className="text-sm text-rn-text-muted">
                                        This event has reached capacity
                                    </p>
                                </div>
                            ) : !salesOpen ? (
                                <div className="text-center">
                                    <Badge variant="secondary" className="mb-2">Not Open Yet</Badge>
                                    <p className="text-sm text-rn-text-muted">
                                        Sales open: {event.salesOpenAt && format(new Date(event.salesOpenAt), 'PPP', { locale: nb })}
                                    </p>
                                </div>
                            ) : salesClosed ? (
                                <div className="text-center">
                                    <Badge variant="secondary" className="mb-2">Sales Closed</Badge>
                                    <p className="text-sm text-rn-text-muted">
                                        Registration period has ended
                                    </p>
                                </div>
                            ) : (
                                <>  
                                    {spotsLeft > 0 && spotsLeft <= 15 && (
                                        <Alert className="border-amber-500 bg-amber-50">
                                            <AlertCircle className="h-4 w-4 text-amber-600" />
                                            <AlertDescription className="text-amber-800 font-medium">
                                                🔥 Hurry! Only {spotsLeft} tickets left
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                    <RegisterButton 
                                        event={{
                                            id: event.id,
                                            title: event.title,
                                            organizerId: event.Organizer.id,
                                            organizerName: event.Organizer.name,
                                            priceSingleCents: event.basePriceCents,
                                            memberPriceSingleCents: event.memberPriceCents,
                                            maxCapacity: event.capacityTotal,
                                            currentRegistrations: registeredCount
                                        }}
                                        isMember={isMember}
                                        className="w-full"
                                    />
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Organizer Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Organizer</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-3">
                                {event.Organizer.logoUrl && (
                                    <img 
                                        src={event.Organizer.logoUrl} 
                                        alt={event.Organizer.name}
                                        className="w-12 h-12 rounded-full object-cover"
                                    />
                                )}
                                <div>
                                    <div className="font-medium">{event.Organizer.name}</div>
                                    <Link 
                                        href={`/org/${event.Organizer.slug}`}
                                        className="text-sm text-rn-accent hover:underline"
                                    >
                                        View all events
                                    </Link>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
