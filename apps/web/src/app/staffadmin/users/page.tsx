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
import { format } from 'date-fns'
import { StaffAddUserRoleDialog } from './staff-add-user-role-dialog'

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

    const adminOrgIds = userAccount?.roles.map(r => r.organizerId).filter(Boolean) as string[] || []

    if (adminOrgIds.length === 0) {
        redirect('/dashboard')
    }

    const adminOrganizers = userAccount?.roles.map(r => r.organizer) || []

    // Get all users with roles in these organizations
    const usersWithRoles = await prisma.userAccount.findMany({
        where: {
            roles: {
                some: {
                    organizerId: {
                        in: adminOrgIds
                    }
                }
            }
        },
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
                    u.roles.some(r => r.organizerId === org.id)
                )

                // Serialize Decimal fields for Client Component
                const serializedOrg = {
                    id: org.id,
                    name: org.name,
                    slug: org.slug
                }

                return (
                    <Card key={org.id}>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>{org.name} Users ({orgUsers.length})</CardTitle>
                                <StaffAddUserRoleDialog organizer={serializedOrg} />
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
                                    {orgUsers.map((user) => {
                                        const orgRoles = user.roles.filter(r => r.organizerId === org.id)
                                        
                                        return (
                                            <TableRow key={user.id}>
                                                <TableCell className="font-medium">
                                                    {user.personProfile ? 
                                                        `${user.personProfile.firstName} ${user.personProfile.lastName}` :
                                                        'No profile'
                                                    }
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">{user.email}</TableCell>
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
                                                    {format(user.createdAt, 'MMM d, yyyy')}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button asChild variant="ghost" size="sm">
                                                        <Link href={`/staffadmin/users/${user.id}`}>View</Link>
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
                )
            })}
        </div>
    )
}
