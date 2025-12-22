
import { getTracksByPeriod } from '@/app/actions/tracks'
import { prisma } from '@/lib/db' // retrieve period details
import { requireAdmin } from '@/utils/auth-admin'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import Link from 'next/link'
import { notFound } from 'next/navigation'

type Params = Promise<{ periodId: string }>

export default async function PeriodDetailPage({ params }: { params: Params }) {
    await requireAdmin()
    const { periodId } = await params

    const period = await prisma.coursePeriod.findUnique({ where: { id: periodId } })
    if (!period) return notFound()

    const tracks = await getTracksByPeriod(periodId)

    const weekDayName = (n: number) => {
        return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][n - 1] || '?'
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{period.name}</h2>
                    <p className="text-muted-foreground">{period.code} • {period.city}</p>
                </div>
                <div className="flex gap-2">
                    <Button asChild variant="outline">
                        <Link href={`/admin/periods/${period.id}/edit`}>Edit Period</Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link href={`/admin/periods/${period.id}/rules`}>Manage Rules</Link>
                    </Button>
                    <Button asChild>
                        <Link href={`/admin/tracks/new?periodId=${period.id}`}>Add Track</Link>
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Date Range</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{format(period.startDate, 'MMM d')} - {format(period.endDate, 'MMM d')}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Sales Status</CardTitle></CardHeader>
                    <CardContent>
                        {period.salesOpenAt < new Date() && period.salesCloseAt > new Date() ?
                            <Badge className="bg-green-600">Open</Badge> :
                            <Badge variant="secondary">Closed</Badge>
                        }
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Tracks ({tracks.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Day & Time</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Level</TableHead>
                                <TableHead>Capacity</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tracks.map((track) => (
                                <TableRow key={track.id}>
                                    <TableCell className="font-medium">
                                        <span className="inline-block w-8 font-bold">{weekDayName(track.weekday)}</span>
                                        {track.timeStart}-{track.timeEnd}
                                    </TableCell>
                                    <TableCell>{track.title}</TableCell>
                                    <TableCell>{track.levelLabel || '-'}</TableCell>
                                    <TableCell>
                                        {track.capacityTotal}
                                        {track.capacityLeaders ? <span className="text-xs text-muted-foreground ml-1">(L:{track.capacityLeaders}/F:{track.capacityFollowers})</span> : ''}
                                    </TableCell>
                                    <TableCell>{track.priceSingleCents / 100},-</TableCell>
                                    <TableCell className="text-right">
                                        <Button asChild variant="ghost" size="sm">
                                            {/* Placeholder for Edit Track */}
                                            <Link href={`/admin/tracks/${track.id}`}>View Roster</Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {tracks.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No tracks added yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
