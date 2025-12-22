import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MembershipProductForm } from './membership-product-form'
import { ArrowLeft, Users, Settings } from 'lucide-react'
import Link from 'next/link'

export default async function MembershipProductSettingsPage() {
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
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">No Organization Access</h1>
        <p className="text-muted-foreground">You need admin access to an organization to configure membership products.</p>
      </div>
    )
  }

  const organizer = userAccount.roles[0].organizer

  // Get membership tiers count
  const tierCount = await prisma.membershipTier.count({
    where: { organizerId: organizer.id }
  })

  // Serialize Decimal fields
  const serializedOrg = {
    id: organizer.id,
    name: organizer.name,
    slug: organizer.slug,
    membershipEnabled: organizer.membershipEnabled,
    membershipSalesOpen: organizer.membershipSalesOpen,
    membershipDescription: organizer.membershipDescription,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/staffadmin/memberships">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Memberships
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Membership Product Settings
          </h1>
          <p className="text-muted-foreground">
            Configure membership as a purchasable product for {organizer.name}
          </p>
        </div>
      </div>

      {tierCount === 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <p className="text-sm text-yellow-800">
              <strong>No membership tiers configured.</strong> Create at least one tier before enabling membership sales.
            </p>
            <Button asChild className="mt-4" variant="outline">
              <Link href="/staffadmin/memberships/tiers/new">
                Create First Tier
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Membership Product Status</CardTitle>
              <CardDescription>
                Control whether members can purchase memberships directly
              </CardDescription>
            </div>
            {organizer.membershipEnabled ? (
              <Badge className="bg-green-600">
                <Users className="h-3 w-3 mr-1" />
                Enabled
              </Badge>
            ) : (
              <Badge variant="secondary">Disabled</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {organizer.membershipEnabled ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sales Status:</span>
                <Badge variant={organizer.membershipSalesOpen ? 'default' : 'secondary'}>
                  {organizer.membershipSalesOpen ? 'Open' : 'Closed'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Available Tiers:</span>
                <span className="font-medium">{tierCount} tier{tierCount !== 1 ? 's' : ''}</span>
              </div>
              {organizer.membershipDescription && (
                <div className="pt-2 border-t">
                  <span className="text-muted-foreground">Description:</span>
                  <p className="mt-1">{organizer.membershipDescription}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Membership product is not enabled. Enable it below to allow users to purchase memberships.
            </p>
          )}
        </CardContent>
      </Card>

      <MembershipProductForm organizer={serializedOrg} />
    </div>
  )
}
