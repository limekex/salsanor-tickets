import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, FileText } from 'lucide-react'
import { EmptyState, OrderCard } from '@/components'
import { UI_TEXT } from '@/lib/i18n'

export default async function MyOrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch user account and orders
  const userAccount = await prisma.userAccount.findUnique({
    where: { supabaseUid: user.id },
    include: {
      PersonProfile: {
        include: {
          Order: {
            where: {
              status: { not: 'DRAFT' }
            },
            include: {
              Organizer: {
                select: {
                  name: true,
                  slug: true
                }
              },
              EventRegistration: {
                include: {
                  Event: {
                    select: {
                      title: true,
                      startDateTime: true
                    }
                  }
                }
              },
              Registration: {
                include: {
                  CourseTrack: {
                    select: {
                      title: true
                    }
                  },
                  CoursePeriod: {
                    select: {
                      name: true,
                      startDate: true
                    }
                  }
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      }
    }
  })

  // If no profile yet, redirect to onboarding
  if (!userAccount?.PersonProfile) {
    redirect('/onboarding')
  }

  const orders = userAccount.PersonProfile.Order || []

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
          <h1 className="rn-h1">My Orders</h1>
          <p className="rn-meta text-rn-text-muted">
            {orders.length} {orders.length === 1 ? 'order' : 'orders'}
          </p>
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No orders"
            description="You don't have any orders yet"
            action={{ label: "Browse Courses", href: "/courses" }}
          />
        ) : (
          <div className="grid gap-rn-6 md:grid-cols-2">
            {orders.map((order) => {
              // Get event info if this is an event order
              const eventReg = order.EventRegistration?.[0]
              const courseReg = order.Registration?.[0]
              
              return (
                <OrderCard
                  key={order.id}
                  order={{
                    id: order.id,
                    orderNumber: order.orderNumber || order.id.slice(0, 8),
                    status: order.status,
                    totalCents: order.totalCents,
                    createdAt: order.createdAt,
                    organizer: order.Organizer ? {
                      name: order.Organizer.name,
                      slug: order.Organizer.slug
                    } : null,
                    event: eventReg?.Event ? {
                      title: eventReg.Event.title,
                      startDateTime: eventReg.Event.startDateTime
                    } : (courseReg ? {
                      title: courseReg.CourseTrack.title,
                      startDateTime: courseReg.CoursePeriod.startDate
                    } : null)
                  }}
                  showDetails={false}
                />
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
