import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Ticket, GraduationCap, CreditCard, Calendar } from 'lucide-react'

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

  return (
    <main className="container mx-auto py-rn-7 px-rn-4">
      <div className="max-w-4xl mx-auto space-y-rn-6">
        <div className="mb-rn-6">
          <h1 className="rn-h1">My Portal</h1>
          <p className="rn-meta text-rn-text-muted">Welcome back, {userAccount.PersonProfile.firstName}!</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-rn-6">
          {/* Event Tickets Card */}
          <Card className="hover:border-rn-primary transition-colors">
            <CardHeader>
              <div className="flex items-center gap-rn-3">
                <div className="p-rn-2 rounded-lg bg-rn-primary/10">
                  <Ticket className="h-6 w-6 text-rn-primary" />
                </div>
                <div>
                  <CardTitle className="rn-h3">Event Tickets</CardTitle>
                  <CardDescription className="rn-meta">
                    {eventRegistrationsCount} {eventRegistrationsCount === 1 ? 'ticket' : 'tickets'}
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
                  <CardTitle className="rn-h3">Courses</CardTitle>
                  <CardDescription className="rn-meta">
                    {courseRegistrationsCount} {courseRegistrationsCount === 1 ? 'registration' : 'registrations'}
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

          {/* Memberships Card */}
          <Card className="hover:border-rn-primary transition-colors">
            <CardHeader>
              <div className="flex items-center gap-rn-3">
                <div className="p-rn-2 rounded-lg bg-rn-primary/10">
                  <CreditCard className="h-6 w-6 text-rn-primary" />
                </div>
                <div>
                  <CardTitle className="rn-h3">Memberships</CardTitle>
                  <CardDescription className="rn-meta">
                    {membershipsCount} {membershipsCount === 1 ? 'membership' : 'memberships'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/my/memberships">
                  View Memberships
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links Section */}
        <Card>
          <CardHeader>
            <CardTitle className="rn-h3">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-rn-3">
              <Button asChild variant="outline">
                <Link href="/courses">
                  <Calendar className="h-4 w-4 mr-2" />
                  Browse Courses
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/events">
                  <Calendar className="h-4 w-4 mr-2" />
                  Browse Events
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/profile/settings">
                  Settings
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
