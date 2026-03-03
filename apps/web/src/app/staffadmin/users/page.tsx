import { prisma } from '@/lib/db'
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
import { getSelectedOrganizerForAdmin, requireOrgAdmin } from '@/utils/auth-org-admin'

export default async function StaffAdminUsersPage() {
    // Get selected organization (from cookie or first available)
    const organizerId = await getSelectedOrganizerForAdmin()
    
    // Get current user for "Me" badge
    const userAccount = await requireOrgAdmin()
    const currentUserId = userAccount.id

    // Get organization details
    const organizer = await prisma.organizer.findUnique({
        where: { id: organizerId },
        select: {
            id: true,
            name: true,
            slug: true
        }
    })

    if (!organizer) {
        throw new Error('Organization not found')
    }

    // Get all users with roles in this organization
    const usersWithRoles = await prisma.userAccount.findMany({
        where: {
            UserAccountRole: {
                some: {
                    organizerId
                }
            }
        },
        include: {
            PersonProfile: true,
            UserAccountRole: {
                where: {
                    organizerId
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
                    <p className="rn-meta text-rn-text-muted">Manage users in your organization</p>
                </div>
            </div>

            <PendingInvitationsList organizerId={organizer.id} />
            
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Users ({usersWithRoles.length})</CardTitle>
                        <div className="flex gap-2">
                            <StaffInviteUserDialog organizer={organizer} />
                            <StaffAddUserRoleDialog organizer={organizer} />
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
                            {usersWithRoles.map((orgUser) => {
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
                                                {orgUser.UserAccountRole.map(role => (
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
                            {usersWithRoles.length === 0 && (
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
}
