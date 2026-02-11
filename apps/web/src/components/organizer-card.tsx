import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Calendar } from 'lucide-react'
import Link from 'next/link'

type OrganizerCardProps = {
  organizer: {
    id: string
    name: string
    slug: string
    city?: string | null
    logoUrl?: string | null
    description?: string | null
  }
  eventCount?: number
  courseCount?: number
  featured?: boolean
  showCounts?: boolean
}

export function OrganizerCard({ 
  organizer, 
  eventCount = 0,
  courseCount = 0,
  featured = false,
  showCounts = true
}: OrganizerCardProps) {
  return (
    <Card className="flex flex-col h-full hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            {featured && (
              <Badge variant="secondary" className="mb-2">Featured</Badge>
            )}
            <CardTitle className="line-clamp-2">{organizer.name}</CardTitle>
            {organizer.city && (
              <CardDescription className="flex items-center gap-1 mt-2">
                <MapPin className="h-3 w-3" />
                {organizer.city}
              </CardDescription>
            )}
          </div>
          {organizer.logoUrl && (
            <img 
              src={organizer.logoUrl} 
              alt={`${organizer.name} logo`}
              className="h-12 w-12 rounded object-cover"
            />
          )}
        </div>
      </CardHeader>

      {organizer.description && (
        <CardContent className="flex-1">
          <p className="text-sm text-muted-foreground line-clamp-3">
            {organizer.description}
          </p>
        </CardContent>
      )}

      {showCounts && (eventCount > 0 || courseCount > 0) && (
        <CardContent className={organizer.description ? 'pt-0' : ''}>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {eventCount > 0 && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{eventCount} {eventCount === 1 ? 'event' : 'events'}</span>
              </div>
            )}
            {courseCount > 0 && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{courseCount} {courseCount === 1 ? 'course' : 'courses'}</span>
              </div>
            )}
          </div>
        </CardContent>
      )}

      <CardFooter>
        <Button className="w-full" asChild>
          <Link href={`/org/${organizer.slug}`}>
            View Organization
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
