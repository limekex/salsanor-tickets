'use client'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Info } from 'lucide-react'
import Link from 'next/link'
import { useCart } from '@/hooks/use-cart'
import { formatPrice } from '@/lib/formatters'

type CourseTrack = {
  id: string
  title: string
  weekday: number
  timeStart: string
  timeEnd: string
  levelLabel: string | null
  priceSingleCents: number
  pricePairCents: number | null
  memberPriceSingleCents?: number | null
  memberPricePairCents?: number | null
  capacityTotal: number
  // Template type and slot booking fields
  templateType?: string | null
  pricePerSlotCents?: number | null
  slotDurationMinutes?: number | null
  slotCount?: number | null
}

type CoursePeriod = {
  id: string
  name: string
  startDate: Date
  endDate: Date
  salesOpenAt: Date
  salesCloseAt: Date
  organizerId: string
}

type DiscountInfo = {
  memberDiscountPercent?: number | null
  hasMultiCourseDiscount?: boolean
}

type CourseCardProps = {
  track: CourseTrack
  period: CoursePeriod
  weekDayLabel: string
  isSalesOpen: boolean
  isRegistered?: boolean
  organizerId: string
  organizerName: string
  discountInfo?: DiscountInfo
}

export function CourseCard({ 
  track, 
  period, 
  weekDayLabel, 
  isSalesOpen, 
  isRegistered = false,
  organizerId,
  organizerName,
  discountInfo
}: CourseCardProps) {
  const { getCartOrganizerId, getCartOrganizerName, items } = useCart()
  
  const cartOrganizerId = getCartOrganizerId()
  const cartOrganizerName = getCartOrganizerName()
  const isDifferentOrganizer = cartOrganizerId && cartOrganizerId !== organizerId
  const isInCart = items.some(item => item.type === 'course' && item.trackId === track.id)
  
  // Determine effective member price
  const hasMemberPrice = track.memberPriceSingleCents && track.memberPriceSingleCents > 0
  const memberDiscountPercent = discountInfo?.memberDiscountPercent

  return (
    <Card className="flex flex-col h-full hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start gap-2">
          <Badge variant="outline">{weekDayLabel}s</Badge>
          <div className="flex items-center gap-2">
            {track.levelLabel && <Badge>{track.levelLabel}</Badge>}
            <Link 
              href={`/courses/${period.id}/${track.id}`}
              className="text-rn-text-muted hover:text-rn-brand transition-colors"
              title="Course details"
            >
              <Info className="h-4 w-4" />
            </Link>
          </div>
        </div>
        <CardTitle className="pt-2 line-clamp-2">{track.title}</CardTitle>
        <CardDescription>
          {track.timeStart} - {track.timeEnd}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 space-y-2">
        <div className="space-y-2 text-sm">
          {/* PRIVATE template: Show slot-based pricing */}
          {track.templateType === 'PRIVATE' && track.pricePerSlotCents ? (
            <>
              <div className="flex justify-between">
                <span>Per slot:</span>
                <span className="font-semibold">{formatPrice(track.pricePerSlotCents)}</span>
              </div>
              {track.slotDurationMinutes && (
                <div className="text-xs text-muted-foreground">
                  {track.slotDurationMinutes} min slots · {track.slotCount} available
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex justify-between">
                <span>Single:</span>
                <span className="font-semibold">{formatPrice(track.priceSingleCents)}</span>
              </div>
              {track.pricePairCents && (
                <div className="flex justify-between">
                  <span>Couple:</span>
                  <span className="font-semibold text-green-600">{formatPrice(track.pricePairCents)}</span>
                </div>
              )}
              {/* Show member pricing */}
              {hasMemberPrice && (
                <div className="flex justify-between text-green-600">
                  <span>Member:</span>
                  <span className="font-semibold">{formatPrice(track.memberPriceSingleCents!)}</span>
                </div>
              )}
              {!hasMemberPrice && memberDiscountPercent && (
                <div className="text-xs text-green-600 font-medium">
                  {organizerName} members -{memberDiscountPercent}%
                </div>
              )}
              {discountInfo?.hasMultiCourseDiscount && (
                <div className="text-xs text-blue-600 font-medium">
                  Multi-course discounts available
                </div>
              )}
            </>
          )}
        </div>
        
        {isDifferentOrganizer && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Your cart contains courses from <strong>{cartOrganizerName}</strong>. 
              You can only checkout courses from one organizer at a time.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      
      <CardFooter>
        {(() => {
          if (isRegistered) {
            return (
              <Button className="w-full" variant="secondary" disabled>
                Already Registered
              </Button>
            )
          }

          if (isInCart) {
            return (
              <Button className="w-full" variant="secondary" disabled>
                In Cart
              </Button>
            )
          }

          if (isDifferentOrganizer) {
            return (
              <Button className="w-full" variant="outline" disabled>
                Different Organizer
              </Button>
            )
          }

          return (
            <Button className="w-full" disabled={!isSalesOpen} asChild={isSalesOpen}>
              {isSalesOpen ? (
                <Link href={`/courses/${period.id}/${track.id}/register`}>
                  Register
                </Link>
              ) : (
                <span>Sales Closed</span>
              )}
            </Button>
          )
        })()}
      </CardFooter>
    </Card>
  )
}
