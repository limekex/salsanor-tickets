import { prisma } from '@/lib/db'
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
import { formatDateRange } from '@/lib/formatters'
import { getSelectedOrganizerForAdmin } from '@/utils/auth-org-admin'

export default async function StaffAdminPeriodsPage() {
    // Get selected organization (from cookie or first available)
    const organizerId = await getSelectedOrganizerForAdmin()

    // Fetch periods for selected organization only
    const periods = await prisma.coursePeriod.findMany({
        where: {
            organizerId
        },
        include: {
            Organizer: true,
            CourseTrack: {
                include: {
                    _count: {
                        select: {
                            Registration: true
                        }
                    }
                }
            }
        },
        orderBy: {
            startDate: 'desc'
        }
    })

    return (
        <div className="space-y-rn-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="rn-h2">Course Periods</h2>
                    <p className="rn-meta text-rn-text-muted">Manage periods for your organizations</p>
                </div>
                <Button asChild>
                    <Link href="/staffadmin/periods/new">Create New Period</Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Your Organization Periods</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Dates</TableHead>
                                <TableHead>Sales Status</TableHead>
                                <TableHead>Tracks</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {periods.map((period) => {
                                const now = new Date()
                                const isSalesOpen = period.salesOpenAt < now && period.salesCloseAt > now
                                const totalRegistrations = period.CourseTrack.reduce((sum, track) => sum + track._count.Registration, 0)
                                
                                return (
                                    <TableRow key={period.id}>
                                        <TableCell className="font-medium">{period.code}</TableCell>
                                        <TableCell>{period.name}</TableCell>
                                        <TableCell>
                                            {formatDateRange(period.startDate, period.endDate)}
                                        </TableCell>
                                        <TableCell>
                                            {isSalesOpen ? (
                                                <Badge className="bg-green-600">Open</Badge>
                                            ) : (
                                                <Badge variant="secondary">Closed</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                <div>{period.CourseTrack.length} tracks</div>
                                                <div className="text-muted-foreground">{totalRegistrations} registrations</div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex gap-2 justify-end">
                                                <Button asChild variant="ghost" size="sm">
                                                    <Link href={`/staffadmin/periods/${period.id}`}>Edit</Link>
                                                </Button>
                                                <Button asChild variant="outline" size="sm">
                                                    <Link href={`/staffadmin/periods/${period.id}/tracks`}>Tracks</Link>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                            {periods.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No course periods found. Create one to get started.
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
