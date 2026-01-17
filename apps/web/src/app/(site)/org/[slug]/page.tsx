import { getOrganizerBySlug } from '@/app/actions/organizers'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import Link from 'next/link'
import { Calendar, ChevronRight, Globe, Mail, MapPin, Settings, UserPlus } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'

type Params = Promise<{ slug: string }>

export default async function OrganizerPage({ params }: { params: Params }) {
    const { slug } = await params
    const organizer = await getOrganizerBySlug(slug)

    if (!organizer) return notFound()

    // Check if user has admin access to this organizer
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    let hasOrgAccess = false
    
    if (user) {
        const userAccount = await prisma.userAccount.findUnique({
            where: { supabaseUid: user.id },
            include: { UserAccountRole: true }
        })
        const isGlobalAdmin = userAccount?.UserAccountRole.some(r => r.role === 'ADMIN')
        const isOrgAdmin = userAccount?.UserAccountRole.some(
            r => (r.role === 'ORG_ADMIN' || r.role === 'ORGANIZER') && r.organizerId === organizer.id
        )
        hasOrgAccess = (isGlobalAdmin || isOrgAdmin) ?? false
    }

    const weekDayName = (n: number) => {
        return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][n - 1] || '?'
    }

    const hasEvents = organizer.Event && organizer.Event.length > 0
    const hasCourses = organizer.CoursePeriod && organizer.CoursePeriod.length > 0

    return (
        <main className="container mx-auto py-rn-7 px-rn-4 space-y-rn-7 max-w-5xl">
            {/* Organizer Header */}
            <div className="space-y-rn-4">
                <div className="flex items-start gap-rn-6">
                    {organizer.logoUrl && (
                        <img
                            src={organizer.logoUrl}
                            alt={organizer.name}
                            className="w-24 h-24 object-contain rounded-rn-2 border"
                        />
                    )}
                    <div className="flex-1">
                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="rn-h1">{organizer.name}</h1>
                                {organizer.description && (
                                    <p className="rn-h3 text-rn-text-muted mt-2">{organizer.description}</p>
                                )}
                            </div>
                            <div className="flex gap-rn-2">
                                {organizer.membershipEnabled && organizer.membershipSalesOpen && (
                                    <Button variant="default" size="sm" asChild>
                                        <Link href={`/org/${slug}/membership`}>
                                            <UserPlus className="h-4 w-4 mr-2" />
                                            Become a Member
                                        </Link>
                                    </Button>
                                )}
                                {hasOrgAccess && (
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href="/staffadmin">
                                            <Settings className="h-4 w-4 mr-2" />
                                            Admin
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
                            {organizer.city && (
                                <div className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    {organizer.city}, {organizer.country}
                                </div>
                            )}
                            {organizer.website && (
                                <a href={organizer.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground">
                                    <Globe className="h-4 w-4" />
                                    Website
                                </a>
                            )}
                            {organizer.contactEmail && (
                                <a href={`mailto:${organizer.contactEmail}`} className="flex items-center gap-1 hover:text-foreground">
                                    <Mail className="h-4 w-4" />
                                    {organizer.contactEmail}
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Upcoming Events */}
            {hasEvents && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                        <h2 className="text-2xl font-semibold">Upcoming Events</h2>
                        <Button variant="ghost" size="sm" asChild>
                            <Link href={`/org/${slug}/events`}>
                                View all
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Link>
                        </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {organizer.Event?.map((event) => (
                            <Card key={event.id} className="flex flex-col h-full">
                                <CardHeader>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                        <Calendar className="h-4 w-4" />
                                        {format(event.startDateTime, 'EEEE, MMMM d')}
                                    </div>
                                    <CardTitle className="line-clamp-2">{event.title}</CardTitle>
                                    {event.locationName && (
                                        <CardDescription className="flex items-center gap-1">
                                            <MapPin className="h-3 w-3" />
                                            {event.locationName}
                                        </CardDescription>
                                    )}
                                </CardHeader>
                                <CardContent className="flex-1">
                                    {event.shortDescription && (
                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                            {event.shortDescription}
                                        </p>
                                    )}
                                </CardContent>
                                <CardFooter className="flex justify-between items-center">
                                    <span className="font-semibold">
                                        {(event.basePriceCents ?? 0) === 0 ? 'Free' : `${(event.basePriceCents ?? 0) / 100},-`}
                                    </span>
                                    <Button size="sm" asChild>
                                        <Link href={`/events/${event.id}`}>
                                            View details
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Upcoming Courses */}
            {hasCourses && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                        <h2 className="text-2xl font-semibold">Upcoming Courses</h2>
                        <Button variant="ghost" size="sm" asChild>
                            <Link href={`/org/${slug}/courses`}>
                                View all
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Link>
                        </Button>
                    </div>

                    {organizer.CoursePeriod?.map((period) => (
                        <div key={period.id} className="space-y-4">
                            <div>
                                <h3 className="text-xl font-semibold">{period.name}</h3>
                                <p className="text-muted-foreground">
                                    {format(period.startDate, 'MMMM d')} - {format(period.endDate, 'MMMM d, yyyy')} • {period.city}
                                </p>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {period.CourseTrack.slice(0, 3).map((track) => {
                                    const isSalesOpen = period.salesOpenAt < new Date() && period.salesCloseAt > new Date()

                                    return (
                                        <Card key={track.id} className="flex flex-col h-full">
                                            <CardHeader>
                                                <div className="flex justify-between items-start">
                                                    <Badge variant="outline">{weekDayName(track.weekday)}</Badge>
                                                    {track.levelLabel && <Badge>{track.levelLabel}</Badge>}
                                                </div>
                                                <CardTitle className="pt-2">{track.title}</CardTitle>
                                                <CardDescription>
                                                    {track.timeStart} - {track.timeEnd}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="flex-1 space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span>Single:</span>
                                                    <span className="font-semibold">{track.priceSingleCents / 100},-</span>
                                                </div>
                                                {track.pricePairCents && (
                                                    <div className="flex justify-between">
                                                        <span>Couple:</span>
                                                        <span className="font-semibold text-green-600">{track.pricePairCents / 100},-</span>
                                                    </div>
                                                )}
                                            </CardContent>
                                            <CardFooter>
                                                <Button className="w-full" disabled={!isSalesOpen} asChild={isSalesOpen}>
                                                    {isSalesOpen ? (
                                                        <Link href={`/courses/${period.id}/${track.id}/register`}>
                                                            Register
                                                        </Link>
                                                    ) : (
                                                        <span>Sales Closed</span>
                                                    )}
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* No content message */}
            {!hasEvents && !hasCourses && (
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        No upcoming events or courses scheduled yet.
                    </CardContent>
                </Card>
            )}
        </main>
    )
}
