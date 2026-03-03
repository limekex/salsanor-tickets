import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, GraduationCap, TrendingUp, CheckCircle2, Info } from 'lucide-react'
import { EmptyState } from '@/components'
import { UI_TEXT, getCountText } from '@/lib/i18n'
import { CoursesList } from './courses-list'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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
              Order: {
                select: {
                  id: true,
                  totalCents: true
                }
              },
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

  // Compute overall attendance stats across ALL registrations (all time)
  const attendedSessions = registrations.reduce((sum, r) => sum + r.Attendance.length, 0)

  // Estimate total available sessions: weeks between period start/end for each registration
  const today = new Date()
  const totalSessions = registrations.reduce((sum, r) => {
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

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-rn-6">
          <div>
            <h1 className="rn-h1">{UI_TEXT.courses.title}</h1>
            <p className="rn-meta text-rn-text-muted">
              {registrations.length} {getCountText(UI_TEXT.courses.singular, UI_TEXT.courses.plural, registrations.length)}
            </p>
          </div>
          
          {/* Overall attendance stats */}
          {attendedSessions > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/20 bg-primary/5 text-sm shrink-0">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                <strong>{attendedSessions}</strong>
                <span className="text-muted-foreground">
                  {attendedSessions === 1 ? 'session' : 'sessions'}
                  {totalSessions > 0 && ` (${Math.round((attendedSessions / totalSessions) * 100)}%)`}
                </span>
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="ml-1 p-0.5 rounded hover:bg-primary/10 transition-colors">
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-3">
                  <div className="space-y-2 text-xs">
                    <p className="font-medium">Lifetime Attendance</p>
                    <p className="text-muted-foreground">
                      This shows the total number of course sessions you have checked into across all your courses — both current and past.
                    </p>
                    <p className="text-muted-foreground">
                      The percentage is based on all sessions that have occurred since each period started.
                    </p>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
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
          />
        )}
      </div>
    </main>
  )
}
