import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { 
  Ticket, 
  GraduationCap, 
  CreditCard, 
  Calendar, 
  ShoppingBag, 
  BarChart3, 
  Settings, 
  HelpCircle,
  Info,
  Bell,
  ChevronRight
} from 'lucide-react'
import { UI_TEXT, getCountText } from '@/lib/i18n'
import { EmptyState } from '@/components'
import { DashboardCheckin } from './dashboard-checkin'

export default async function MyDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const today = new Date()

  // Fetch user account with detailed registrations for status breakdown
  const userAccount = await prisma.userAccount.findUnique({
    where: { supabaseUid: user.id },
    include: {
      PersonProfile: {
        include: {
          EventRegistration: {
            where: { status: { not: 'DRAFT' } },
            include: {
              Event: { select: { startDateTime: true, endDateTime: true } }
            }
          },
          Registration: {
            where: { status: { not: 'DRAFT' } },
            include: {
              CoursePeriod: { select: { startDate: true, endDate: true } }
            }
          },
          Membership: {
            where: { status: { not: 'CANCELLED' } }
          },
          Order: {
            where: { status: { not: 'DRAFT' } }
          }
        }
      }
    }
  })

  // If no profile yet, redirect to onboarding
  if (!userAccount?.PersonProfile) {
    redirect('/onboarding')
  }

  // Fetch today's self check-in tracks
  const jsDayOfWeek = today.getDay()
  const isoDayOfWeek = jsDayOfWeek === 0 ? 7 : jsDayOfWeek
  const sessionDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))

  const selfCheckInRegistrations = await prisma.registration.findMany({
    where: {
      personId: userAccount.PersonProfile.id,
      status: 'ACTIVE',
      CourseTrack: {
        allowDashboardCheckIn: true,
        weekday: isoDayOfWeek
      },
      CoursePeriod: {
        startDate: { lte: sessionDate },
        endDate: { gte: sessionDate }
      }
    },
    include: {
      CourseTrack: {
        select: {
          id: true,
          title: true,
          weekday: true,
          timeStart: true,
          checkInWindowBefore: true,
          checkInWindowAfter: true,
          geofenceEnabled: true,
          geofenceRadius: true,
          latitude: true,
          longitude: true
        }
      },
      CoursePeriod: {
        select: { id: true, name: true }
      },
      Attendance: {
        where: {
          sessionDate,
          cancelled: false
        },
        select: {
          id: true,
          checkInTime: true
        }
      }
    }
  })

  // Check for breaks and format tracks
  const checkInTracksPromises = selfCheckInRegistrations.map(async (reg) => {
    const activeBreak = await prisma.periodBreak.findFirst({
      where: {
        OR: [
          { periodId: reg.CoursePeriod.id, trackId: null },
          { trackId: reg.CourseTrack.id }
        ],
        startDate: { lte: sessionDate },
        endDate: { gte: sessionDate }
      }
    })

    if (activeBreak) return null

    const attendance = reg.Attendance[0]
    const checkedInTime = attendance 
      ? new Intl.DateTimeFormat('en-GB', { timeStyle: 'short' }).format(attendance.checkInTime)
      : undefined

    return {
      id: reg.CourseTrack.id,
      title: reg.CourseTrack.title,
      periodName: reg.CoursePeriod.name,
      weekday: reg.CourseTrack.weekday,
      timeStart: reg.CourseTrack.timeStart,
      checkInWindowBefore: reg.CourseTrack.checkInWindowBefore ?? 30,
      checkInWindowAfter: reg.CourseTrack.checkInWindowAfter ?? 30,
      geofenceEnabled: reg.CourseTrack.geofenceEnabled,
      geofenceRadius: reg.CourseTrack.geofenceRadius,
      latitude: reg.CourseTrack.latitude,
      longitude: reg.CourseTrack.longitude,
      registrationId: reg.id,
      alreadyCheckedIn: !!attendance,
      checkedInTime
    }
  })

  const checkInTracksResolved = await Promise.all(checkInTracksPromises)
  const checkInTracks = checkInTracksResolved
    .filter((t): t is NonNullable<typeof t> => t !== null)
    .sort((a, b) => a.timeStart.localeCompare(b.timeStart))

  // Fetch upcoming courses for the next 7 days (all active registrations with their tracks)
  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const upcomingCourses: { dayLabel: string; courses: { title: string; time: string; periodName: string }[] }[] = []
  
  // Get all active registrations with track info
  const activeRegistrations = await prisma.registration.findMany({
    where: {
      personId: userAccount.PersonProfile.id,
      status: 'ACTIVE',
      CoursePeriod: {
        startDate: { lte: sessionDate },
        endDate: { gte: sessionDate }
      }
    },
    include: {
      CourseTrack: {
        select: {
          title: true,
          weekday: true,
          timeStart: true
        }
      },
      CoursePeriod: {
        select: { id: true, name: true, endDate: true }
      }
    }
  })

  // Build list of upcoming days with courses (next 7 days, excluding today)
  for (let i = 1; i <= 7; i++) {
    const futureDate = new Date(today)
    futureDate.setDate(today.getDate() + i)
    const futureDayJs = futureDate.getDay()
    const futureDayIso = futureDayJs === 0 ? 7 : futureDayJs
    
    // Find courses scheduled for this weekday
    const coursesOnDay = activeRegistrations
      .filter(r => r.CourseTrack.weekday === futureDayIso && new Date(r.CoursePeriod.endDate) >= futureDate)
      .map(r => ({
        title: r.CourseTrack.title,
        time: r.CourseTrack.timeStart,
        periodName: r.CoursePeriod.name
      }))
      .sort((a, b) => a.time.localeCompare(b.time))
    
    if (coursesOnDay.length > 0) {
      const dayLabel = i === 1 ? 'Tomorrow' : weekdayNames[futureDayJs]
      upcomingCourses.push({ dayLabel, courses: coursesOnDay })
    }
  }

  // Calculate event ticket stats
  const eventRegistrations = userAccount.PersonProfile.EventRegistration || []
  const eventStats = {
    total: eventRegistrations.length,
    past: eventRegistrations.filter(r => r.Event && r.Event.endDateTime && new Date(r.Event.endDateTime) < today).length,
    active: eventRegistrations.filter(r => r.Event && r.Event.startDateTime && r.Event.endDateTime && new Date(r.Event.startDateTime) <= today && new Date(r.Event.endDateTime) >= today).length,
    upcoming: eventRegistrations.filter(r => r.Event && r.Event.startDateTime && new Date(r.Event.startDateTime) > today).length
  }

  // Calculate course stats
  const courseRegistrations = userAccount.PersonProfile.Registration || []
  const courseStats = {
    total: courseRegistrations.length,
    past: courseRegistrations.filter(r => r.CoursePeriod && new Date(r.CoursePeriod.endDate) < today).length,
    active: courseRegistrations.filter(r => 
      r.CoursePeriod && 
      r.status === 'ACTIVE' &&
      new Date(r.CoursePeriod.startDate) <= today && 
      new Date(r.CoursePeriod.endDate) >= today
    ).length,
    upcoming: courseRegistrations.filter(r => r.CoursePeriod && new Date(r.CoursePeriod.startDate) > today).length
  }

  const membershipsCount = userAccount.PersonProfile.Membership?.length ?? 0
  const ordersCount = userAccount.PersonProfile.Order?.length ?? 0

  return (
    <main className="container mx-auto py-rn-7 px-rn-4">
      <div className="max-w-4xl mx-auto space-y-rn-6">
        {/* Header */}
        <div className="mb-rn-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-rn-4">
            <div>
              <h1 className="rn-h1">{UI_TEXT.portal.title}</h1>
              <p className="rn-meta text-rn-text-muted">{UI_TEXT.portal.welcome}, {userAccount.PersonProfile.firstName}!</p>
            </div>
          </div>
        </div>

        {/* Notices & Check-in Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-rn-4">
          {/* Notices/Announcements Section - 2/3 width */}
          <Card className="lg:col-span-2 border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <CardTitle className="text-base">Notices & Announcements</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-white/80 dark:bg-slate-900/50 border border-blue-100 dark:border-blue-900">
                  <Info className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">Welcome to your participant portal! Here you can manage your courses, tickets, and memberships.</p>
                    <p className="text-xs text-muted-foreground mt-1">New to the platform? Check out our <Link href="/my/help" className="text-primary hover:underline">Help & FAQ</Link> section.</p>
                  </div>
                </div>
                {/* More notices will appear here when the notification system is implemented */}
              </div>
            </CardContent>
          </Card>

          {/* Self Check-in Widget - 1/3 width */}
          {(checkInTracks.length > 0 || upcomingCourses.length > 0) && (
            <DashboardCheckin initialTracks={checkInTracks} upcomingCourses={upcomingCourses} />
          )}
        </div>

        {/* Main Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-rn-6">
          {/* Courses Card - Enhanced */}
          <Card className="hover:border-rn-primary transition-colors">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-rn-3">
                  <div className="p-rn-2 rounded-lg bg-rn-primary/10">
                    <GraduationCap className="h-6 w-6 text-rn-primary" />
                  </div>
                  <div>
                    <CardTitle className="rn-h3">{UI_TEXT.dashboard.courses}</CardTitle>
                    <CardDescription className="rn-meta">
                      {courseStats.total} {getCountText(UI_TEXT.courses.singular, UI_TEXT.courses.plural, courseStats.total)}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status Breakdown */}
              {courseStats.total > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {courseStats.active > 0 && (
                    <Badge variant="default" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-200">
                      {courseStats.active} Active
                    </Badge>
                  )}
                  {courseStats.upcoming > 0 && (
                    <Badge variant="outline" className="border-blue-200 text-blue-700 dark:text-blue-400">
                      {courseStats.upcoming} Upcoming
                    </Badge>
                  )}
                  {courseStats.past > 0 && (
                    <Badge variant="secondary">
                      {courseStats.past} Past
                    </Badge>
                  )}
                </div>
              )}
              <Button asChild className="w-full">
                <Link href="/my/courses">
                  View Courses
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Event Tickets Card - Enhanced */}
          <Card className="hover:border-rn-primary transition-colors">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-rn-3">
                  <div className="p-rn-2 rounded-lg bg-rn-primary/10">
                    <Ticket className="h-6 w-6 text-rn-primary" />
                  </div>
                  <div>
                    <CardTitle className="rn-h3">{UI_TEXT.dashboard.eventTickets}</CardTitle>
                    <CardDescription className="rn-meta">
                      {eventStats.total} {getCountText(UI_TEXT.tickets.singular, UI_TEXT.tickets.plural, eventStats.total)}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status Breakdown */}
              {eventStats.total > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {eventStats.active > 0 && (
                    <Badge variant="default" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-200">
                      {eventStats.active} Today
                    </Badge>
                  )}
                  {eventStats.upcoming > 0 && (
                    <Badge variant="outline" className="border-blue-200 text-blue-700 dark:text-blue-400">
                      {eventStats.upcoming} Upcoming
                    </Badge>
                  )}
                  {eventStats.past > 0 && (
                    <Badge variant="secondary">
                      {eventStats.past} Past
                    </Badge>
                  )}
                </div>
              )}
              <Button asChild className="w-full">
                <Link href="/my/tickets">
                  View Tickets
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Attendance Card */}
          <Card className="hover:border-rn-primary transition-colors">
            <CardHeader>
              <div className="flex items-center gap-rn-3">
                <div className="p-rn-2 rounded-lg bg-rn-primary/10">
                  <BarChart3 className="h-6 w-6 text-rn-primary" />
                </div>
                <div>
                  <CardTitle className="rn-h3">Attendance</CardTitle>
                  <CardDescription className="rn-meta">
                    Track your course attendance
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/my/attendance">
                  View Attendance
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Orders Card */}
          <Card className="hover:border-rn-primary transition-colors">
            <CardHeader>
              <div className="flex items-center gap-rn-3">
                <div className="p-rn-2 rounded-lg bg-rn-primary/10">
                  <ShoppingBag className="h-6 w-6 text-rn-primary" />
                </div>
                <div>
                  <CardTitle className="rn-h3">Orders</CardTitle>
                  <CardDescription className="rn-meta">
                    {ordersCount} {getCountText('order', 'orders', ordersCount)}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/my/orders">
                  View Orders
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Memberships Section - Only if has memberships */}
        {membershipsCount > 0 && (
          <Card className="hover:border-rn-primary transition-colors">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-rn-3">
                  <div className="p-rn-2 rounded-lg bg-rn-primary/10">
                    <CreditCard className="h-6 w-6 text-rn-primary" />
                  </div>
                  <div>
                    <CardTitle className="rn-h3">Memberships</CardTitle>
                    <CardDescription className="rn-meta">
                      {membershipsCount} active {getCountText('membership', 'memberships', membershipsCount)}
                    </CardDescription>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href="/my/memberships">
                    View All
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Quick Links Section - Expanded */}
        <Card>
          <CardHeader>
            <CardTitle className="rn-h3">{UI_TEXT.dashboard.quickActions}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
                <Link href="/courses">
                  <Calendar className="h-5 w-5" />
                  <span className="text-xs">Browse Courses</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
                <Link href="/events">
                  <Ticket className="h-5 w-5" />
                  <span className="text-xs">Browse Events</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
                <Link href="/my/settings">
                  <Settings className="h-5 w-5" />
                  <span className="text-xs">Settings</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
                <Link href="/my/help">
                  <HelpCircle className="h-5 w-5" />
                  <span className="text-xs">Help & FAQ</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
