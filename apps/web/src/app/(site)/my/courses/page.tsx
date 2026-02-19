import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, GraduationCap } from 'lucide-react'
import { EmptyState } from '@/components'
import { TicketQR } from '@/components/ticket-qr'
import { PayButton } from '@/components/pay-button'
import { CancelOrderButton } from '@/app/(site)/profile/cancel-order-button'
import { AcceptOfferButton, DeclineOfferButton } from '@/app/(site)/profile/offer-buttons'
import { formatDateShort, formatPrice, formatRelativeTime } from '@/lib/formatters'

export default async function MyCoursesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch user account and course registrations
  const userAccount = await prisma.userAccount.findUnique({
    where: { supabaseUid: user.id },
    include: {
      PersonProfile: {
        include: {
          Registration: {
            where: {
              status: { not: 'DRAFT' }
            },
            include: {
              CourseTrack: true,
              CoursePeriod: true,
              Order: true,
              WaitlistEntry: true
            },
            orderBy: { createdAt: 'desc' }
          },
          Ticket: {
            where: { status: 'ACTIVE' }
          }
        }
      }
    }
  })

  // If no profile yet, redirect to onboarding
  if (!userAccount?.PersonProfile) {
    redirect('/onboarding')
  }

  const registrations = userAccount.PersonProfile.Registration || []
  const tickets = userAccount.PersonProfile.Ticket || []

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
          <h1 className="rn-h1">My Course Registrations</h1>
          <p className="rn-meta text-rn-text-muted">
            {registrations.length} {registrations.length === 1 ? 'registration' : 'registrations'}
          </p>
        </div>

        {/* Course Registrations List */}
        {registrations.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="No course registrations"
            description="You don't have any course registrations yet"
            action={{ label: "Browse Courses", href: "/courses" }}
          />
        ) : (
          <div className="grid gap-rn-6 md:grid-cols-2">
            {registrations.map((reg) => (
              <Card key={reg.id}>
                <CardHeader>
                  <div className="flex justify-between">
                    <Badge variant={reg.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {reg.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatDateShort(reg.createdAt)}
                    </span>
                  </div>
                  <CardTitle>{reg.CourseTrack.title}</CardTitle>
                  <CardDescription>{reg.CoursePeriod.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Role:</span>
                        <span>{reg.chosenRole}</span>
                      </div>
                      {reg.Order && (
                        <div className="flex justify-between border-t pt-2">
                          <span>Total Paid/Due:</span>
                          <span>{formatPrice(reg.Order.totalCents)}</span>
                        </div>
                      )}
                    </div>

                    {/* OFFER UI */}
                    {reg.WaitlistEntry?.status === 'OFFERED' && reg.WaitlistEntry.offeredUntil && (
                      <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-md border border-orange-200 dark:border-orange-800 space-y-3">
                        <div>
                          <h4 className="font-bold text-orange-800 dark:text-orange-400">Spot Offered!</h4>
                          <p className="text-xs text-orange-700 dark:text-orange-500">
                            Expires {formatRelativeTime(reg.WaitlistEntry.offeredUntil)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <AcceptOfferButton registrationId={reg.id} />
                          <DeclineOfferButton registrationId={reg.id} />
                        </div>
                      </div>
                    )}

                    {(reg.status === 'DRAFT' || reg.status === 'PENDING_PAYMENT') && reg.Order?.id && (
                      <div className="space-y-2">
                        <PayButton orderId={reg.Order.id} />
                        <CancelOrderButton orderId={reg.Order.id} />
                      </div>
                    )}

                    {reg.status === 'ACTIVE' && (
                      (() => {
                        const ticket = tickets.find(t => t.periodId === reg.periodId)
                        if (ticket) {
                          return <TicketQR token={ticket.qrTokenHash} title={reg.CoursePeriod.name} />
                        }
                        return null
                      })()
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
