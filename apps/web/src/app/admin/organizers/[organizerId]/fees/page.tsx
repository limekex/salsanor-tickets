import { prisma } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { OrganizerFeesForm } from './fees-form'

type Params = Promise<{ organizerId: string }>

export default async function OrganizerFeesPage({ params }: { params: Params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Check admin access
  const userAccount = await prisma.userAccount.findUnique({
    where: { supabaseUid: user.id },
    include: { roles: true }
  })

  const isAdmin = userAccount?.roles.some(r => r.role === 'ADMIN')
  if (!isAdmin) {
    redirect('/')
  }

  const { organizerId: id } = await params

  const organizer = await prisma.organizer.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      stripeConnectAccountId: true,
      platformFeePercent: true,
      platformFeeFixed: true,
    }
  })

  if (!organizer) {
    notFound()
  }

  // Get global defaults
  const config = await prisma.paymentConfig.findUnique({
    where: { provider: 'STRIPE' }
  })

  const globalFeePercent = config?.platformFeePercent ? Number(config.platformFeePercent) : 0
  const globalFeeFixed = config?.platformFeeFixed || 0

  return (
    <div className="container mx-auto py-10 max-w-4xl">
      <Link 
        href="/admin/organizers" 
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to organizers
      </Link>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{organizer.name}</h1>
          <p className="text-muted-foreground">Configure platform fees</p>
        </div>

        {!organizer.stripeConnectAccountId && (
          <Card className="border-yellow-500">
            <CardHeader>
              <CardTitle className="text-yellow-600">⚠️ No Stripe Connect Account</CardTitle>
              <CardDescription>
                This organizer hasn&apos;t connected their Stripe account yet. Platform fees will only apply once they connect.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Global Platform Fees (Defaults)</CardTitle>
                <CardDescription>
                  These are the default fees applied to all organizers
                </CardDescription>
              </div>
              <Badge variant="outline">Default</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Percentage Fee:</span>
              <span className="font-medium">{globalFeePercent}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Fixed Fee:</span>
              <span className="font-medium">
                {(globalFeeFixed / 100).toLocaleString('nb-NO', {
                  style: 'currency',
                  currency: 'NOK',
                })}
              </span>
            </div>
            <div className="pt-2 text-xs text-muted-foreground">
              Example: 1000 NOK order = {globalFeePercent}% ({(1000 * globalFeePercent / 100).toFixed(2)} NOK) + {(globalFeeFixed / 100).toFixed(2)} NOK = {((1000 * globalFeePercent / 100) + (globalFeeFixed / 100)).toFixed(2)} NOK platform fee
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Organization-Specific Fees</CardTitle>
                <CardDescription>
                  Override global fees for this organizer (negotiated rates)
                </CardDescription>
              </div>
              {(organizer.platformFeePercent !== null || organizer.platformFeeFixed !== null) && (
                <Badge>Custom</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <OrganizerFeesForm 
              organizerId={organizer.id}
              currentFeePercent={organizer.platformFeePercent ? Number(organizer.platformFeePercent) : null}
              currentFeeFixed={organizer.platformFeeFixed}
              globalFeePercent={globalFeePercent}
              globalFeeFixed={globalFeeFixed}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
