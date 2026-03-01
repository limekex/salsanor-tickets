import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import Link from 'next/link'
import { ArrowLeft, FileText, Download, Eye } from 'lucide-react'
import { EmptyState } from '@/components'
import { UI_TEXT } from '@/lib/i18n'
import { formatDateShort, formatPrice } from '@/lib/formatters'

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
              },
              Invoice: {
                select: {
                  id: true
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
      <div className="max-w-6xl mx-auto space-y-rn-6">
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

        {/* Orders Table */}
        {orders.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No orders"
            description="You don't have any orders yet"
            action={{ label: "Browse Courses", href: "/courses" }}
          />
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const eventReg = order.EventRegistration?.[0]
                  const courseReg = order.Registration?.[0]
                  const itemName = eventReg?.Event?.title || courseReg?.CourseTrack?.title || 'Order'
                  const itemCount = (order.EventRegistration?.length || 0) + (order.Registration?.length || 0)
                  
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        #{order.orderNumber || order.id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        {formatDateShort(order.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <div className="truncate">{itemName}</div>
                          {itemCount > 1 && (
                            <div className="text-xs text-muted-foreground">
                              +{itemCount - 1} more item{itemCount > 2 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatPrice(order.totalCents)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {order.Invoice && (
                            <Button
                              asChild
                              variant="ghost"
                              size="sm"
                              title="Download Invoice"
                            >
                              <Link href={`/api/invoices/${order.Invoice.id}/pdf`} target="_blank">
                                <Download className="h-4 w-4" />
                              </Link>
                            </Button>
                          )}
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            title="View Details"
                          >
                            <Link href={`/my/orders/${order.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </main>
  )
}
