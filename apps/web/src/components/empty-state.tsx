import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LucideIcon } from 'lucide-react'
import Link from 'next/link'

export interface EmptyStateProps {
  /** Icon component from lucide-react */
  icon?: LucideIcon
  /** Main title */
  title: string
  /** Optional description */
  description?: string
  /** Optional action button */
  action?: {
    label: string
    href: string
  }
}

/**
 * Reusable empty state component for "no items found" scenarios
 * 
 * Used in:
 * - Event listings (no events)
 * - Course listings (no courses)
 * - Profile sections (no registrations, no orders)
 * - Search results (no matches)
 * 
 * @example
 * <EmptyState 
 *   icon={CalendarX}
 *   title="No events found"
 *   description="Try adjusting your filters"
 *   action={{ label: "Clear filters", href: "/events" }}
 * />
 */
export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action 
}: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="py-12 text-center space-y-4">
        {Icon && (
          <div className="flex justify-center">
            <Icon className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">{title}</h3>
          {description && (
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              {description}
            </p>
          )}
        </div>

        {action && (
          <div className="pt-2">
            <Button asChild>
              <Link href={action.href}>
                {action.label}
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
