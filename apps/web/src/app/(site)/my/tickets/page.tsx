import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, Calendar } from 'lucide-react'
import { EmptyState } from '@/components'
import { QRCodeDisplay } from '@/components/qr-code-display'
import { PayButton } from '@/components/pay-button'
import { CancelOrderButton } from '@/app/(site)/profile/cancel-order-button'
import { formatDateShort, formatDateTimeShort, formatPrice } from '@/lib/formatters'

export default async function MyTicketsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch user account and event registrations
  const userAccount = await prisma.userAccount.findUnique({
    where: { supabaseUid: user.id },
    include: {
      PersonProfile: {
        include: {
          EventRegistration: {
            where: {
              status: { not: 'DRAFT' }
            },
            include: {
              Event: {
                include: {
                  Organizer: true
                }
              },
              Order: true
            },
            orderBy: { createdAt: 'desc' }
          },
          EventTicket: {
            where: { status: 'ACTIVE' },
            include: {
              Event: {
                include: {
                  Organizer: true
                }
              }
            }
          }
        }
      }
    }
  })

  // If no profile yet, redirect to onboarding
  if (!userAccount?.PersonProfile) {
    redirect('/onboarding')
  }

  const eventRegistrations = userAccount.PersonProfile.EventRegistration || []
  const eventTickets = userAccount.PersonProfile.EventTicket || []

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
          <h1 className="rn-h1">My Event Tickets</h1>
          <p className="rn-meta text-rn-text-muted">
            {eventRegistrations.length} {eventRegistrations.length === 1 ? 'ticket' : 'tickets'}
          </p>
        </div>

        {/* Event Tickets List */}
        {eventRegistrations.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No event tickets"
            description="You don't have any event tickets yet"
            action={{ label: "Browse Events", href: "/events" }}
          />
        ) : (
          <div className="grid gap-rn-6 md:grid-cols-2">
            {eventRegistrations.map((eventReg) => (
              <Card key={eventReg.id}>
                <CardHeader>
                  <div className="flex justify-between">
                    <Badge variant={eventReg.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {eventReg.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatDateShort(eventReg.createdAt)}
                    </span>
                  </div>
                  <CardTitle>{eventReg.Event.title}</CardTitle>
                  <CardDescription>{eventReg.Event.Organizer.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Quantity:</span>
                        <span>{eventReg.quantity} ticket(s)</span>
                      </div>
                      {eventReg.Event.startDateTime && (
                        <div className="flex justify-between">
                          <span>Date:</span>
                          <span>{formatDateTimeShort(eventReg.Event.startDateTime)}</span>
                        </div>
                      )}
                      {eventReg.Order && (
                        <div className="flex justify-between border-t pt-2">
                          <span>Total Paid/Due:</span>
                          <span>{formatPrice(eventReg.Order.totalCents)}</span>
                        </div>
                      )}
                    </div>

                    {/* Show tickets if active */}
                    {eventReg.status === 'ACTIVE' && (() => {
                      const tickets = eventTickets.filter(t => t.eventId === eventReg.Event.id)
                      if (tickets.length > 0) {
                        return (
                          <div className="border-t pt-4 space-y-3">
                            <p className="text-sm font-medium">
                              {tickets.length === 1 ? 'Din billett:' : `Dine ${tickets.length} billetter:`}
                            </p>
                            {tickets.length === 1 ? (
                              <div className="flex justify-center">
                                <QRCodeDisplay token={tickets[0].qrTokenHash} size={150} />
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {tickets.map((ticket, idx) => (
                                  <details key={ticket.id} className="group">
                                    <summary className="cursor-pointer list-none">
                                      <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent">
                                        <span className="font-medium">
                                          Billett {ticket.ticketNumber || idx + 1}
                                        </span>
                                        <svg 
                                          className="w-5 h-5 transition-transform group-open:rotate-180" 
                                          fill="none" 
                                          stroke="currentColor" 
                                          viewBox="0 0 24 24"
                                        >
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                      </div>
                                    </summary>
                                    <div className="mt-2 flex justify-center p-4 bg-muted/50 rounded-lg">
                                      <QRCodeDisplay token={ticket.qrTokenHash} size={150} />
                                    </div>
                                  </details>
                                ))}
                              </div>
                            )}
                            <p className="text-xs text-center text-muted-foreground">
                              Vis disse ved innsjekk
                            </p>
                          </div>
                        )
                      }
                      return null
                    })()}

                    {(eventReg.status === 'DRAFT' || eventReg.status === 'PENDING_PAYMENT') && eventReg.Order?.id && (
                      <div className="space-y-2">
                        <PayButton orderId={eventReg.Order.id} />
                        <CancelOrderButton orderId={eventReg.Order.id} />
                      </div>
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
