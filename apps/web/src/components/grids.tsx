import { cn } from '@/lib/utils'

export interface GridProps {
  children: React.ReactNode
  /** Additional CSS classes */
  className?: string
}

/**
 * Event grid layout wrapper
 * 
 * Responsive grid: 1 col on mobile, 2 on tablet, 3 on desktop
 * 
 * @example
 * <EventGrid>
 *   {events.map(event => <EventCard key={event.id} event={event} />)}
 * </EventGrid>
 */
export function EventGrid({ children, className }: GridProps) {
  return (
    <div className={cn(
      "grid gap-6 md:grid-cols-2 lg:grid-cols-3",
      className
    )}>
      {children}
    </div>
  )
}

/**
 * Course grid layout wrapper
 * 
 * Responsive grid: 1 col on mobile, 2 on tablet, 3 on desktop
 * Same as EventGrid but semantic naming for clarity
 * 
 * @example
 * <CourseGrid>
 *   {tracks.map(track => <CourseCard key={track.id} track={track} />)}
 * </CourseGrid>
 */
export function CourseGrid({ children, className }: GridProps) {
  return (
    <div className={cn(
      "grid gap-6 md:grid-cols-2 lg:grid-cols-3",
      className
    )}>
      {children}
    </div>
  )
}

/**
 * Two-column grid layout
 * 
 * For forms, dashboards, or side-by-side content
 * 
 * @example
 * <TwoColumnGrid>
 *   <Card>Left content</Card>
 *   <Card>Right content</Card>
 * </TwoColumnGrid>
 */
export function TwoColumnGrid({ children, className }: GridProps) {
  return (
    <div className={cn(
      "grid gap-6 md:grid-cols-2",
      className
    )}>
      {children}
    </div>
  )
}

/**
 * Four-column grid layout
 * 
 * For small cards, stats, or dense content
 * 
 * @example
 * <FourColumnGrid>
 *   {stats.map(stat => <StatCard key={stat.id} stat={stat} />)}
 * </FourColumnGrid>
 */
export function FourColumnGrid({ children, className }: GridProps) {
  return (
    <div className={cn(
      "grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
      className
    )}>
      {children}
    </div>
  )
}
