import { getOrganizerCourses } from '@/app/actions/organizers'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, GraduationCap, CalendarOff } from 'lucide-react'
import { formatDateRange, formatWeekday, formatDateShort } from '@/lib/formatters'
import { CourseCard, EmptyState } from '@/components'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'

type Params = Promise<{ slug: string }>

export default async function OrganizerCoursesPage({ params }: { params: Params }) {
    const { slug } = await params
    const organizer = await getOrganizerCourses(slug)

    if (!organizer) return notFound()

    const hasCourses = organizer.CoursePeriod && organizer.CoursePeriod.length > 0

    // Get user's existing registrations
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let userRegistrations: { trackId: string }[] = []
    if (user) {
        const userAccount = await prisma.userAccount.findUnique({
            where: { supabaseUid: user.id },
            include: {
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
        userRegistrations = userAccount?.PersonProfile?.Registration || []
    }

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
                    <h1 className="rn-h1">Courses</h1>
                    <p className="text-muted-foreground mt-1">
                        All upcoming courses from {organizer.name}
                    </p>
                </div>
            </div>

            {/* Courses */}
            {hasCourses ? (
                <div className="space-y-8">
                    {organizer.CoursePeriod?.map((period) => (
                        <div key={period.id} className="space-y-4">
                            <div className="border-b pb-2">
                                <h2 className="text-xl font-semibold">{period.name}</h2>
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
                                {period.CourseTrack.map((track) => {
                                    const isSalesOpen = period.salesOpenAt < new Date() && period.salesCloseAt > new Date()
                                    const weekDayLabel = formatWeekday(track.weekday)
                                    const isRegistered = userRegistrations.some(r => r.trackId === track.id)
                                    
                                    // Parse discount info - use default membership tier if available
                                    const defaultTier = (organizer as any).MembershipTier?.[0]
                                    const hasActiveMembershipTiers = !!defaultTier
                                    const multiCourseRule = period.DiscountRule?.find(r => r.ruleType === 'MULTI_COURSE_TIERED')
                                    const discountInfo = {
                                        memberDiscountPercent: hasActiveMembershipTiers
                                            ? ((organizer as any).resolvedMemberDiscountPercent ?? null)
                                            : null,
                                        hasMultiCourseDiscount: !!multiCourseRule,
                                        hasActiveMembershipTiers
                                    }

                                    return (
                                        <CourseCard
                                            key={track.id}
                                            track={track}
                                            period={period}
                                            weekDayLabel={weekDayLabel}
                                            isSalesOpen={isSalesOpen}
                                            isRegistered={isRegistered}
                                            organizerId={organizer.id}
                                            organizerName={organizer.name}
                                            discountInfo={discountInfo}
                                        />
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <EmptyState 
                    icon={GraduationCap}
                    title="No Courses Yet"
                    description={`${organizer.name} doesn't have any upcoming courses scheduled.`}
                />
            )}
        </main>
    )
}
