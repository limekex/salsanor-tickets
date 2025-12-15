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

type SearchParams = Promise<{ 
    org?: string
    level?: string
    weekday?: string
    timeAfter?: string
    timeBefore?: string
}>

export default async function CoursesPage({ searchParams }: { searchParams: SearchParams }) {
    const params = await searchParams
    const { org, level, weekday, timeAfter, timeBefore } = params
    
    const filters = {
        organizerId: org && org !== 'all' ? org : undefined,
        levelLabel: level && level !== 'all' ? level : undefined,
        weekday: weekday ? parseInt(weekday) : undefined,
        timeAfter,
        timeBefore,
    }
    
    const periods = await getPublicCoursePeriods(filters)
    const organizers = await getPublicOrganizers()
    const availableLevels = await getAvailableCourseLevels()

    // Get user's existing registrations
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let userRegistrations: { trackId: string }[] = []
    if (user) {
        const userAccount = await prisma.userAccount.findUnique({
            where: { supabaseUid: user.id },
            include: {
                personProfile: {
                    include: {
                        registrations: {
                            where: {
                                status: { in: ['DRAFT', 'PENDING_PAYMENT', 'ACTIVE', 'WAITLIST'] }
                            },
                            select: { trackId: true }
                        }
                    }
                }
            }
        })
        userRegistrations = userAccount?.personProfile?.registrations || []
    }

    const weekDayName = (n: number) => {
        return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][n - 1] || '?'
    }

    return (
        <div className="container mx-auto py-10 space-y-10 max-w-5xl">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold tracking-tight">Upcoming Courses</h1>
                <p className="text-lg text-muted-foreground">Find your next salsa class and join the fun!</p>
            </div>

            {/* Filters */}
            <CourseFilters 
                availableLevels={availableLevels}
                organizers={organizers}
                currentFilters={{
                    org: org || 'all',
                    level: level || 'all',
                    weekday: weekday || 'all',
                    timeAfter: timeAfter || 'all',
                    timeBefore: timeBefore || 'all',
                }}
            />

            {periods.length === 0 && (
                <div className="text-center py-20 bg-muted/20 rounded-lg">
                    <p className="text-xl text-muted-foreground">No upcoming courses scheduled yet.</p>
                </div>
            )}

            {periods.map((period) => (
                <div key={period.id} className="space-y-6">
                    <div className="border-b pb-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-semibold">{period.name}</h2>
                                <p className="text-muted-foreground">
                                    {format(period.startDate, 'MMMM d')} - {format(period.endDate, 'MMMM d, yyyy')} • {period.city}
                                </p>
                            </div>
                            <Link href={`/org/${period.organizer.slug}`} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
                                {period.organizer.logoUrl && (
                                    <img src={period.organizer.logoUrl} alt={period.organizer.name} className="h-8 w-8 object-contain" />
                                )}
                                <span>{period.organizer.name}</span>
                            </Link>
                        </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {period.tracks.map((track) => {
                            const isSalesOpen = period.salesOpenAt < new Date() && period.salesCloseAt > new Date()
                            const isFull = track.capacityTotal <= 0 // Simplified full check, need registration count later

                            return (
                                <Card key={track.id} className="flex flex-col h-full">
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <Badge variant="outline">{weekDayName(track.weekday)}s</Badge>
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
                                        {(() => {
                                            const isRegistered = userRegistrations.some(r => r.trackId === track.id)

                                            if (isRegistered) {
                                                return (
                                                    <Button className="w-full" variant="secondary" disabled>
                                                        Already Registered
                                                    </Button>
                                                )
                                            }

                                            return (
                                                <Button className="w-full" disabled={!isSalesOpen} asChild={isSalesOpen}>
                                                    {isSalesOpen ? (
                                                        <Link href={`/courses/${period.id}/${track.id}/register`}>
                                                            Register
                                                        </Link>
                                                    ) : (
                                                        <span>Sales Closed</span>
                                                    )}
                                                </Button>
                                            )
                                        })()}
                                    </CardFooter>
                                </Card>
                            )
                        })}
                    </div>
                </div>
            ))}
        </div>
    )
}
