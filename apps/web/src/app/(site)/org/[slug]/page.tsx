import { getOrganizerBySlug } from '@/app/actions/organizers'
import { notFound } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ChevronRight, Globe, Mail, MapPin, Settings, UserPlus, CalendarX, CalendarOff } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { EventCard, EventGrid, EmptyState, CourseCard } from '@/components'
import { formatDateRange, formatDateShort } from '@/lib/formatters'

type Params = Promise<{ slug: string }>

export default async function OrganizerPage({ params }: { params: Params }) {
    const { slug } = await params
    const organizer = await getOrganizerBySlug(slug)

    if (!organizer) return notFound()

    // Check if user has admin access to this organizer and get their registrations
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    let hasOrgAccess = false
    let userRegistrations: { trackId: string }[] = []
    
    if (user) {
        const userAccount = await prisma.userAccount.findUnique({
            where: { supabaseUid: user.id },
            include: { 
                UserAccountRole: true,
                PersonProfile: {
                    include: {
                        Registration: {
                            where: {
                                status: { in: ['DRAFT', 'PENDING_PAYMENT', 'ACTIVE', 'WAITLIST'] }
                            },
                            select: { trackId: true }
                        }
                    }
                }
            }
        })
        const isGlobalAdmin = userAccount?.UserAccountRole.some(r => r.role === 'ADMIN')
        const isOrgAdmin = userAccount?.UserAccountRole.some(
            r => (r.role === 'ORG_ADMIN' || r.role === 'ORGANIZER') && r.organizerId === organizer.id
        )
        hasOrgAccess = (isGlobalAdmin || isOrgAdmin) ?? false
        userRegistrations = userAccount?.PersonProfile?.Registration || []
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
            <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                    <h2 className="text-2xl font-semibold">Upcoming Events</h2>
                    {hasEvents && (
                        <Button variant="ghost" size="sm" asChild>
                            <Link href={`/org/${slug}/events`}>
                                View all
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Link>
                        </Button>
                    )}
                </div>

                {hasEvents ? (
                    <EventGrid>
                        {organizer.Event?.slice(0, 3).map((event) => (
                            <EventCard 
                                key={event.id}
                                event={event}
                                compact={true}
                                href={`/org/${slug}/events/${event.slug}`}
                            />
                        ))}
                    </EventGrid>
                ) : (
                    <EmptyState 
                        icon={CalendarX}
                        title="No Upcoming Events"
                        description={`${organizer.name} has no upcoming events at the moment.`}
                    />
                )}
            </div>

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

                    {organizer.CoursePeriod?.map((period) => {
                        const isSalesOpen = period.salesOpenAt < new Date() && period.salesCloseAt > new Date()
                        
                        return (
                            <div key={period.id} className="space-y-4">
                                <div>
                                    <h3 className="text-xl font-semibold">{period.name}</h3>
                                    <p className="text-muted-foreground">
                                        {formatDateRange(period.startDate, period.endDate)} • {period.city}
                                    </p>
                                    {period.PeriodBreak && period.PeriodBreak.length > 0 && (
                                        <p className="rn-caption text-rn-text-muted mt-1 flex items-center gap-1">
                                            <CalendarOff className="h-3.5 w-3.5" />
                                            <span>
                                                Breaks: {period.PeriodBreak.map((b: { description: string | null; startDate: Date; endDate: Date }) => 
                                                    b.description 
                                                        ? `${b.description} (${formatDateShort(b.startDate)}–${formatDateShort(b.endDate)})`
                                                        : `${formatDateShort(b.startDate)}–${formatDateShort(b.endDate)}`
                                                ).join(', ')}
                                            </span>
                                        </p>
                                    )}
                                </div>

                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {period.CourseTrack.slice(0, 3).map((track) => {
                                        // Parse discount info from period and org rules
                                        const allRules = [
                                            ...(period.DiscountRule || []),
                                            ...(organizer.OrgDiscountRule || [])
                                        ]
                                        const memberRule = allRules.find(r => r.ruleType === 'MEMBERSHIP_TIER_PERCENT')
                                        const multiCourseRule = allRules.find(r => r.ruleType === 'MULTI_COURSE_TIERED')
                                        const discountInfo = {
                                            memberDiscountPercent: memberRule?.config && typeof memberRule.config === 'object' 
                                                ? (memberRule.config as any).discountPercent 
                                                : null,
                                            hasMultiCourseDiscount: !!multiCourseRule
                                        }
                                        
                                        return (
                                            <CourseCard 
                                                key={track.id}
                                                track={track}
                                                period={period}
                                                weekDayLabel={['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][track.weekday - 1]}
                                                isSalesOpen={isSalesOpen}
                                                isRegistered={userRegistrations.some(r => r.trackId === track.id)}
                                                organizerId={organizer.id}
                                                organizerName={organizer.name}
                                                discountInfo={discountInfo}
                                            />
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
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
