'use client'

import { useUser, useOrganizerAccess, useUserOrganizations } from '@/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Building2, Shield, User, Users } from 'lucide-react'

export default function HooksTestPage() {
  const { user, userAccount, isLoading, error, hasRole, isOrgAdmin, isGlobalAdmin } = useUser()
  const organizations = useUserOrganizations()
  const firstOrgAccess = useOrganizerAccess()

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Skeleton className="h-12 w-96" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
            <CardDescription>Error loading user data</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{error.message}</p>
            <p className="text-xs text-muted-foreground mt-2">Check console for details</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Not Authenticated</CardTitle>
            <CardDescription>Please log in to test hooks</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">User: {String(user)}</p>
            <p className="text-sm text-muted-foreground">Loading: {String(isLoading)}</p>
            <p className="text-sm text-muted-foreground">Error: {error ? String(error) : 'None'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Hooks Test Page</h1>
        <p className="text-muted-foreground">Testing useUser, useOrganizerAccess, and useUserOrganizations hooks</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* User Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{user.email}</p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Supabase UID</p>
              <p className="font-mono text-sm">{user.id}</p>
            </div>

            {userAccount?.PersonProfile && (
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">
                  {userAccount.PersonProfile.firstName} {userAccount.PersonProfile.lastName}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Roles Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Roles & Permissions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Global Roles</p>
              <div className="flex flex-wrap gap-2">
                {isGlobalAdmin() && (
                  <Badge variant="destructive">GLOBAL ADMIN</Badge>
                )}
                {isOrgAdmin() && (
                  <Badge variant="default">ORG ADMIN</Badge>
                )}
                {hasRole('STAFF') && (
                  <Badge variant="secondary">STAFF</Badge>
                )}
                {hasRole('INSTRUCTOR') && (
                  <Badge variant="secondary">INSTRUCTOR</Badge>
                )}
                {!userAccount?.UserAccountRole.length && (
                  <Badge variant="outline">No Roles</Badge>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">All Roles</p>
              <div className="space-y-2">
                {userAccount?.UserAccountRole.map((role) => (
                  <div key={role.id} className="flex items-center justify-between text-sm">
                    <span>{role.role}</span>
                    {role.Organizer && (
                      <span className="text-muted-foreground">{role.Organizer.name}</span>
                    )}
                  </div>
                ))}
                {!userAccount?.UserAccountRole.length && (
                  <p className="text-sm text-muted-foreground">No roles assigned</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Organizations Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organizations
            </CardTitle>
            <CardDescription>useUserOrganizations() result</CardDescription>
          </CardHeader>
          <CardContent>
            {organizations.length > 0 ? (
              <div className="space-y-4">
                {organizations.map((org) => (
                  <div key={org.id} className="border rounded-lg p-4">
                    <div className="font-medium">{org.name}</div>
                    <div className="text-sm text-muted-foreground">/{org.slug}</div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {org.roles.map((role: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No organizations</p>
            )}
          </CardContent>
        </Card>

        {/* First Org Access Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              First Organization Access
            </CardTitle>
            <CardDescription>useOrganizerAccess() result (no param)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Organization ID</p>
              <p className="font-mono text-sm">{firstOrgAccess.organizerId || 'None'}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Access Level</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant={firstOrgAccess.hasAccess ? 'default' : 'outline'}>
                  {firstOrgAccess.hasAccess ? 'Has Access' : 'No Access'}
                </Badge>
                {firstOrgAccess.isAdmin && (
                  <Badge variant="destructive">Admin</Badge>
                )}
                {firstOrgAccess.isFinanceManager && (
                  <Badge variant="default">Finance Manager</Badge>
                )}
                {firstOrgAccess.isCheckinStaff && (
                  <Badge variant="secondary">Checkin Staff</Badge>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Roles</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {firstOrgAccess.roles.map((role, idx) => (
                  <Badge key={idx} variant="outline">
                    {role}
                  </Badge>
                ))}
                {firstOrgAccess.roles.length === 0 && (
                  <span className="text-sm text-muted-foreground">No roles</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hook Functions Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Hook Functions</CardTitle>
          <CardDescription>Testing various hook functions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium mb-2">hasRole() tests:</p>
              <ul className="space-y-1 text-sm">
                <li>hasRole('ADMIN'): {hasRole('ADMIN') ? '✅ Yes' : '❌ No'}</li>
                <li>hasRole('ORG_ADMIN'): {hasRole('ORG_ADMIN') ? '✅ Yes' : '❌ No'}</li>
                <li>hasRole('STAFF'): {hasRole('STAFF') ? '✅ Yes' : '❌ No'}</li>
                <li>hasRole('INSTRUCTOR'): {hasRole('INSTRUCTOR') ? '✅ Yes' : '❌ No'}</li>
              </ul>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Admin checks:</p>
              <ul className="space-y-1 text-sm">
                <li>isGlobalAdmin(): {isGlobalAdmin() ? '✅ Yes' : '❌ No'}</li>
                <li>isOrgAdmin(): {isOrgAdmin() ? '✅ Yes' : '❌ No'}</li>
                {firstOrgAccess.organizerId && (
                  <li>
                    isOrgAdmin('{firstOrgAccess.organizerId.slice(0, 8)}...'): {isOrgAdmin(firstOrgAccess.organizerId) ? '✅ Yes' : '❌ No'}
                  </li>
                )}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
