import { getOrganizerBySlug } from '@/app/actions/organizers'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import Link from 'next/link'
import { Globe, Mail, MapPin } from 'lucide-react'

type Params = Promise<{ slug: string }>

export default async function OrganizerPage({ params }: { params: Params }) {
    const { slug } = await params
    const organizer = await getOrganizerBySlug(slug)

    if (!organizer) return notFound()

    const weekDayName = (n: number) => {
        return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][n - 1] || '?'
    }

    return (
        <div className="container mx-auto py-10 space-y-10 max-w-5xl">
            {/* Organizer Header */}
            <div className="space-y-4">
                <div className="flex items-start gap-6">
                    {organizer.logoUrl && (
                        <img
                            src={organizer.logoUrl}
                            alt={organizer.name}
                            className="w-24 h-24 object-contain rounded-lg border"
                        />
                    )}
                    <div className="flex-1">
                        <h1 className="text-4xl font-bold tracking-tight">{organizer.name}</h1>
                        {organizer.description && (
                            <p className="text-lg text-muted-foreground mt-2">{organizer.description}</p>
                        )}
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

            {/* Upcoming Courses */}
            <div className="space-y-6">
                <div className="border-b pb-2">
                    <h2 className="text-2xl font-semibold">Upcoming Courses</h2>
                </div>

                {organizer.periods.length === 0 && (
                    <Card>
                        <CardContent className="py-12 text-center text-muted-foreground">
                            No upcoming courses scheduled yet.
                        </CardContent>
                    </Card>
                )}

                {organizer.periods.map((period) => (
                    <div key={period.id} className="space-y-4">
                        <div>
                            <h3 className="text-xl font-semibold">{period.name}</h3>
                            <p className="text-muted-foreground">
                                {format(period.startDate, 'MMMM d')} - {format(period.endDate, 'MMMM d, yyyy')} • {period.city}
                            </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {period.tracks.map((track) => {
                                const isSalesOpen = period.salesOpenAt < new Date() && period.salesCloseAt > new Date()

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

            <div className="text-center pt-6">
                <Button variant="outline" asChild>
                    <Link href="/courses">View All Courses</Link>
                </Button>
            </div>
        </div>
    )
}
