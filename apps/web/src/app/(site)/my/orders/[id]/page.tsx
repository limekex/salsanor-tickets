import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft, Download, FileText, Calendar, MapPin, User } from 'lucide-react'
import { formatDateShort, formatPrice, formatDateTimeShort } from '@/lib/formatters'

export default async function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch order with all details
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      PersonProfile: true,
      Organizer: true,
      EventRegistration: {
        include: {
          Event: {
            include: {
              Organizer: true
            }
          }
        }
      },
      Registration: {
        include: {
          CourseTrack: true,
          CoursePeriod: {
            include: {
              Organizer: true
            }
          }
        }
      },
      Invoice: true,
      CreditNote: true
    }
  })

  if (!order) {
    notFound()
  }

  // Verify user owns this order
  const userAccount = await prisma.userAccount.findUnique({
    where: { supabaseUid: user.id },
    include: { PersonProfile: true }
  })

  if (order.purchaserPersonId !== userAccount?.PersonProfile?.id) {
    redirect('/my/orders')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'PENDING_PAYMENT':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      case 'REFUNDED':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  return (
    <main className="container mx-auto py-rn-7 px-rn-4">
      <div className="max-w-4xl mx-auto space-y-rn-6">
        {/* Header */}
        <div className="flex items-center gap-rn-4 mb-rn-6">
          <Button asChild variant="ghost" size="sm">
            <Link href="/my/orders">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Link>
          </Button>
        </div>

        {/* Order Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-rn-4">
          <div>
            <h1 className="rn-h1">Order #{order.orderNumber || order.id.slice(0, 8)}</h1>
            <p className="rn-meta text-rn-text-muted">
              Placed on {formatDateShort(order.createdAt)}
            </p>
          </div>
          <Badge className={getStatusColor(order.status)}>
            {order.status.replace('_', ' ')}
          </Badge>
        </div>

        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-rn-4">
            {/* Customer Information */}
            <div className="grid gap-rn-4 md:grid-cols-2">
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer
                </h3>
                <p className="text-sm">
                  {order.PersonProfile.firstName} {order.PersonProfile.lastName}
                </p>
                {order.PersonProfile.email && (
                  <p className="text-sm text-muted-foreground">{order.PersonProfile.email}</p>
                )}
              </div>
              
              {order.Organizer && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Organizer
                  </h3>
                  <p className="text-sm">{order.Organizer.name}</p>
                </div>
              )}
            </div>

            {/* Order Items */}
            <div>
              <h3 className="font-semibold mb-3">Items</h3>
              <div className="space-y-3">
                {/* Event Registrations */}
                {order.EventRegistration?.map((eventReg) => (
                  <div key={eventReg.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{eventReg.Event.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {eventReg.Event.Organizer.name}
                        </p>
                        {eventReg.Event.startDateTime && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <Calendar className="h-3 w-3" />
                            {formatDateTimeShort(eventReg.Event.startDateTime)}
                          </p>
                        )}
                        <p className="text-sm mt-1">
                          Quantity: {eventReg.quantity}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Course Registrations */}
                {order.Registration?.map((courseReg) => (
                  <div key={courseReg.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{courseReg.CourseTrack.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {courseReg.CoursePeriod.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {courseReg.CoursePeriod.Organizer.name}
                        </p>
                        {courseReg.CoursePeriod.startDate && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <Calendar className="h-3 w-3" />
                            Starts {formatDateShort(courseReg.CoursePeriod.startDate)}
                          </p>
                        )}
                        <p className="text-sm mt-1">
                          Role: {courseReg.chosenRole}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing Details */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotalCents)}</span>
              </div>
              {order.discountCents > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-{formatPrice(order.discountCents)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span>MVA ({order.mvaRate}%)</span>
                <span>{formatPrice(order.mvaCents)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total</span>
                <span>{formatPrice(order.totalCents)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents Section */}
        {(order.Invoice || order.CreditNote.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>Download receipts and invoices</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {order.Invoice && (
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Invoice</p>
                      <p className="text-sm text-muted-foreground">
                        Order #{order.orderNumber || order.id.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/api/invoices/${order.Invoice.id}/pdf`} target="_blank">
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Link>
                  </Button>
                </div>
              )}

              {order.CreditNote.map((creditNote) => (
                <div key={creditNote.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Credit Note</p>
                      <p className="text-sm text-muted-foreground">
                        Refund #{creditNote.id.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/api/credit-notes/${creditNote.id}/pdf`} target="_blank">
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Link>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
