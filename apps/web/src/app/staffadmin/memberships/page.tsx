import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { MembershipImporter } from './membership-importer'
import { format, addDays } from 'date-fns'
import { AlertCircle, CheckCircle2, Clock, ArrowLeft, Settings2, Layers } from 'lucide-react'
import Link from 'next/link'
import { ApproveMembershipButton, RejectMembershipButton, DeleteMembershipButton } from './membership-action-buttons'
import { MembershipTableControls } from './membership-table-controls'
import { MembershipStatusSelect } from './membership-status-select'

type SearchParams = Promise<{
  status?: string
  search?: string
  page?: string
  perPage?: string
}>

export default async function StaffAdminMembershipsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  // Get user's admin organizations
  const userAccount = await prisma.userAccount.findUnique({
    where: { supabaseUid: user.id },
    include: {
      roles: {
        where: {
          OR: [
            { role: 'ADMIN' },
            { role: 'ORG_ADMIN' }
          ]
        },
        include: { organizer: true }
      }
    }
  })

  if (!userAccount?.roles?.[0]?.organizer) {
    return (
      <div className="space-y-rn-6">
        <h1 className="rn-h2">No Organization Access</h1>
        <p className="rn-meta text-rn-text-muted">You need admin access to an organization to manage memberships.</p>
      </div>
    )
  }

  const organizer = userAccount.roles[0].organizer

  // Fetch enabled tiers for import
  const tiers = await prisma.membershipTier.findMany({
    where: { 
      organizerId: organizer.id,
      enabled: true
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
    orderBy: { priority: 'asc' }
  })

  // Build query for pending memberships
  const pendingMemberships = await prisma.membership.findMany({
    where: {
      organizerId: organizer.id,
      status: 'PENDING_PAYMENT'
    },
    include: {
      person: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true
        }
      },
      tier: {
        select: {
          id: true,
          name: true,
          slug: true,
          discountPercent: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  // Build query for other memberships with pagination
  const page = parseInt(params.page || '1')
  const perPage = parseInt(params.perPage || '25')
  const skip = (page - 1) * perPage

  interface WhereClause {
    organizerId: string
    status?: { not: string } | string
    OR?: Array<{
      memberNumber?: { contains: string; mode: 'insensitive' }
      person?: {
        firstName?: { contains: string; mode: 'insensitive' }
        lastName?: { contains: string; mode: 'insensitive' }
        email?: { contains: string; mode: 'insensitive' }
      }
    }>
  }
  
  const where: WhereClause = { 
    organizerId: organizer.id,
    status: { not: 'PENDING_PAYMENT' } // Exclude pending from main list
  }

  if (params.status && params.status !== 'ALL') {
    where.status = params.status
  }

  if (params.search) {
    where.OR = [
      { memberNumber: { contains: params.search, mode: 'insensitive' as const } },
      { person: { firstName: { contains: params.search, mode: 'insensitive' as const } } },
      { person: { lastName: { contains: params.search, mode: 'insensitive' as const } } },
      { person: { email: { contains: params.search, mode: 'insensitive' as const } } },
    ]
  }

  const [memberships, totalCount] = await Promise.all([
    prisma.membership.findMany({
      where,
      include: {
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        tier: {
          select: {
            id: true,
            name: true,
            slug: true,
            discountPercent: true
          }
        }
      },
      orderBy: [
        { validTo: 'desc' },
        { createdAt: 'desc' }
      ],
      skip,
      take: perPage
    }),
    prisma.membership.count({ where })
  ])

  const totalPages = Math.ceil(totalCount / perPage)

  // Calculate stats (excluding pending)
  const now = new Date()
  const soon = addDays(now, 30)
  
  const stats = {
    total: totalCount,
    pending: pendingMemberships.length,
    active: memberships.filter(m => 
      m.status === 'ACTIVE' && 
      m.validTo >= now && 
      m.validFrom <= now
    ).length,
    expired: memberships.filter(m => 
      m.status === 'EXPIRED' || 
      (m.status === 'ACTIVE' && m.validTo < now)
    ).length,
    expiringSoon: memberships.filter(m => 
      m.status === 'ACTIVE' && 
      m.validTo >= now && 
      m.validTo <= soon
    ).length
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/staffadmin/settings">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Memberships</h1>
          <p className="text-muted-foreground">
            Manage memberships for {organizer.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/staffadmin/memberships/tiers">
              <Layers className="h-4 w-4 mr-2" />
              Membership Tiers
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/staffadmin/memberships/product">
              <Settings2 className="h-4 w-4 mr-2" />
              Product Settings
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.expiringSoon}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.expired}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Side - Main Content (3/4) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Pending Approvals */}
          {pendingMemberships.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-950/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <CardTitle>Pending Approvals</CardTitle>
                </div>
                <CardDescription>
                  {pendingMemberships.length} {pendingMemberships.length === 1 ? 'membership' : 'memberships'} awaiting approval
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingMemberships.map((membership) => (
                      <TableRow key={membership.id}>
                        <TableCell className="font-medium">
                          {membership.person.firstName} {membership.person.lastName}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {membership.person.email}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {membership.tier.name}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(membership.createdAt, 'MMM d, yyyy HH:mm')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <ApproveMembershipButton membershipId={membership.id} />
                            <RejectMembershipButton membershipId={membership.id} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Main Members Table */}
          <Card>
            <CardHeader>
              <CardTitle>Members List</CardTitle>
              <CardDescription>
                {totalCount} {totalCount === 1 ? 'member' : 'members'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <MembershipTableControls 
                currentPage={page}
                totalPages={totalPages}
                perPage={perPage}
                totalCount={totalCount}
              />
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Member #</TableHead>
                    <TableHead>Valid From</TableHead>
                    <TableHead>Valid To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Auto Renew</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberships.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">
                        No memberships found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    memberships.map((membership) => (
                      <TableRow key={membership.id}>
                        <TableCell className="font-medium">
                          {membership.person.firstName} {membership.person.lastName}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {membership.person.email}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {membership.tier.name}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {membership.memberNumber || '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(membership.validFrom, 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(membership.validTo, 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <MembershipStatusSelect 
                            membershipId={membership.id}
                            currentStatus={membership.status}
                          />
                        </TableCell>
                        <TableCell>
                          {membership.autoRenew ? (
                            <Badge variant="outline" className="text-blue-600 border-blue-600">
                              Yes
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">No</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {(membership.status === 'EXPIRED' || membership.status === 'CANCELLED') && (
                            <DeleteMembershipButton membershipId={membership.id} />
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar - Import (1/4) */}
        <div className="lg:col-span-1">
          <div className="sticky top-4">
            <MembershipImporter tiers={tiers} />
          </div>
        </div>
      </div>
    </div>
  )
}
