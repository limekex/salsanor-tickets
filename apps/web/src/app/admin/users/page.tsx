import { getUsers, getOrganizersForUserManagement } from '@/app/actions/users'
import { getAdminSelectedOrg } from '@/utils/admin-org-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Shield } from 'lucide-react'
import { AddUserRoleDialog } from '../users/add-user-role-dialog'

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
    ADMIN: { label: 'Global Admin', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
    ORG_ADMIN: { label: 'Org Admin', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
    ORG_FINANCE: { label: 'Finance', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    ORG_CHECKIN: { label: 'Check-in', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
    INSTRUCTOR: { label: 'Instructor', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
    CHECKIN: { label: 'Global Check-in', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
    STAFF: { label: 'Staff', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' },
    PARTICIPANT: { label: 'Participant', color: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200' },
    ORGANIZER: { label: 'Organizer (deprecated)', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
}

export default async function UsersPage() {
    const selectedOrgId = await getAdminSelectedOrg()
    const users = await getUsers(selectedOrgId || undefined)
    const organizers = await getOrganizersForUserManagement()

    const selectedOrg = selectedOrgId 
        ? organizers.find(org => org.id === selectedOrgId)
        : null

    return (
        <div className="space-y-rn-6 px-rn-4 sm:px-rn-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-rn-4">
                <div>
                    <h2 className="rn-h2">
                        {selectedOrg ? `${selectedOrg.name} Users` : 'User Management'}
                    </h2>
                    <p className="rn-meta text-rn-text-muted mt-1">
                        {selectedOrg 
                            ? `Manage users and roles for ${selectedOrg.name}`
                            : 'Manage all users and their roles across the system'
                        }
                    </p>
                </div>
                <AddUserRoleDialog organizers={organizers} selectedOrgId={selectedOrgId} />
            </div>

            {users.length === 0 ? (
                <Card>
                    <CardContent className="py-10">
                        <div className="text-center text-muted-foreground">
                            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">No users found</p>
                            <p className="text-sm">
                                {selectedOrg 
                                    ? `No users have been assigned roles in ${selectedOrg.name} yet.`
                                    : 'No users have been created yet.'
                                }
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-rn-4">
                    {users.map((user) => {
                        const fullName = user.PersonProfile 
                            ? `${user.PersonProfile.firstName} ${user.PersonProfile.lastName}`
                            : 'No profile'

                        return (
                            <Card key={user.id}>
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <CardTitle className="text-xl">{fullName}</CardTitle>
                                            <CardDescription className="flex items-center gap-2">
                                                <span>{user.email}</span>
                                                {user.PersonProfile?.phone && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{user.PersonProfile.phone}</span>
                                                    </>
                                                )}
                                            </CardDescription>
                                        </div>
                                        <Button asChild variant="outline" size="sm">
                                            <Link href={`/admin/users/${user.id}`}>
                                                Manage Roles
                                            </Link>
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium">Roles:</p>
                                        {user.UserAccountRole.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">No roles assigned</p>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                {user.UserAccountRole.map((role) => {
                                                    const roleInfo = ROLE_LABELS[role.role] || { 
                                                        label: role.role, 
                                                        color: 'bg-gray-100 text-gray-800' 
                                                    }
                                                    
                                                    return (
                                                        <Badge 
                                                            key={role.id} 
                                                            variant="secondary"
                                                            className={roleInfo.color}
                                                        >
                                                            {roleInfo.label}
                                                            {role.Organizer && (
                                                                <span className="ml-1 opacity-75">
                                                                    @ {role.Organizer.name}
                                                                </span>
                                                            )}
                                                        </Badge>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
