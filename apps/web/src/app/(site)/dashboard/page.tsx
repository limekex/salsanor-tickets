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

type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
type QuickAccessTone = 'primary' | 'success' | 'warning'

type QuickAccessItem = {
    key: string
    title: string
    description: string
    href: string
    icon: React.ComponentType<{ className?: string }>
    tone: QuickAccessTone
    border?: string
    buttonLabel: string
    buttonVariant?: ButtonVariant
}

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
    
    const hasGlobalAdmin = globalRoles?.includes('ADMIN') ?? false
    const hasGlobalCheckin = globalRoles?.includes('CHECKIN') ?? false
    const hasOrgAdmin = organizers.some(org => org.roles.includes('ORG_ADMIN'))
    const hasOrgFinance = organizers.some(org => org.roles.includes('ORG_FINANCE'))
    const hasOrgCheckin = organizers.some(org => org.roles.includes('ORG_CHECKIN'))
    const hasOrgStaff = organizers.some(org => org.roles.includes('STAFF'))
    const hasOrgInstructor = organizers.some(org => org.roles.includes('INSTRUCTOR'))

    // Scanner access: Global Admin, Org Admin, Checkin (global/org), Staff, Instructor
    const canAccessScanners = hasGlobalAdmin || hasGlobalCheckin || hasOrgAdmin || hasOrgCheckin || hasOrgStaff || hasOrgInstructor

    const quickAccessItems: QuickAccessItem[] = [
        ...(hasGlobalAdmin ? [{
            key: 'global-admin',
            title: 'Global Admin',
            description: 'System-wide configuration, users, and organizers',
            href: '/admin',
            icon: LayoutDashboard,
            tone: 'primary' as QuickAccessTone,
            border: 'hover:border-rn-primary',
            buttonLabel: 'Open Admin'
        }] : []),
        ...(hasGlobalAdmin ? [{
            key: 'finance-dashboard',
            title: 'Global Finance',
            description: 'System-wide revenue and financial reports',
            href: '/admin/finance',
            icon: DollarSign,
            tone: 'success' as QuickAccessTone,
            border: 'hover:border-rn-success',
            buttonLabel: 'View Finance',
            buttonVariant: 'outline' as ButtonVariant
        }] : []),
        ...(hasOrgFinance && !hasGlobalAdmin ? [{
            key: 'org-finance-dashboard',
            title: 'Finance Dashboard',
            description: 'Organization revenue and financial reports',
            href: '/staffadmin/finance',
            icon: DollarSign,
            tone: 'success' as QuickAccessTone,
            border: 'hover:border-rn-success',
            buttonLabel: 'View Finance',
            buttonVariant: 'outline' as ButtonVariant
        }] : []),
        ...(hasOrgAdmin ? [{
            key: 'org-admin',
            title: 'Organization Admin',
            description: 'Manage periods, users, and settings',
            href: '/staffadmin',
            icon: Building2,
            tone: 'primary' as QuickAccessTone,
            border: 'hover:border-rn-primary',
            buttonLabel: 'Open Admin'
        }] : []),
        ...organizers
            .filter(org => org.roles.includes('ORG_CHECKIN'))
            .map(org => ({
                key: `org-checkin-${org.organizer.slug}`,
                title: `${org.organizer.name} Check-in`,
                description: 'Check-in portal for this organization',
                href: `/checkin/${org.organizer.slug}`,
                icon: Scan,
                tone: 'warning' as QuickAccessTone,
                border: 'hover:border-rn-warning',
                buttonLabel: 'Open Portal',
                buttonVariant: 'outline' as ButtonVariant
            })),
        ...organizers
            .filter(org => org.roles.includes('INSTRUCTOR'))
            .map(org => ({
                key: `org-courses-${org.organizer.slug}`,
                title: `${org.organizer.name} Courses`,
                description: 'View course schedules and participant lists',
                href: `/org/${org.organizer.slug}/courses`,
                icon: ClipboardList,
                tone: 'warning' as QuickAccessTone,
                border: 'hover:border-rn-warning',
                buttonLabel: 'View Courses',
                buttonVariant: 'outline' as ButtonVariant
            })),
        ...organizers
            .filter(org => org.roles.includes('STAFF'))
            .map(org => ({
                key: `org-overview-${org.organizer.slug}`,
                title: `${org.organizer.name} Overview`,
                description: 'Browse events and course information',
                href: `/org/${org.organizer.slug}`,
                icon: Users,
                tone: 'primary' as QuickAccessTone,
                border: 'hover:border-rn-primary',
                buttonLabel: 'Open Overview',
                buttonVariant: 'outline' as ButtonVariant
            }))
    ]

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
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="rn-h1">Staff Dashboard</h1>
                    <p className="rn-meta text-rn-text-muted">Manage your responsibilities and access your tools</p>
                </div>
                {canAccessScanners && (
                    <div className="flex gap-2 shrink-0">
                        <Button asChild size="sm" variant="outline">
                            <Link href="/checkin">
                                <QrCode className="h-4 w-4 mr-1.5" />
                                Event
                            </Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                            <Link href="/membership-scanner">
                                <Scan className="h-4 w-4 mr-1.5" />
                                Membership
                            </Link>
                        </Button>
                    </div>
                )}
            </div>

            {/* Quick Access Tools */}
            {quickAccessItems.length > 0 && (
                <div className="space-y-rn-4">
                    <h2 className="rn-h2">Quick Access</h2>
                    <div className="grid gap-rn-4 sm:grid-cols-2 lg:grid-cols-3">
                        {quickAccessItems.map(item => {
                            const Icon = item.icon
                            const toneClass = item.tone === 'success'
                                ? 'bg-rn-success/10 text-rn-success'
                                : item.tone === 'warning'
                                    ? 'bg-rn-warning/10 text-rn-warning'
                                    : 'bg-rn-primary/10 text-rn-primary'

                            return (
                                <Card key={item.key} className={`border-2 transition-colors ${item.border ?? ''}`}>
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${toneClass}`}>
                                                <Icon className="h-6 w-6" />
                                            </div>
                                            <CardTitle className="text-base">{item.title}</CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <p className="rn-meta text-rn-text-muted">
                                            {item.description}
                                        </p>
                                        <Button asChild className="w-full" size="sm" variant={item.buttonVariant ?? 'default'}>
                                            <Link href={item.href}>{item.buttonLabel}</Link>
                                        </Button>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                </div>
            )}

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
                                                <Link href={`/staffadmin/finance`}>View Reports</Link>
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
