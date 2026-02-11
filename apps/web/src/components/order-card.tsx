import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin, CreditCard, Package } from 'lucide-react'
import Link from 'next/link'
import { formatPrice, formatEventDate } from '@/lib/formatters'

type OrderItem = {
  id: string
  type: 'event' | 'course' | 'membership'
  title: string
  quantity: number
  priceCents: number
}

type OrderCardProps = {
  order: {
    id: string
    orderNumber: string
    status: string
    totalCents: number
    createdAt: Date
    organizer?: {
      name: string
      slug: string
    } | null
    event?: {
      title: string
      startDateTime: Date
    } | null
  }
  items?: OrderItem[]
  showDetails?: boolean
}

export function OrderCard({ order, items = [], showDetails = false }: OrderCardProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
      case 'refunded':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-base">Order #{order.orderNumber}</CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <Calendar className="h-3 w-3" />
              {formatEventDate(order.createdAt)}
            </CardDescription>
          </div>
          <Badge className={getStatusColor(order.status)}>
            {order.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Organizer Info */}
        {order.organizer && (
          <div className="flex items-center gap-1 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{order.organizer.name}</span>
          </div>
        )}

        {/* Event Info */}
        {order.event && (
          <div className="text-sm">
            <div className="font-medium">{order.event.title}</div>
            <div className="text-muted-foreground text-xs">
              {formatEventDate(order.event.startDateTime)}
            </div>
          </div>
        )}

        {/* Order Items */}
        {showDetails && items.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center gap-1 text-sm font-medium">
              <Package className="h-4 w-4" />
              Items
            </div>
            {items.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {item.quantity}x {item.title}
                </span>
                <span>{formatPrice(item.priceCents)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Total */}
        <div className="flex items-center justify-between pt-2 border-t font-semibold">
          <div className="flex items-center gap-1">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span>Total</span>
          </div>
          <span className="text-lg">{formatPrice(order.totalCents)}</span>
        </div>
      </CardContent>

      <CardFooter>
        <Button className="w-full" variant="outline" asChild>
          <Link href={`/my/orders/${order.id}`}>
            View Details
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
