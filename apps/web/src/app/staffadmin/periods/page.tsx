import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
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

export default async function StaffAdminPeriodsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    // Get user's organizations where they have ORG_ADMIN role
    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: {
            roles: {
                where: {
                    role: 'ORG_ADMIN'
                },
                include: {
                    organizer: true
                }
            }
        }
    })

    const adminOrgIds = userAccount?.roles.map(r => r.organizerId).filter(Boolean) || []

    if (adminOrgIds.length === 0) {
        redirect('/dashboard')
    }

    // Fetch periods for user's organizations only
    const periods = await prisma.coursePeriod.findMany({
        where: {
            organizerId: {
                in: adminOrgIds
            }
        },
        include: {
            organizer: true,
            tracks: {
                include: {
                    _count: {
                        select: {
                            registrations: true
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
                                <TableHead>Organizer</TableHead>
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
                                const totalRegistrations = period.tracks.reduce((sum, track) => sum + track._count.registrations, 0)
                                
                                return (
                                    <TableRow key={period.id}>
                                        <TableCell className="font-medium">{period.code}</TableCell>
                                        <TableCell>{period.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{period.organizer.name}</TableCell>
                                        <TableCell>
                                            {format(period.startDate, 'MMM d, yyyy')} -{' '}
                                            {format(period.endDate, 'MMM d, yyyy')}
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
                                                <div>{period.tracks.length} tracks</div>
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
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
