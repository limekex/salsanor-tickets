import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Building2, Users, Calendar, Settings, BarChart3, QrCode, UserCheck, ClipboardList, Clock } from 'lucide-react'

// Map JS weekday (0=Sun) to our weekday (1=Mon..7=Sun)
function getWeekdayNumber(): number {
    const jsDay = new Date().getDay() // 0=Sun, 1=Mon..6=Sat
    return jsDay === 0 ? 7 : jsDay // Convert to 1=Mon..7=Sun
}

export default async function StaffAdminPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    // Get user's organizations where they have ORG_ADMIN role
    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: {
            UserAccountRole: {
                where: {
                    role: 'ORG_ADMIN'
                },
                include: {
                    Organizer: true
                }
            }
        }
    })

    const adminOrganizers = userAccount?.UserAccountRole.map(r => r.Organizer).filter(Boolean) || []

    if (adminOrganizers.length === 0) {
        redirect('/dashboard')
    }

    // Get today's weekday and fetch tracks scheduled for today
    const todayWeekday = getWeekdayNumber()
    const adminOrgIds = adminOrganizers.map(o => o?.id).filter(Boolean) as string[]
    const today = new Date()
    
    const todaysTracks = await prisma.courseTrack.findMany({
        where: {
            weekday: todayWeekday,
            CoursePeriod: {
                organizerId: { in: adminOrgIds },
                startDate: { lte: today },
                endDate: { gte: today }
            }
        },
        include: {
            CoursePeriod: {
                select: { name: true, organizerId: true }
            },
            _count: {
                select: { Registration: { where: { status: 'ACTIVE' } } }
            }
        },
        orderBy: { timeStart: 'asc' }
    })

    return (
        <div className="space-y-8">
            <div>
                <h1 className="rn-h1">Organization Admin Panel</h1>
                <p className="rn-meta text-rn-text-muted">Manage your organizations</p>
            </div>

            {/* Today's Events - Quick Access */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-rn-2">
                        <Clock className="h-5 w-5 text-rn-primary" />
                        <CardTitle>Today&apos;s Classes</CardTitle>
                    </div>
                    <CardDescription>
                        {todaysTracks.length === 0 
                            ? 'No classes scheduled for today'
                            : `${todaysTracks.length} class${todaysTracks.length > 1 ? 'es' : ''} scheduled`
                        }
                    </CardDescription>
                </CardHeader>
                {todaysTracks.length > 0 && (
                    <CardContent className="space-y-rn-3">
                        {todaysTracks.map(track => (
                            <div key={track.id} className="flex flex-col sm:flex-row sm:items-center gap-rn-3 p-rn-3 rounded-rn-1 bg-rn-surface border border-rn-border">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-rn-2">
                                        <span className="font-medium text-rn-text truncate">{track.title}</span>
                                        <Badge variant="outline" className="shrink-0">{track.timeStart.slice(0, 5)}</Badge>
                                    </div>
                                    <p className="rn-caption text-rn-text-muted truncate">
                                        {track.CoursePeriod.name} · {track._count.Registration} registered
                                    </p>
                                </div>
                                <div className="flex gap-rn-2 shrink-0">
                                    <Button asChild size="sm" variant="outline">
                                        <Link href={`/selfcheckin?trackId=${track.id}`} target="_blank">
                                            <QrCode className="h-4 w-4 mr-1" />
                                            Self
                                        </Link>
                                    </Button>
                                    <Button asChild size="sm" variant="outline">
                                        <Link href={`/checkin?trackId=${track.id}`}>
                                            <UserCheck className="h-4 w-4 mr-1" />
                                            Staff
                                        </Link>
                                    </Button>
                                    <Button asChild size="sm" variant="outline">
                                        <Link href={`/staffadmin/attendance/${track.id}`}>
                                            <ClipboardList className="h-4 w-4 mr-1" />
                                            List
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                )}
            </Card>

            <div className="grid gap-6">
                {adminOrganizers.map(org => org && (
                    <Card key={org.id}>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-rn-3">
                                    <div className="p-rn-2 rounded-rn-1 bg-rn-primary/10 text-rn-primary">
                                        <Building2 className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <CardTitle>{org.name}</CardTitle>
                                        <CardDescription>/{org.slug}</CardDescription>
                                    </div>
                                </div>
                                <Badge variant="default">Admin</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-rn-4 md:grid-cols-2 lg:grid-cols-5">
                                <Button asChild variant="outline" className="w-full">
                                    <Link href={`/staffadmin/periods`}>
                                        <Calendar className="h-4 w-4 mr-2" />
                                        Periods
                                    </Link>
                                </Button>
                                <Button asChild variant="outline" className="w-full">
                                    <Link href={`/staffadmin/attendance`}>
                                        <BarChart3 className="h-4 w-4 mr-2" />
                                        Attendance
                                    </Link>
                                </Button>
                                <Button asChild variant="outline" className="w-full">
                                    <Link href={`/staffadmin/users`}>
                                        <Users className="h-4 w-4 mr-2" />
                                        Users
                                    </Link>
                                </Button>
                                <Button asChild variant="outline" className="w-full">
                                    <Link href={`/staffadmin/settings`}>
                                        <Settings className="h-4 w-4 mr-2" />
                                        Settings
                                    </Link>
                                </Button>
                                <Button asChild variant="outline" className="w-full">
                                    <Link href={`/org/${org.slug}`}>
                                        <Building2 className="h-4 w-4 mr-2" />
                                        View Public Page
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Common administrative tasks</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-rn-4 md:grid-cols-3">
                    <Button asChild variant="outline">
                        <Link href="/staffadmin/periods">
                            <Calendar className="h-4 w-4 mr-2" />
                            Create New Period
                        </Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link href="/staffadmin/users">
                            <Users className="h-4 w-4 mr-2" />
                            Manage Users
                        </Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link href="/dashboard">
                            <Settings className="h-4 w-4 mr-2" />
                            Back to Dashboard
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
