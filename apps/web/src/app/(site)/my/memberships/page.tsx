import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, CreditCard, Clock } from 'lucide-react'
import { EmptyState } from '@/components'
import { MembershipCard } from '@/components/membership-card'

export default async function MyMembershipsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch user account and memberships
  const userAccount = await prisma.userAccount.findUnique({
    where: { supabaseUid: user.id },
    include: {
      PersonProfile: {
        include: {
          Membership: {
            where: {
              status: { not: 'CANCELLED' }
            },
            include: {
              MembershipTier: true,
              Organizer: true,
              PersonProfile: true
            },
            orderBy: { validTo: 'desc' }
          }
        }
      }
    }
  })

  // If no profile yet, redirect to onboarding
  if (!userAccount?.PersonProfile) {
    redirect('/onboarding')
  }

  const memberships = userAccount.PersonProfile.Membership || []

  return (
    <main className="container mx-auto py-rn-7 px-rn-4">
      <div className="max-w-5xl mx-auto space-y-rn-6">
        {/* Header */}
        <div className="flex items-center gap-rn-4 mb-rn-6">
          <Button asChild variant="ghost" size="sm">
            <Link href="/my">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Portal
            </Link>
          </Button>
        </div>

        <div className="mb-rn-6">
          <h1 className="rn-h1">My Memberships</h1>
          <p className="rn-meta text-rn-text-muted">
            {memberships.length} {memberships.length === 1 ? 'membership' : 'memberships'}
          </p>
        </div>

        {/* Memberships List */}
        {memberships.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No memberships"
            description="You don't have any active memberships yet"
            action={{ label: "Browse Organizations", href: "/events" }}
          />
        ) : (
          <div className="grid gap-rn-6 md:grid-cols-2 lg:grid-cols-3">
            {memberships.map((membership) => {
              // Show pending message for PENDING_PAYMENT memberships
              if (membership.status === 'PENDING_PAYMENT') {
                return (
                  <Card key={membership.id}>
                    <CardHeader className="text-center">
                      <div className="flex justify-center mb-2">
                        <div className="rounded-full bg-yellow-100 dark:bg-yellow-900/20 p-2">
                          <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                        </div>
                      </div>
                      <CardTitle className="text-lg">Pending Approval</CardTitle>
                      <CardDescription>
                        {membership.Organizer.name}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-sm text-center text-muted-foreground">
                        Your <strong>{membership.MembershipTier.name}</strong> membership is waiting for validation from an administrator.
                      </div>
                      <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-sm">
                        <p className="text-yellow-800 dark:text-yellow-400">
                          You will receive an email notification once your membership has been approved.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )
              }

              // Show normal membership card for ACTIVE memberships
              return (
                <MembershipCard 
                  key={membership.id} 
                  membership={{
                    ...membership,
                    tier: {
                      name: membership.MembershipTier.name,
                      slug: membership.MembershipTier.slug
                    },
                    organizer: {
                      name: membership.Organizer.name
                    },
                    person: {
                      firstName: membership.PersonProfile.firstName,
                      lastName: membership.PersonProfile.lastName,
                      photoUrl: membership.PersonProfile.photoUrl
                    }
                  }} 
                />
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
