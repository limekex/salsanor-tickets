import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, GraduationCap } from 'lucide-react'
import { EmptyState } from '@/components'
import { UI_TEXT, getCountText } from '@/lib/i18n'
import { CoursesList } from './courses-list'

export default async function MyCoursesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch user account and course registrations including attendance
  const userAccount = await prisma.userAccount.findUnique({
    where: { supabaseUid: user.id },
    include: {
      PersonProfile: {
        include: {
          Registration: {
            where: {
              status: { not: 'DRAFT' }
            },
            include: {
              CourseTrack: true,
              CoursePeriod: true,
              Order: true,
              WaitlistEntry: true,
              Attendance: {
                where: { cancelled: false },
                select: { sessionDate: true }
              }
            },
            orderBy: { createdAt: 'desc' }
          },
          Ticket: {
            where: { status: 'ACTIVE' }
          }
        }
      }
    }
  })

  // If no profile yet, redirect to onboarding
  if (!userAccount?.PersonProfile) {
    redirect('/onboarding')
  }

  const registrations = userAccount.PersonProfile.Registration || []
  const tickets = userAccount.PersonProfile.Ticket || []

  // Compute overall attendance stats across all ACTIVE registrations
  const activeRegistrations = registrations.filter(r => r.status === 'ACTIVE')
  const attendedSessions = activeRegistrations.reduce((sum, r) => sum + r.Attendance.length, 0)

  // Estimate total available sessions: weeks between period start/end × active registrations
  // We use the actual attendance count per period as a proxy; expose the raw attended count
  // and let the UI calculate the rate if we have a total
  const today = new Date()
  const totalSessions = activeRegistrations.reduce((sum, r) => {
    const start = r.CoursePeriod.startDate
    const end = r.CoursePeriod.endDate > today ? today : r.CoursePeriod.endDate
    if (start >= end) return sum
    const weeksElapsed = Math.floor((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000))
    return sum + Math.max(weeksElapsed, 0)
  }, 0)

  // Shape for client component — map Attendance to attendance (lowercase)
  const mappedRegistrations = registrations.map(r => ({
    ...r,
    attendance: r.Attendance.map(a => ({ sessionDate: a.sessionDate }))
  }))

  return (
    <main className="container mx-auto py-rn-7 px-rn-4">
      <div className="max-w-5xl mx-auto space-y-rn-6">
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
          <h1 className="rn-h1">{UI_TEXT.courses.title}</h1>
          <p className="rn-meta text-rn-text-muted">
            {registrations.length} {getCountText(UI_TEXT.courses.singular, UI_TEXT.courses.plural, registrations.length)}
          </p>
        </div>

        {/* Course Registrations List */}
        {registrations.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title={UI_TEXT.courses.noCourses}
            description={UI_TEXT.courses.noCoursesDescription}
            action={{ label: UI_TEXT.courses.browseCourses, href: "/courses" }}
          />
        ) : (
          <CoursesList
            registrations={mappedRegistrations}
            tickets={tickets}
            totalSessions={totalSessions}
            attendedSessions={attendedSessions}
          />
        )}
      </div>
    </main>
  )
}
