import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Ticket, GraduationCap, CreditCard, Calendar, ShoppingBag } from 'lucide-react'
import { UI_TEXT, getCountText } from '@/lib/i18n'

export default async function MyDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch user account
  const userAccount = await prisma.userAccount.findUnique({
    where: { supabaseUid: user.id },
    include: {
      PersonProfile: {
        include: {
          EventRegistration: {
            where: { status: { not: 'DRAFT' } }
          },
          Registration: {
            where: { status: { not: 'DRAFT' } }
          },
          Membership: {
            where: { status: { not: 'CANCELLED' } }
          },
          Order: {
            where: { status: { not: 'DRAFT' } }
          }
        }
      }
    }
  })

  // If no profile yet, redirect to onboarding
  if (!userAccount?.PersonProfile) {
    redirect('/onboarding')
  }

  const eventRegistrationsCount = userAccount.PersonProfile.EventRegistration?.length ?? 0
  const courseRegistrationsCount = userAccount.PersonProfile.Registration?.length ?? 0
  const membershipsCount = userAccount.PersonProfile.Membership?.length ?? 0
  const ordersCount = userAccount.PersonProfile.Order?.length ?? 0

  return (
    <main className="container mx-auto py-rn-7 px-rn-4">
      <div className="max-w-4xl mx-auto space-y-rn-6">
        {/* Header with title and action buttons */}
        <div className="mb-rn-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-rn-4">
            <div>
              <h1 className="rn-h1">{UI_TEXT.portal.title}</h1>
              <p className="rn-meta text-rn-text-muted">{UI_TEXT.portal.welcome}, {userAccount.PersonProfile.firstName}!</p>
            </div>
            <div className="flex gap-rn-2 flex-wrap">
              {/* Memberships button - only show if there are memberships */}
              {membershipsCount > 0 && (
                <Button asChild variant="outline" size="sm">
                  <Link href="/my/memberships">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Memberships ({membershipsCount})
                  </Link>
                </Button>
              )}
              {/* Orders button */}
              <Button asChild variant="outline" size="sm">
                <Link href="/my/orders">
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Orders ({ordersCount})
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Main cards - only Tickets and Courses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-rn-6">
          {/* Event Tickets Card */}
          <Card className="hover:border-rn-primary transition-colors">
            <CardHeader>
              <div className="flex items-center gap-rn-3">
                <div className="p-rn-2 rounded-lg bg-rn-primary/10">
                  <Ticket className="h-6 w-6 text-rn-primary" />
                </div>
                <div>
                  <CardTitle className="rn-h3">{UI_TEXT.dashboard.eventTickets}</CardTitle>
                  <CardDescription className="rn-meta">
                    {eventRegistrationsCount} {getCountText(UI_TEXT.tickets.singular, UI_TEXT.tickets.plural, eventRegistrationsCount)}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/my/tickets">
                  View Tickets
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Course Registrations Card */}
          <Card className="hover:border-rn-primary transition-colors">
            <CardHeader>
              <div className="flex items-center gap-rn-3">
                <div className="p-rn-2 rounded-lg bg-rn-primary/10">
                  <GraduationCap className="h-6 w-6 text-rn-primary" />
                </div>
                <div>
                  <CardTitle className="rn-h3">{UI_TEXT.dashboard.courses}</CardTitle>
                  <CardDescription className="rn-meta">
                    {courseRegistrationsCount} {getCountText(UI_TEXT.courses.singular, UI_TEXT.courses.plural, courseRegistrationsCount)}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/my/courses">
                  View Courses
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links Section */}
        <Card>
          <CardHeader>
            <CardTitle className="rn-h3">{UI_TEXT.dashboard.quickActions}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-rn-3">
              <Button asChild variant="outline">
                <Link href="/courses">
                  <Calendar className="h-4 w-4 mr-2" />
                  {UI_TEXT.dashboard.browseCourses}
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/events">
                  <Calendar className="h-4 w-4 mr-2" />
                  {UI_TEXT.dashboard.browseEvents}
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/my/settings">
                  {UI_TEXT.dashboard.settings}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
