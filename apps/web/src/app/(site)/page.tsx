
import { createClient } from '@/utils/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/db'
import { Footer } from '@/components/footer'
import { CheckCircle2, Users, CreditCard, QrCode } from 'lucide-react'
import { AuthCodeHandler } from '@/components/auth-code-handler'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isAdmin = false
  let hasStaffRoles = false

  if (user) {
    const userAccount = await prisma.userAccount.findUnique({
      where: { supabaseUid: user.id },
      include: { UserAccountRole: true }
    })
    
    if (userAccount?.UserAccountRole) {
      isAdmin = userAccount.UserAccountRole.some(r => r.role === 'ADMIN' || r.role === 'ORGANIZER')
      hasStaffRoles = userAccount.UserAccountRole.length > 0
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AuthCodeHandler />
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-rn-background-subtle to-white py-rn-8 md:py-20">
        <div className="container mx-auto px-rn-4">
          <div className="max-w-3xl mx-auto text-center space-y-rn-6">
            <div className="flex justify-center mb-rn-4">
              <Image 
                src="/logo-dark.svg" 
                alt="RegiNor.events" 
                width={240} 
                height={55}
                priority
                className="h-12 sm:h-14 w-auto"
              />
            </div>
            <p className="rn-h2 text-rn-text-muted">
              from signup to showtime
            </p>
            <p className="rn-h3 text-rn-text-muted max-w-2xl mx-auto">
              Registrations, memberships, payments and check-in – all in one flow.
            </p>

            <div className="flex flex-col sm:flex-row gap-rn-4 justify-center pt-rn-4">
              {user ? (
                <>
                  <Button asChild size="lg">
                    <Link href="/courses">Browse Courses</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/profile">My Profile</Link>
                  </Button>
                  {hasStaffRoles && (
                    <Button asChild variant="secondary" size="lg">
                      <Link href="/dashboard">Dashboard</Link>
                    </Button>
                  )}
                  {isAdmin && (
                    <Button asChild variant="secondary" size="lg">
                      <Link href="/admin">Admin</Link>
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button asChild size="lg">
                    <Link href="/auth/login?tab=signup">Get Started</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/courses">Browse Courses</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-rn-8 md:py-16">
        <div className="container mx-auto px-rn-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-rn-8">
              <h2 className="rn-h2 mb-rn-3">Everything in one flow</h2>
              <p className="rn-body text-rn-text-muted">
                Built for organizations that run recurring events and member-based communities.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-rn-6">
              <Card>
                <CardContent className="pt-rn-6 space-y-rn-3">
                  <div className="w-12 h-12 rounded-lg bg-rn-background-subtle flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-rn-primary" />
                  </div>
                  <h3 className="rn-h4">Registrations</h3>
                  <p className="rn-body text-rn-text-muted">
                    Clear signups with capacity, roles and waitlists handled automatically.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-rn-6 space-y-rn-3">
                  <div className="w-12 h-12 rounded-lg bg-rn-background-subtle flex items-center justify-center">
                    <Users className="w-6 h-6 text-rn-primary" />
                  </div>
                  <h3 className="rn-h4">Memberships</h3>
                  <p className="rn-body text-rn-text-muted">
                    Built-in membership validation for pricing, access and check-in.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-rn-6 space-y-rn-3">
                  <div className="w-12 h-12 rounded-lg bg-rn-background-subtle flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-rn-primary" />
                  </div>
                  <h3 className="rn-h4">Payments</h3>
                  <p className="rn-body text-rn-text-muted">
                    Secure payments with transparent pricing and clear explanations.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-rn-6 space-y-rn-3">
                  <div className="w-12 h-12 rounded-lg bg-rn-background-subtle flex items-center justify-center">
                    <QrCode className="w-6 h-6 text-rn-primary" />
                  </div>
                  <h3 className="rn-h4">Check-in</h3>
                  <p className="rn-body text-rn-text-muted">
                    Fast, reliable QR-based check-in designed for real-world conditions.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-rn-8 md:py-16 bg-rn-background-subtle">
        <div className="container mx-auto px-rn-4">
          <div className="max-w-3xl mx-auto text-center space-y-rn-4">
            <h2 className="rn-h2">Built from practice</h2>
            <p className="rn-body text-rn-text-muted">
              RegiNor.events is developed and operated by SalsaNor, a non-profit organization 
              with long experience running courses, events and international dance communities.
            </p>
            <p className="rn-body text-rn-text-muted">
              This practical background is a core part of RegiNor's credibility.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
