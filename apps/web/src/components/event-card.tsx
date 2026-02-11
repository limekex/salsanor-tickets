'use client'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin, Users, Clock } from 'lucide-react'
import Link from 'next/link'
import { formatEventDate } from '@/lib/formatters/date'
import { formatPrice } from '@/lib/formatters/price'
import type { EventCardData } from '@/types'

export interface EventCardProps {
  event: EventCardData
  /** Show organizer information */
  showOrganizer?: boolean
  /** Compact mode with less details */
  compact?: boolean
  /** Link to event detail page */
  href?: string
  /** Override the default button action */
  action?: React.ReactNode
}

/**
 * Reusable event card component for displaying events in grids
 * 
 * Used in:
 * - /events (public event listing)
 * - /org/[slug]/events (organizer events)
 * - /org/[slug] (organizer home page)
 * - /profile (user's registered events)
 * 
 * @example
 * <EventCard 
 *   event={event} 
 *   showOrganizer={true}
 *   href={`/events/${event.id}`}
 * />
 */
export function EventCard({ 
  event, 
  showOrganizer = false,
  compact = false,
  href,
  action
}: EventCardProps) {
  // Calculate capacity info from EventRegistration array
  const registeredCount = event.EventRegistration?.reduce((sum, reg) => sum + reg.quantity, 0) ?? 0
  const spotsLeft = event.capacityTotal > 0 
    ? event.capacityTotal - registeredCount 
    : null
  
  const capacityPercent = event.capacityTotal > 0 
    ? Math.round((registeredCount / event.capacityTotal) * 100)
    : 0

  const isFull = spotsLeft !== null && spotsLeft <= 0
  const isPastEvent = new Date(event.startDateTime) < new Date()

  return (
    <Card className={`flex flex-col h-full relative overflow-hidden ${
      isPastEvent ? 'opacity-60 grayscale' : ''
    }`}>
      {/* Sold Out Banner */}
      {isFull && !isPastEvent && (
        <div className="absolute top-0 right-0 w-full h-full pointer-events-none z-10">
          <div className="absolute top-[40px] -right-[40px] w-[200px] bg-red-500 text-white text-center py-2 rotate-45 shadow-lg font-bold text-sm">
            SOLD OUT
          </div>
        </div>
      )}
      
      {/* Past Event Banner */}
      {isPastEvent && (
        <div className="absolute top-0 right-0 w-full h-full pointer-events-none z-10">
          <div className="absolute top-[40px] -right-[40px] w-[200px] bg-slate-500 text-white text-center py-2 rotate-45 shadow-lg font-bold text-sm">
            EVENT PASSED
          </div>
        </div>
      )}
      
      {/* Event Image */}
      {event.imageUrl && !compact && (
        <div className="aspect-video relative overflow-hidden rounded-t-lg">
          <img 
            src={event.imageUrl} 
            alt={event.title}
            className="object-cover w-full h-full"
          />
        </div>
      )}

      {/* Header */}
      <CardHeader>
        <div className="flex items-start justify-between gap-2 mb-2">
          {!compact && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span>{formatEventDate(event.startDateTime)}</span>
            </div>
          )}
          {event.featured && (
            <Badge variant="default">Featured</Badge>
          )}
        </div>

        <CardTitle className={compact ? "text-lg" : "text-xl"}>
          {event.title}
        </CardTitle>

        {event.shortDescription && (
          <CardDescription className={compact ? "line-clamp-2" : "line-clamp-3"}>
            {event.shortDescription}
          </CardDescription>
        )}

        {showOrganizer && event.Organizer && (
          <CardDescription className="flex items-center gap-1 pt-1">
            by {event.Organizer.name}
          </CardDescription>
        )}
      </CardHeader>

      {/* Content */}
      <CardContent className="space-y-3 flex-grow">
        {/* Compact mode: just date and location */}
        {compact ? (
          <>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span>{new Date(event.startDateTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{event.locationName}</span>
            </div>
          </>
        ) : (
          <>
            {/* Time */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span>
                {new Date(event.startDateTime).toLocaleTimeString('en-GB', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
                {event.endDateTime && 
                  ` - ${new Date(event.endDateTime).toLocaleTimeString('en-GB', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}`
                }
              </span>
            </div>

            {/* Location */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span>
                {event.locationName}
                {event.city && `, ${event.city}`}
              </span>
            </div>

            {/* Capacity */}
            {event.capacityTotal > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4 flex-shrink-0" />
                <span>
                  {isFull 
                    ? 'Full' 
                    : spotsLeft !== null 
                      ? `${spotsLeft} spots left`
                      : `${registeredCount} registered`
                  } • {capacityPercent}% full
                </span>
              </div>
            )}

            {/* Categories */}
            {event.Category && event.Category.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {event.Category.map(cat => (
                  <Badge key={cat.id} variant="outline" className="text-xs">
                    {cat.icon && `${cat.icon} `}{cat.name}
                  </Badge>
                ))}
              </div>
            )}

            {/* Tags */}
            {event.Tag && event.Tag.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {event.Tag.map(tag => (
                  <Badge 
                    key={tag.id} 
                    variant="secondary"
                    className="text-xs"
                    style={tag.color ? { 
                      backgroundColor: tag.color + '20',
                      borderColor: tag.color,
                      color: tag.color
                    } : undefined}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Footer */}
      <CardFooter className="flex justify-between items-center gap-4">
        <span className="font-semibold text-lg">
          {formatPrice(event.basePriceCents)}
        </span>
        
        {action ? (
          action
        ) : href ? (
          <Button asChild>
            <Link href={href}>
              View Details
            </Link>
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  )
}
