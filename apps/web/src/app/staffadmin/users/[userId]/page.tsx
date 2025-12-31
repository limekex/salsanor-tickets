import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, Shield, Mail, Phone } from 'lucide-react'
import { StaffRemoveRoleButton } from './staff-remove-role-button'
import { StaffAddUserRoleDialog } from '../staff-add-user-role-dialog'

const ROLE_LABELS: Record<string, { label: string; color: string; description: string }> = {
    ADMIN: { 
        label: 'Global Admin', 
        color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        description: 'Full system access across all organizations'
    },
    ORG_ADMIN: { 
        label: 'Org Admin', 
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        description: 'Full administrative access within organization'
    },
    ORG_FINANCE: { 
        label: 'Finance', 
        color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        description: 'Financial and payment management access'
    },
    ORG_CHECKIN: { 
        label: 'Check-in', 
        color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
        description: 'Check-in and attendance management'
    },
    INSTRUCTOR: { 
        label: 'Instructor', 
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        description: 'Teaching and course management access'
    },
    CHECKIN: { 
        label: 'Global Check-in', 
        color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
        description: 'Check-in access across all organizations'
    },
    STAFF: { 
        label: 'Staff', 
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
        description: 'General staff access within organization'
    },
    PARTICIPANT: { 
        label: 'Participant', 
        color: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200',
        description: 'Basic participant access'
    },
}

export default async function StaffAdminUserDetailPage({ 
    params 
}: { 
    params: Promise<{ userId: string }> 
}) {
    const { userId } = await params
    const supabase = await createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    if (!currentUser) {
        redirect('/auth/login')
    }

    // Get current user's organizations
    const currentUserAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: currentUser.id },
        include: {
            roles: {
                where: {
                    role: 'ORG_ADMIN'
                }
            }
        }
    })

    const adminOrgIds = currentUserAccount?.roles.map(r => r.organizerId).filter(Boolean) as string[] || []

    if (adminOrgIds.length === 0) {
        redirect('/dashboard')
    }

    // Fetch the user to view
    const user = await prisma.userAccount.findUnique({
        where: { id: userId },
        include: {
            personProfile: true,
            roles: {
                where: {
                    organizerId: {
                        in: adminOrgIds
                    }
                },
                include: {
                    organizer: true
                }
            }
        }
    })
    
    if (!user) {
        notFound()
    }

    const fullName = user.personProfile 
        ? `${user.personProfile.firstName} ${user.personProfile.lastName}`
        : 'No profile'

    // Get first admin org for the dialog
    const firstOrg = await prisma.organizer.findFirst({
        where: { id: { in: adminOrgIds } },
        select: { id: true, name: true, slug: true }
    })

    if (!firstOrg) {
        redirect('/dashboard')
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button asChild variant="outline" size="icon">
                        <Link href="/staffadmin/users">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">{fullName}</h2>
                        <p className="text-muted-foreground">{user.email}</p>
                    </div>
                </div>
                <StaffAddUserRoleDialog 
                    organizer={firstOrg}
                    preselectedUser={{
                        id: user.id,
                        email: user.email,
                        personProfile: user.personProfile,
                        roles: user.roles
                    }}
                />
            </div>

            {/* User Info Card */}
            <Card>
                <CardHeader>
                    <CardTitle>User Information</CardTitle>
                    <CardDescription>Basic profile information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-medium">Email</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                        </div>

                        {user.personProfile?.phone && (
                            <div className="flex items-center gap-3">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-sm font-medium">Phone</p>
                                    <p className="text-sm text-muted-foreground">{user.personProfile.phone}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Roles Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Assigned Roles</CardTitle>
                    <CardDescription>
                        Roles in your organizations only
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {user.roles.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="font-medium">No roles in your organizations</p>
                            <p className="text-sm">This user has no roles in organizations you manage.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {user.roles.map((role) => {
                                const roleInfo = ROLE_LABELS[role.role] || { 
                                    label: role.role, 
                                    color: 'bg-gray-100 text-gray-800',
                                    description: 'Custom role'
                                }
                                
                                return (
                                    <div 
                                        key={role.id}
                                        className="flex items-start justify-between p-4 rounded-lg border bg-card"
                                    >
                                        <div className="space-y-2 flex-1">
                                            <div className="flex items-center gap-2">
                                                <Badge 
                                                    variant="secondary"
                                                    className={roleInfo.color}
                                                >
                                                    {roleInfo.label}
                                                </Badge>
                                                {role.organizer && (
                                                    <Badge variant="outline">
                                                        {role.organizer.name}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {roleInfo.description}
                                            </p>
                                        </div>
                                        <StaffRemoveRoleButton roleId={role.id} roleName={roleInfo.label} />
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
