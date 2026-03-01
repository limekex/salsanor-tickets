import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, CreditCard, Clock } from 'lucide-react'
import { EmptyState } from '@/components'
import { MembershipCard } from '@/components/membership-card'
import { UI_TEXT, getCountText } from '@/lib/i18n'

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
              {UI_TEXT.common.backToPortal}
            </Link>
          </Button>
        </div>

        <div className="mb-rn-6">
          <h1 className="rn-h1">{UI_TEXT.memberships.title}</h1>
          <p className="rn-meta text-rn-text-muted">
            {memberships.length} {getCountText(UI_TEXT.memberships.singular, UI_TEXT.memberships.plural, memberships.length)}
          </p>
        </div>

        {/* Memberships List */}
        {memberships.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title={UI_TEXT.memberships.noMemberships}
            description={UI_TEXT.memberships.noMembershipsDescription}
            action={{ label: UI_TEXT.memberships.browseOrganizations, href: "/events" }}
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
                      <CardTitle className="text-lg">{UI_TEXT.memberships.pendingApproval}</CardTitle>
                      <CardDescription>
                        {membership.Organizer.name}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-sm text-center text-muted-foreground">
                        {UI_TEXT.memberships.pendingMessage(membership.MembershipTier.name)}
                      </div>
                      <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-sm">
                        <p className="text-yellow-800 dark:text-yellow-400">
                          {UI_TEXT.memberships.pendingNotice}
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
                    id: membership.id,
                    memberNumber: membership.memberNumber,
                    validFrom: membership.validFrom,
                    validTo: membership.validTo,
                    status: membership.status,
                    verificationToken: membership.verificationToken,
                    tier: {
                      name: membership.MembershipTier.name,
                      slug: membership.MembershipTier.slug,
                      accentColor: membership.MembershipTier.accentColor
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
