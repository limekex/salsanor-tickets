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
  memberDiscountMode?: 'ENABLED' | 'FIXED' | 'DISABLED' | null
  capacityTotal: number
  // Template type and slot booking fields
  templateType?: string | null
  pricePerSlotCents?: number | null
  slotDurationMinutes?: number | null
  slotCount?: number | null
  // Team pricing fields
  pricePerPersonCents?: number | null
  teamMinSize?: number | null
  teamMaxSize?: number | null
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
  hasActiveMembershipTiers?: boolean // Whether org has a default membership tier set
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
  // Show member pricing only if:
  // - Org has active tiers
  // - Track's memberDiscountMode is not DISABLED
  const memberDiscountMode = track.memberDiscountMode ?? 'ENABLED'
  const showMemberPricing = discountInfo?.hasActiveMembershipTiers !== false && memberDiscountMode !== 'DISABLED'
  const hasMemberPrice = showMemberPricing && track.memberPriceSingleCents && track.memberPriceSingleCents > 0
  const memberDiscountPercent = showMemberPricing ? discountInfo?.memberDiscountPercent : null

  // For PRIVATE templates:
  // 1. Use memberPriceSingleCents as fixed per-slot member price if set
  // 2. Otherwise fall back to percent discount from discount rules
  let privateMemberPrice: number | null = null
  if (track.templateType === 'PRIVATE' && showMemberPricing && track.pricePerSlotCents) {
    if (track.memberPriceSingleCents && track.memberPriceSingleCents > 0) {
      privateMemberPrice = track.memberPriceSingleCents
    } else if (memberDiscountPercent) {
      privateMemberPrice = Math.round(track.pricePerSlotCents * (1 - memberDiscountPercent / 100))
    }
  }

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
              {privateMemberPrice && privateMemberPrice < track.pricePerSlotCents && (
                <div className="flex justify-between text-green-600">
                  <span>Member:</span>
                  <span className="font-semibold">{formatPrice(privateMemberPrice)}</span>
                  {memberDiscountPercent && (
                    <span className="text-xs text-green-600 font-medium ml-2">-{memberDiscountPercent}%</span>
                  )}
                </div>
              )}
              {track.slotDurationMinutes && (
                <div className="text-xs text-muted-foreground">
                  {track.slotDurationMinutes} min slots · {track.slotCount} available
                </div>
              )}
            </>
          ) : track.templateType === 'TEAM' && track.pricePerPersonCents ? (
            /* TEAM template: Show per-person pricing */
            <>
              <div className="flex justify-between">
                <span>Per person:</span>
                <span className="font-semibold">{formatPrice(track.pricePerPersonCents)}</span>
              </div>
              {(track.teamMinSize || track.teamMaxSize) && (
                <div className="text-xs text-muted-foreground">
                  Team size: {track.teamMinSize ?? 2}–{track.teamMaxSize ?? 10} people
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex justify-between">
                <span>Single:</span>
                <span className="font-semibold">{formatPrice(track.priceSingleCents)}</span>
              </div>
              {track.pricePairCents && track.pricePairCents > 0 && (
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
