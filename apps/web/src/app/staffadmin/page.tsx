import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Building2, Users, Calendar, DollarSign, Settings } from 'lucide-react'

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

    return (
        <div className="space-y-8">
            <div>
                <h1 className="rn-h1">Organization Admin Panel</h1>
                <p className="rn-meta text-rn-text-muted">Manage your organizations</p>
            </div>

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
                            <div className="grid gap-rn-4 md:grid-cols-2 lg:grid-cols-4">
                                <Button asChild variant="outline" className="w-full">
                                    <Link href={`/staffadmin/periods`}>
                                        <Calendar className="h-4 w-4 mr-2" />
                                        Periods
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
