import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getAdminSelectedOrg } from '@/utils/admin-org-context'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/utils/auth-admin'
import { Building2, Settings, Calendar, Users } from 'lucide-react'

export default async function AdminDashboard() {
    const userAccount = await requireAdmin()
    const isGlobalAdmin = userAccount?.roles?.some(r => r.role === 'ADMIN') ?? false
    const selectedOrgId = await getAdminSelectedOrg()

    // If no org selected, show global admin dashboard
    if (isGlobalAdmin && !selectedOrgId) {
        const organizers = await prisma.organizer.findMany({
            orderBy: { name: 'asc' },
            select: {
                id: true,
                slug: true,
                name: true,
                city: true,
                _count: {
                    select: {
                        CoursePeriod: true
                    }
                }
            }
        })

        return (
            <div className="space-y-rn-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="rn-h2">Global Admin Dashboard</h2>
                        <p className="rn-meta text-rn-text-muted mt-1">Select an organization to manage their courses and events</p>
                    </div>
                </div>

                <div className="grid gap-rn-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-rn-2">
                            <CardTitle className="rn-meta">Organizers</CardTitle>
                            <Building2 className="h-4 w-4 text-rn-text-muted" />
                        </CardHeader>
                        <CardContent>
                            <div className="rn-h1">{organizers.length}</div>
                            <p className="rn-caption text-rn-text-muted">Registered organizations</p>
                            <Button asChild className="mt-4 w-full" variant="outline">
                                <Link href="/admin/organizers">Manage Organizers</Link>
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-rn-2">
                            <CardTitle className="rn-meta">System Settings</CardTitle>
                            <Settings className="h-4 w-4 text-rn-text-muted" />
                        </CardHeader>
                        <CardContent>
                            <div className="rn-h1">Config</div>
                            <p className="rn-caption text-rn-text-muted">Payment providers & global settings</p>
                            <Button asChild className="mt-4 w-full" variant="outline">
                                <Link href="/admin/settings/payments">Settings</Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Organizations</CardTitle>
                        <CardDescription>Quick access to manage each organization</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {organizers.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <p>No organizations yet.</p>
                                <Button asChild className="mt-4">
                                    <Link href="/admin/organizers/new">Create First Organizer</Link>
                                </Button>
                            </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {organizers.map((org) => (
                                    <Card key={org.id} className="hover:bg-muted/50 transition-colors">
                                        <CardHeader>
                                            <CardTitle className="text-lg">{org.name}</CardTitle>
                                            <CardDescription>{org.city || 'No location'}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            <p className="text-sm text-muted-foreground">
                                                {org._count.CoursePeriod} period{org._count.CoursePeriod !== 1 ? 's' : ''}
                                            </p>
                                            <div className="flex gap-2">
                                                <Button asChild size="sm" className="flex-1">
                                                    <Link href={`/admin/organizers/${org.id}/edit`}>Manage</Link>
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Organization-specific dashboard
    const selectedOrg = selectedOrgId ? await prisma.organizer.findUnique({
        where: { id: selectedOrgId },
        include: {
            _count: {
                select: {
                    CoursePeriod: true
                }
            }
        }
    }) : null

    const recentPeriods = selectedOrgId ? await prisma.coursePeriod.findMany({
        where: { organizerId: selectedOrgId },
        orderBy: { startDate: 'desc' },
        take: 5,
        select: {
            id: true,
            name: true,
            code: true,
            startDate: true,
            endDate: true,
        }
    }) : []

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">
                        {selectedOrg?.name || 'Dashboard'}
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        {selectedOrg?.city ? `${selectedOrg.city} • ` : ''}
                        Manage courses, periods, and registrations
                    </p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Course Periods</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{selectedOrg?._count.periods || 0}</div>
                        <p className="text-xs text-muted-foreground">Total periods created</p>
                        <Button asChild className="mt-4 w-full" variant="outline">
                            <Link href="/admin/periods">Manage Periods</Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Registrations</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">View</div>
                        <p className="text-xs text-muted-foreground">Participant lists and stats</p>
                        <Button asChild className="mt-4 w-full" variant="outline" disabled>
                            <Link href="/admin/registrations">View Registrations</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {recentPeriods.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Periods</CardTitle>
                        <CardDescription>Latest course periods for this organization</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {recentPeriods.map((period) => (
                                <div key={period.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                    <div>
                                        <p className="font-medium">{period.name}</p>
                                        <p className="text-sm text-muted-foreground">{period.code}</p>
                                    </div>
                                    <Button asChild variant="ghost" size="sm">
                                        <Link href={`/admin/periods/${period.id}`}>View</Link>
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
