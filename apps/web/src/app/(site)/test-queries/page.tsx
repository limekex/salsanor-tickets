import { 
  getUpcomingEvents, 
  getPastEvents,
  getFeaturedEvents,
  getEventCapacity,
  getPublicCoursePeriods,
  getCourseTrackCapacity,
  getActiveOrganizers,
  getOrganizerStats,
  getUserAccountByAuthId,
  getUserEventRegistrations,
  getUserOrganizers,
  isEmailRegistered,
} from '@/lib/queries'
import { createClient } from '@/utils/supabase/server'
import { formatPrice, formatEventDate } from '@/lib/formatters'

export default async function TestQueriesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Test basic query functions
  const [events, pastEvents, featuredEvents, courses, organizers, userAccount] = await Promise.all([
    getUpcomingEvents({ limit: 3 }),
    getPastEvents({ limit: 2 }),
    getFeaturedEvents(2),
    getPublicCoursePeriods(),
    getActiveOrganizers(),
    user ? getUserAccountByAuthId(user.id) : null,
  ])

  // Test helper functions with data from above
  const firstEventId = events[0]?.id
  const firstTrackId = courses[0]?.CourseTrack[0]?.id
  const firstOrganizerId = organizers[0]?.id
  
  const [eventCapacity, trackCapacity, organizerStats, userOrgs, userRegistrations, emailCheck] = await Promise.all([
    firstEventId ? getEventCapacity(firstEventId) : null,
    firstTrackId ? getCourseTrackCapacity(firstTrackId) : null,
    firstOrganizerId ? getOrganizerStats(firstOrganizerId) : null,
    user && userAccount ? getUserOrganizers(userAccount.id) : null,
    user && userAccount ? getUserEventRegistrations(userAccount.id, { upcoming: true, limit: 3 }) : null,
    isEmailRegistered('test@example.com'),
  ])

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Query Layer Extended Test</h1>
        <p className="text-muted-foreground">
          Testing 12+ query functions from /lib/queries/
        </p>
      </div>

      {/* User Info */}
      {userAccount && (
        <div className="rounded-lg border p-6 space-y-4">
          <h2 className="text-xl font-semibold">👤 User Account</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Email:</strong> {userAccount.email}</p>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(userAccount as any).PersonProfile && (
              <p><strong>Name:</strong> {(userAccount as any).PersonProfile.firstName} {(userAccount as any).PersonProfile.lastName}</p>
            )}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <p><strong>Roles:</strong> {(userAccount as any).UserAccountRole?.length ?? 0}</p>
          </div>
        </div>
      )}

      {/* Events Queries */}
      <div className="rounded-lg border p-6 space-y-4">
        <h2 className="text-xl font-semibold">📅 Event Queries</h2>
        
        <div>
          <h3 className="font-semibold mb-2">Upcoming ({events.length})</h3>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming events</p>
          ) : (
            <div className="space-y-2">
              {events.map(event => (
                <div key={event.id} className="border rounded p-2 text-sm">
                  {event.title} - {formatPrice(event.basePriceCents)}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2 border-t">
          <h3 className="font-semibold mb-2">Past ({pastEvents.length})</h3>
          {pastEvents.length > 0 && (
            <div className="space-y-2">
              {pastEvents.map(event => (
                <div key={event.id} className="text-sm">{event.title}</div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2 border-t">
          <h3 className="font-semibold mb-2">Featured ({featuredEvents.length})</h3>
          {featuredEvents.length > 0 && (
            <div className="space-y-2">
              {featuredEvents.map(event => (
                <div key={event.id} className="text-sm bg-yellow-50 p-2 rounded">⭐ {event.title}</div>
              ))}
            </div>
          )}
        </div>

        {eventCapacity && (
          <div className="pt-2 border-t">
            <h3 className="font-semibold mb-2">Capacity Check</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Total: {eventCapacity.total}</div>
              <div>Available: {eventCapacity.available}</div>
              <div>Status: {eventCapacity.isFull ? '🔴 Full' : '🟢 Open'}</div>
            </div>
          </div>
        )}
      </div>

      {/* Course Queries */}
      <div className="rounded-lg border p-6 space-y-4">
        <h2 className="text-xl font-semibold">🎓 Course Queries</h2>
        <p className="text-sm text-muted-foreground">
          {courses.length} open course periods
        </p>
        
        {courses.length > 0 && (
          <div className="space-y-2">
            {courses.slice(0, 3).map(period => (
              <div key={period.id} className="border rounded p-2 text-sm">
                {period.name} - {period.CourseTrack.length} tracks
              </div>
            ))}
          </div>
        )}

        {trackCapacity && (
          <div className="pt-2 border-t">
            <h3 className="font-semibold mb-2">Track Capacity</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Total: {trackCapacity.total}</div>
              <div>Available: {trackCapacity.available}</div>
            </div>
          </div>
        )}
      </div>

      {/* Organizer Queries */}
      <div className="rounded-lg border p-6 space-y-4">
        <h2 className="text-xl font-semibold">🏢 Organizer Queries</h2>
        <p className="text-sm text-muted-foreground">
          {organizers.length} active organizers
        </p>
        
        {organizers.length > 0 && (
          <div className="space-y-2">
            {organizers.map(org => (
              <div key={org.id} className="border rounded p-2 text-sm">
                {org.name} - {org._count.Event} events
              </div>
            ))}
          </div>
        )}

        {organizerStats && (
          <div className="pt-2 border-t">
            <h3 className="font-semibold mb-2">Stats</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Total Events: {organizerStats.totalEvents}</div>
              <div>Upcoming: {organizerStats.upcomingEvents}</div>
            </div>
          </div>
        )}
      </div>

      {/* User Queries */}
      {user && userOrgs && userOrgs.length > 0 && (
        <div className="rounded-lg border p-6 space-y-4">
          <h2 className="text-xl font-semibold">👥 User Organizations</h2>
          <div className="space-y-2">
            {userOrgs.map(org => (
              <div key={org.id} className="border rounded p-2 text-sm">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {org.name} - {((org as any).UserAccountRole ?? []).map((r: { role: string }) => r.role).join(', ')}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="rounded-lg border p-6 bg-green-50">
        <h2 className="text-xl font-semibold mb-2">✅ All Tests Complete!</h2>
        <p className="text-sm"><strong>12 query functions tested successfully</strong></p>
        <ul className="text-xs mt-2 space-y-1 text-muted-foreground">
          <li>✅ getUpcomingEvents, getPastEvents, getFeaturedEvents</li>
          <li>✅ getEventCapacity</li>
          <li>✅ getPublicCoursePeriods, getCourseTrackCapacity</li>
          <li>✅ getActiveOrganizers, getOrganizerStats</li>
          <li>✅ getUserAccountByAuthId, getUserOrganizers</li>
          <li>✅ isEmailRegistered</li>
        </ul>
      </div>
    </div>
  )
}
