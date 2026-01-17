import { getAllTracks } from '@/app/actions/tracks'
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
import Link from 'next/link'

const WEEKDAY_LABELS: Record<number, string> = {
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
    7: 'Sunday'
}

export default async function AllTracksPage() {
    const tracks = await getAllTracks()

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="rn-h2">All Course Tracks</h2>
                    <p className="rn-meta text-rn-text-muted mt-1">View all tracks across all organizations</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Tracks ({tracks.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Track</TableHead>
                                <TableHead>Organization</TableHead>
                                <TableHead>Period</TableHead>
                                <TableHead>Schedule</TableHead>
                                <TableHead>Capacity</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tracks.map((track) => {
                                const enrolledCount = track._count?.Registration || 0
                                const capacityPercent = Math.round((enrolledCount / track.capacityTotal) * 100)
                                
                                return (
                                    <TableRow key={track.id}>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{track.title}</div>
                                                {track.levelLabel && (
                                                    <div className="text-sm text-muted-foreground">{track.levelLabel}</div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>{track.CoursePeriod.Organizer.name}</TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                <div>{track.CoursePeriod.name}</div>
                                                <div className="text-muted-foreground">{track.CoursePeriod.code}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                <div>{WEEKDAY_LABELS[track.weekday]}</div>
                                                <div className="text-muted-foreground">
                                                    {track.timeStart} - {track.timeEnd}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm">
                                                    {enrolledCount} / {track.capacityTotal}
                                                </span>
                                                {capacityPercent >= 90 && (
                                                    <Badge variant="destructive" className="text-xs">
                                                        {capacityPercent}%
                                                    </Badge>
                                                )}
                                                {capacityPercent >= 70 && capacityPercent < 90 && (
                                                    <Badge variant="warning" className="text-xs">
                                                        {capacityPercent}%
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                {Math.floor(track.priceSingleCents / 100)} kr
                                                {track.pricePairCents && (
                                                    <div className="text-muted-foreground">
                                                        Pair: {Math.floor(track.pricePairCents / 100)} kr
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button asChild variant="ghost" size="sm">
                                                <Link href={`/admin/tracks/${track.id}`}>View</Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                            {tracks.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        No tracks found.
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
