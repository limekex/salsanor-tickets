import { getPublicCoursePeriods, getAvailableCourseLevels } from '@/app/actions/courses'
import { getPublicOrganizers } from '@/app/actions/organizers'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { CourseFilters } from './course-filters'
import { CourseCard, EmptyState } from '@/components'
import { formatDateRange, formatWeekday, formatDateShort } from '@/lib/formatters'
import { GraduationCap, CalendarOff } from 'lucide-react'

type SearchParams = Promise<{ 
    org?: string
    level?: string
    weekday?: string
    timeAfter?: string
    timeBefore?: string
    category?: string
    tag?: string
}>

export default async function CoursesPage({ searchParams }: { searchParams: SearchParams }) {
    const params = await searchParams
    const { org, level, weekday, timeAfter, timeBefore, category, tag } = params
    
    const filters = {
        organizerId: org && org !== 'all' ? org : undefined,
        levelLabel: level && level !== 'all' ? level : undefined,
        weekday: weekday ? parseInt(weekday) : undefined,
        timeAfter,
        timeBefore,
        categoryId: category && category !== 'all' ? category : undefined,
        tagId: tag && tag !== 'all' ? tag : undefined,
    }
    
    const periods = await getPublicCoursePeriods(filters)
    const organizers = await getPublicOrganizers()
    const availableLevels = await getAvailableCourseLevels()
    
    // Get categories and tags for filters
    const [categories, tags] = await Promise.all([
        prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
        prisma.tag.findMany({ orderBy: { name: 'asc' } })
    ])

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
        <main className="container mx-auto py-rn-7 px-rn-4 space-y-rn-7 max-w-5xl">
            <div className="text-center space-y-rn-4">
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Upcoming Courses</h1>
                <p className="rn-h3 text-rn-text-muted">Find your next salsa class and join the fun!</p>
            </div>

            {/* Filters */}
            <CourseFilters 
                availableLevels={availableLevels}
                organizers={organizers}
                categories={categories}
                tags={tags}
                currentFilters={{
                    org: org || 'all',
                    level: level || 'all',
                    weekday: weekday || 'all',
                    timeAfter: timeAfter || 'all',
                    timeBefore: timeBefore || 'all',
                    category: category || 'all',
                    tag: tag || 'all',
                }}
            />

            {periods.length === 0 ? (
                <EmptyState 
                    icon={GraduationCap}
                    title="No Upcoming Courses"
                    description="No courses match your filters. Try adjusting your search criteria."
                />
            ) : (
                periods.map((period) => (
                <div key={period.id} className="space-y-rn-6">
                    <div className="border-b border-rn-border pb-rn-2">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-rn-2">
                            <div>
                                <h2 className="rn-h2">{period.name}</h2>
                                <p className="rn-meta text-rn-text-muted">
                                    {formatDateRange(period.startDate, period.endDate)} • {period.city}
                                </p>
                                {period.PeriodBreak && period.PeriodBreak.length > 0 && (
                                    <p className="rn-caption text-rn-text-muted mt-rn-1 flex items-center gap-rn-1">
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
                            <Link href={`/org/${period.Organizer.slug}`} className="rn-caption text-rn-text-muted hover:text-rn-text flex items-center gap-rn-2">
                                {period.Organizer.logoUrl && (
                                    <img src={period.Organizer.logoUrl} alt={period.Organizer.name} className="h-8 w-8 object-contain" />
                                )}
                                <span>{period.Organizer.name}</span>
                            </Link>
                        </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {period.CourseTrack.map((track) => {
                            const isSalesOpen = period.salesOpenAt < new Date() && period.salesCloseAt > new Date()
                            const isFull = track.capacityTotal <= 0 // Simplified full check, need registration count later
                            const isRegistered = userRegistrations.some(r => r.trackId === track.id)
                            const weekDayLabel = formatWeekday(track.weekday)
                            
                            // Parse discount info - use default membership tier if available
                            const defaultTier = (period.Organizer as any).MembershipTier?.[0]
                            const hasActiveMembershipTiers = !!defaultTier
                            const multiCourseRule = period.DiscountRule?.find(r => r.ruleType === 'MULTI_COURSE_TIERED')
                            const discountInfo = {
                                memberDiscountPercent: hasActiveMembershipTiers
                                    ? ((period.Organizer as any).resolvedMemberDiscountPercent ?? null)
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
                                    organizerId={period.organizerId}
                                    organizerName={period.Organizer.name}
                                    discountInfo={discountInfo}
                                />
                            )
                        })}
                    </div>
                </div>
                ))
            )}
        </main>
    )
}
