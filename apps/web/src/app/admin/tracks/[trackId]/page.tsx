
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/utils/auth-admin'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { promoteToOffered } from '@/app/actions/waitlist'
import { formatDistanceToNow } from 'date-fns'

/* 
  NOTE: This is a Server Component. 
  We import server actions directly for forms, but for "button clicks" without forms 
  we often use a client component wrapper OR a simple form with hidden input.
  For MVP, I'll use a small Client Component for the Promote Button to handle startTransition/pending.
*/
import { PromoteButton } from './promote-button'

type Params = Promise<{ trackId: string }>

export default async function TrackDetailPage({ params }: { params: Params }) {
    await requireAdmin()
    const { trackId } = await params

    const track = await prisma.courseTrack.findUnique({
        where: { id: trackId },
        include: {
            CoursePeriod: true,
            Registration: {
                include: {
                    PersonProfile: true,
                    WaitlistEntry: true
                },
                orderBy: { createdAt: 'asc' } // First come first serve
            }
        }
    })

    if (!track) return notFound()

    return (
        <div className="space-y-rn-6 px-rn-4 sm:px-rn-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-rn-4">
                <div>
                    <h2 className="rn-h2">{track.title}</h2>
                    <p className="rn-meta text-rn-text-muted">{track.CoursePeriod.name} • {track.weekday} {track.timeStart}</p>
                </div>
                <div className="flex gap-rn-2">
                    <Button variant="outline" disabled>Edit Track</Button>
                </div>
            </div>

            <div className="grid gap-rn-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-rn-2"><CardTitle className="rn-meta">Capacity</CardTitle></CardHeader>
                    <CardContent className="rn-h1">
                        {track.Registration.filter(r => r.status === 'ACTIVE').length} / {track.capacityTotal}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-rn-2"><CardTitle className="rn-meta">Waitlist</CardTitle></CardHeader>
                    <CardContent className="rn-h1">
                        {track.Registration.filter(r => r.status === 'WAITLIST').length}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Registrations</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Registered</TableHead>
                                <TableHead>Waitlist Info</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {track.Registration.map((reg) => (
                                <TableRow key={reg.id}>
                                    <TableCell className="font-medium">
                                        {reg.PersonProfile.firstName} {reg.PersonProfile.lastName}
                                        <div className="text-xs text-muted-foreground">{reg.PersonProfile.email}</div>
                                    </TableCell>
                                    <TableCell>{reg.chosenRole}</TableCell>
                                    <TableCell>
                                        <StatusBadge status={reg.status} />
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {new Date(reg.createdAt).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                        {reg.WaitlistEntry && (
                                            <div className="text-sm">
                                                {reg.WaitlistEntry.status === 'OFFERED' && (
                                                    <span className="text-orange-600 font-semibold">
                                                        Expires {formatDistanceToNow(reg.WaitlistEntry.offeredUntil!, { addSuffix: true })}
                                                    </span>
                                                )}
                                                {reg.WaitlistEntry.status === 'EXPIRED' && <span className="text-red-500">Expired</span>}
                                                {reg.WaitlistEntry.status === 'ON_WAITLIST' && <span>Position: ?</span>}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {reg.status === 'WAITLIST' && (
                                            <PromoteButton registrationId={reg.id} />
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case 'ACTIVE': return <Badge className="bg-green-600">Active</Badge>
        case 'WAITLIST': return <Badge variant="secondary">Waitlist</Badge>
        case 'DRAFT': return <Badge variant="outline">Draft</Badge>
        case 'CANCELLED': return <Badge variant="destructive">Cancelled</Badge>
        default: return <Badge variant="outline">{status}</Badge>
    }
}
