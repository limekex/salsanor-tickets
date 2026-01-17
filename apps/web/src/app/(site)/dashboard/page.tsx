import { getUserRoles } from '@/app/actions/dashboard'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { 
    LayoutDashboard, 
    Users, 
    UserCheck, 
    DollarSign, 
    ClipboardList,
    Building2,
    QrCode,
    Scan
} from 'lucide-react'

const ROLE_INFO: Record<string, {
    label: string
    description: string
    icon: React.ComponentType<{ className?: string }>
    color: string
    permissions: string[]
}> = {
    ADMIN: {
        label: 'Global Admin',
        description: 'Full system access across all organizations',
        icon: LayoutDashboard,
        color: 'bg-rn-danger/10 text-rn-danger',
        permissions: [
            'Manage all organizations',
            'Manage all users and roles',
            'Access all periods and courses',
            'View all financial data',
            'System configuration'
        ]
    },
    ORG_ADMIN: {
        label: 'Organization Admin',
        description: 'Full administrative access within organization',
        icon: Building2,
        color: 'bg-rn-primary/10 text-rn-primary',
        permissions: [
            'Manage organization users',
            'Create and manage periods',
            'Create and manage courses',
            'View registrations and reports',
            'Organization settings'
        ]
    },
    ORG_FINANCE: {
        label: 'Finance Manager',
        description: 'Financial and payment management access',
        icon: DollarSign,
        color: 'bg-rn-success/10 text-rn-success',
        permissions: [
            'View financial reports',
            'Export payment data',
            'View registration revenue',
            'Monitor payment status',
            'Generate invoices'
        ]
    },
    ORG_CHECKIN: {
        label: 'Check-in Staff',
        description: 'Check-in and attendance management',
        icon: UserCheck,
        color: 'bg-rn-warning/10 text-rn-warning',
        permissions: [
            'Scan QR codes at door',
            'Verify participant eligibility',
            'Log attendance per session',
            'View participant lists',
            'Check-in reports'
        ]
    },
    INSTRUCTOR: {
        label: 'Instructor',
        description: 'Teaching and course management access',
        icon: ClipboardList,
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        permissions: [
            'View assigned courses',
            'View participant lists',
            'Mark attendance',
            'View course schedules',
            'Contact participants'
        ]
    },
    CHECKIN: {
        label: 'Global Check-in',
        description: 'Check-in access across all organizations',
        icon: UserCheck,
        color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
        permissions: [
            'Check-in at any organization',
            'Scan QR codes globally',
            'View all participant lists',
            'Cross-organization attendance'
        ]
    },
    STAFF: {
        label: 'Staff',
        description: 'General staff access within organization',
        icon: Users,
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
        permissions: [
            'View organization courses',
            'View basic reports',
            'Support registration desk',
            'Answer participant questions'
        ]
    }
}

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
        redirect('/auth/login')
    }

    const { globalRoles, organizers } = await getUserRoles()

    // If no roles, show message
    if ((globalRoles?.length ?? 0) === 0 && organizers.length === 0) {
        return (
            <div className="container mx-auto py-10">
                <Card>
                    <CardHeader>
                        <CardTitle>Dashboard</CardTitle>
                        <CardDescription>You don&apos;t have any staff roles assigned yet</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">
                            Contact your organization administrator to get access to staff features.
                        </p>
                        <Button asChild>
                            <Link href="/">Go to Home</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <main className="container mx-auto py-rn-7 px-rn-4 space-y-rn-6">
            <div>
                <h1 className="rn-h1">Staff Dashboard</h1>
                <p className="rn-meta text-rn-text-muted">Manage your responsibilities and access your tools</p>
            </div>

            {/* Quick Access Tools */}
            <div className="space-y-rn-4">
                <h2 className="rn-h2">Quick Access</h2>
                <div className="grid gap-rn-4 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Event Ticket Scanner */}
                    {(globalRoles?.includes('CHECKIN') || 
                      globalRoles?.includes('ADMIN') ||
                      organizers.some(org => org.roles.includes('ORG_CHECKIN') || org.roles.includes('ORG_ADMIN'))
                    ) && (
                        <Card className="border-2 hover:border-rn-primary transition-colors">
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-rn-primary/10">
                                        <QrCode className="h-6 w-6 text-rn-primary" />
                                    </div>
                                    <CardTitle className="text-base">Event Check-in</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="rn-meta text-rn-text-muted">
                                    Scan QR codes for event ticket validation and check-in
                                </p>
                                <Button asChild className="w-full" size="sm">
                                    <Link href="/checkin">
                                        <Scan className="h-4 w-4 mr-2" />
                                        Open Scanner
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Membership Scanner */}
                    {(globalRoles?.includes('ADMIN') ||
                      organizers.some(org => org.roles.includes('ORG_ADMIN') || org.roles.includes('ORG_CHECKIN'))
                    ) && (
                        <Card className="border-2 hover:border-rn-success transition-colors">
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-rn-success/10">
                                        <QrCode className="h-6 w-6 text-rn-success" />
                                    </div>
                                    <CardTitle className="text-base">Membership Verification</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="rn-meta text-rn-text-muted">
                                    Scan membership QR codes to verify status
                                </p>
                                <Button asChild className="w-full" variant="outline" size="sm">
                                    <Link href="/membership-scanner">
                                        <Scan className="h-4 w-4 mr-2" />
                                        Open Scanner
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Global Roles */}
            {(globalRoles?.length ?? 0) > 0 && (
                <div className="space-y-rn-4">
                    <h2 className="rn-h2">Global Access</h2>
                    <div className="grid gap-rn-6 md:grid-cols-2">
                        {globalRoles?.map(role => {
                            const roleInfo = ROLE_INFO[role]
                            if (!roleInfo) return null

                            const Icon = roleInfo.icon

                            return (
                                <Card key={role}>
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${roleInfo.color}`}>
                                                    <Icon className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-lg">{roleInfo.label}</CardTitle>
                                                    <CardDescription>{roleInfo.description}</CardDescription>
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-rn-4">
                                        <div>
                                            <p className="rn-meta font-medium mb-rn-2">Permissions:</p>
                                            <ul className="rn-meta text-rn-text-muted space-y-1">
                                                {roleInfo.permissions.map((perm, idx) => (
                                                    <li key={idx}>• {perm}</li>
                                                ))}
                                            </ul>
                                        </div>
                                        {role === 'ADMIN' && (
                                            <Button asChild className="w-full">
                                                <Link href="/admin">Go to Admin Panel</Link>
                                            </Button>
                                        )}
                                        {role === 'CHECKIN' && (
                                            <Button asChild className="w-full">
                                                <Link href="/checkin">Go to Check-in</Link>
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Organization Roles */}
            {organizers.map(({ organizer, roles }) => (
                <div key={organizer.id} className="space-y-rn-4">
                    <div className="flex items-center gap-rn-3">
                        <h2 className="rn-h2">{organizer.name}</h2>
                        <Badge variant="outline">{roles.length} {roles.length === 1 ? 'role' : 'roles'}</Badge>
                    </div>

                    <div className="grid gap-rn-6 md:grid-cols-2">
                        {roles.map(role => {
                            const roleInfo = ROLE_INFO[role]
                            if (!roleInfo) return null

                            const Icon = roleInfo.icon

                            return (
                                <Card key={role}>
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${roleInfo.color}`}>
                                                    <Icon className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-lg">{roleInfo.label}</CardTitle>
                                                    <CardDescription>{roleInfo.description}</CardDescription>
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-rn-4">
                                        <div>
                                            <p className="rn-meta font-medium mb-rn-2">Your Access:</p>
                                            <ul className="rn-meta text-rn-text-muted space-y-1">
                                                {roleInfo.permissions.map((perm, idx) => (
                                                    <li key={idx}>• {perm}</li>
                                                ))}
                                            </ul>
                                        </div>
                                        {role === 'ORG_ADMIN' && (
                                            <div className="flex gap-rn-2">
                                                <Button asChild className="flex-1">
                                                    <Link href={`/staffadmin`}>Admin Panel</Link>
                                                </Button>
                                            </div>
                                        )}
                                        {role === 'ORG_CHECKIN' && (
                                            <Button asChild className="w-full">
                                                <Link href={`/checkin/${organizer.slug}`}>Check-in Portal</Link>
                                            </Button>
                                        )}
                                        {role === 'ORG_FINANCE' && (
                                            <Button asChild className="w-full" variant="outline">
                                                <Link href={`/admin`}>View Reports</Link>
                                            </Button>
                                        )}
                                        {role === 'INSTRUCTOR' && (
                                            <Button asChild className="w-full" variant="outline">
                                                <Link href={`/org/${organizer.slug}/courses`}>My Courses</Link>
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                </div>
            ))}
        </main>
    )
}
