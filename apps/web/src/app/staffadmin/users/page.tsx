import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import Link from 'next/link'
import { formatDateShort } from '@/lib/formatters'
import { StaffAddUserRoleDialog } from './staff-add-user-role-dialog'
import { StaffInviteUserDialog } from './staff-invite-user-dialog'
import { PendingInvitationsList } from './pending-invitations-list'

export default async function StaffAdminUsersPage() {
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

    const adminOrgIds = userAccount?.UserAccountRole.map(r => r.organizerId).filter(Boolean) as string[] || []

    if (adminOrgIds.length === 0) {
        redirect('/dashboard')
    }

    const adminOrganizers = userAccount?.UserAccountRole.map(r => r.Organizer) || []
    
    // Current user's account ID for "Me" badge
    const currentUserId = userAccount?.id

    // Get all users with roles in these organizations
    const usersWithRoles = await prisma.userAccount.findMany({
        where: {
            UserAccountRole: {
                some: {
                    organizerId: {
                        in: adminOrgIds
                    }
                }
            }
        },
        include: {
            PersonProfile: true,
            UserAccountRole: {
                where: {
                    organizerId: {
                        in: adminOrgIds
                    }
                },
                include: {
                    Organizer: true
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    })

    return (
        <div className="space-y-rn-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="rn-h2">Users & Roles</h2>
                    <p className="rn-meta text-rn-text-muted">Manage users in your organizations</p>
                </div>
            </div>

            {adminOrganizers.map(org => {
                if (!org) return null
                
                const orgUsers = usersWithRoles.filter(u => 
                    u.UserAccountRole.some(r => r.organizerId === org.id)
                )

                // Serialize Decimal fields for Client Component
                const serializedOrg = {
                    id: org.id,
                    name: org.name,
                    slug: org.slug
                }

                return (
                    <div key={org.id} className="space-y-4">
                        <PendingInvitationsList 
                            organizerId={org.id}
                        />
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>{org.name} Users ({orgUsers.length})</CardTitle>
                                    <div className="flex gap-2">
                                        <StaffInviteUserDialog organizer={serializedOrg} />
                                        <StaffAddUserRoleDialog organizer={serializedOrg} />
                                    </div>
                                </div>
                            </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Roles</TableHead>
                                        <TableHead>Joined</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {orgUsers.map((orgUser) => {
                                        const orgRoles = orgUser.UserAccountRole.filter(r => r.organizerId === org.id)
                                        const isCurrentUser = orgUser.id === currentUserId
                                        
                                        return (
                                            <TableRow key={orgUser.id}>
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2">
                                                        {orgUser.PersonProfile ? 
                                                            `${orgUser.PersonProfile.firstName} ${orgUser.PersonProfile.lastName}` :
                                                            'No profile'
                                                        }
                                                        {isCurrentUser && (
                                                            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                                                                Me
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">{orgUser.email}</TableCell>
                                                <TableCell>
                                                    <div className="flex gap-1 flex-wrap">
                                                        {orgRoles.map(role => (
                                                            <Badge key={role.id} variant="secondary" className="text-xs">
                                                                {role.role}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {formatDateShort(orgUser.createdAt)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button asChild variant="ghost" size="sm">
                                                        <Link href={`/staffadmin/users/${orgUser.id}`}>View</Link>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                    {orgUsers.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                No users found for this organization.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    </div>
                )
            })}
        </div>
    )
}
