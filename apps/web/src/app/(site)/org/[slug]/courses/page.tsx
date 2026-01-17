import { getOrganizerCourses } from '@/app/actions/organizers'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

type Params = Promise<{ slug: string }>

export default async function OrganizerCoursesPage({ params }: { params: Params }) {
    const { slug } = await params
    const organizer = await getOrganizerCourses(slug)

    if (!organizer) return notFound()

    const weekDayName = (n: number) => {
        return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][n - 1] || '?'
    }

    const hasCourses = organizer.CoursePeriod && organizer.CoursePeriod.length > 0

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
                                    {format(period.startDate, 'MMMM d')} - {format(period.endDate, 'MMMM d, yyyy')} • {period.city}
                                </p>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {period.CourseTrack.map((track) => {
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
            ) : (
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        No upcoming courses scheduled yet.
                    </CardContent>
                </Card>
            )}
        </main>
    )
}
