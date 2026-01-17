import { getPublicCoursePeriods, getAvailableCourseLevels } from '@/app/actions/courses'
import { getPublicOrganizers } from '@/app/actions/organizers'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { CourseFilters } from './course-filters'
import { CourseCardClient } from './course-card-client'

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

    const weekDayName = (n: number) => {
        return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][n - 1] || '?'
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

            {periods.length === 0 && (
                <div className="text-center py-20 bg-muted/20 rounded-lg">
                    <p className="text-xl text-muted-foreground">No upcoming courses scheduled yet.</p>
                </div>
            )}

            {periods.map((period) => (
                <div key={period.id} className="space-y-rn-6">
                    <div className="border-b border-rn-border pb-rn-2">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-rn-2">
                            <div>
                                <h2 className="rn-h2">{period.name}</h2>
                                <p className="rn-meta text-rn-text-muted">
                                    {format(period.startDate, 'MMMM d')} - {format(period.endDate, 'MMMM d, yyyy')} • {period.city}
                                </p>
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

                            return (
                                <CourseCardClient
                                    key={track.id}
                                    track={track}
                                    period={period}
                                    weekDayLabel={weekDayName(track.weekday)}
                                    isSalesOpen={isSalesOpen}
                                    isRegistered={isRegistered}
                                    organizerId={period.organizerId}
                                    organizerName={period.Organizer.name}
                                />
                            )
                        })}
                    </div>
                </div>
            ))}
        </main>
    )
}
