'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { TicketQR } from '@/components/ticket-qr'
import { WalletButtons } from '@/components/wallet-buttons'
import { PayButton } from '@/components/pay-button'
import { CancelOrderButton } from '@/app/(site)/profile/cancel-order-button'
import { AcceptOfferButton, DeclineOfferButton } from '@/app/(site)/profile/offer-buttons'
import { formatDateShort, formatPrice, formatRelativeTime } from '@/lib/formatters'
import { UI_TEXT } from '@/lib/i18n'
import { EyeOff, Eye, Award, BarChart3, ChevronDown, Search } from 'lucide-react'
import { CERTIFICATE_MIN_RATE, CERTIFICATE_MIN_SESSIONS } from '@/lib/attendance-certificate'
import { AttendanceStatsCard } from '@/components/attendance-stats-card'
import { PlannedAbsenceDialog } from '@/components/planned-absence-dialog'

type SortOption = 'current' | 'dateAsc' | 'dateDesc'

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function getWeekdayName(weekday: number | undefined): string | null {
    if (weekday === undefined || weekday === null) return null
    return WEEKDAY_NAMES[weekday] ?? null
}

type Registration = {
    id: string
    periodId: string
    status: string
    chosenRole: string
    createdAt: Date | string
    CourseTrack: { id: string; title: string; weekday: number }
    CoursePeriod: { id: string; name: string; startDate: Date | string; endDate: Date | string }
    Order: { id: string; totalCents: number } | null
    WaitlistEntry: { status: string; offeredUntil: Date | string | null } | null
    attendance: { sessionDate: Date | string }[]
}

type Ticket = {
    id: string
    periodId: string
    qrTokenHash: string
    status: string
}

interface CoursesListProps {
    registrations: Registration[]
    tickets: Ticket[]
}

export function CoursesList({ registrations, tickets }: CoursesListProps) {
    const [showCanceled, setShowCanceled] = useState(false)
    const [expandedStats, setExpandedStats] = useState<Set<string>>(new Set())
    const [searchTerm, setSearchTerm] = useState('')
    const [sortBy, setSortBy] = useState<SortOption>('current')

    const toggleStats = (regId: string) => {
        setExpandedStats(prev => {
            const next = new Set(prev)
            if (next.has(regId)) {
                next.delete(regId)
            } else {
                next.add(regId)
            }
            return next
        })
    }

    const inactiveStatuses = ['CANCELLED', 'REFUNDED']
    const hasInactive = registrations.some(r => inactiveStatuses.includes(r.status))

    // Filter and sort registrations
    const filteredAndSortedRegistrations = useMemo(() => {
        let filtered = showCanceled
            ? registrations
            : registrations.filter(r => !inactiveStatuses.includes(r.status))

        // Apply search filter
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase()
            filtered = filtered.filter(r =>
                r.CourseTrack.title.toLowerCase().includes(term) ||
                r.CoursePeriod.name.toLowerCase().includes(term) ||
                r.chosenRole.toLowerCase().includes(term)
            )
        }

        // Apply sorting
        const today = new Date()
        return [...filtered].sort((a, b) => {
            const aStart = new Date(a.CoursePeriod.startDate)
            const aEnd = new Date(a.CoursePeriod.endDate)
            const bStart = new Date(b.CoursePeriod.startDate)
            const bEnd = new Date(b.CoursePeriod.endDate)

            switch (sortBy) {
                case 'current': {
                    // Current/ongoing courses first, then upcoming, then past
                    const aIsCurrent = aStart <= today && aEnd >= today
                    const bIsCurrent = bStart <= today && bEnd >= today
                    const aIsUpcoming = aStart > today
                    const bIsUpcoming = bStart > today

                    if (aIsCurrent && !bIsCurrent) return -1
                    if (!aIsCurrent && bIsCurrent) return 1
                    if (aIsUpcoming && !bIsUpcoming) return -1
                    if (!aIsUpcoming && bIsUpcoming) return 1
                    // Within same category, sort by start date
                    return aStart.getTime() - bStart.getTime()
                }
                case 'dateAsc':
                    return aStart.getTime() - bStart.getTime()
                case 'dateDesc':
                    return bStart.getTime() - aStart.getTime()
                default:
                    return 0
            }
        })
    }, [registrations, showCanceled, searchTerm, sortBy, inactiveStatuses])

    return (
        <div className="space-y-rn-6">
            {/* Hide/show canceled toggle */}
            {hasInactive && (
                <div className="flex justify-end">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCanceled(v => !v)}
                        className="gap-1.5 text-muted-foreground"
                    >
                        {showCanceled ? (
                            <>
                                <EyeOff className="h-4 w-4" />
                                Hide canceled
                            </>
                        ) : (
                            <>
                                <Eye className="h-4 w-4" />
                                Show canceled ({registrations.filter(r => inactiveStatuses.includes(r.status)).length})
                            </>
                        )}
                    </Button>
                </div>
            )}

            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={UI_TEXT.courseFilters.search}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder={UI_TEXT.courseFilters.sortBy} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="current">{UI_TEXT.courseFilters.sortOptions.current}</SelectItem>
                        <SelectItem value="dateAsc">{UI_TEXT.courseFilters.sortOptions.dateAsc}</SelectItem>
                        <SelectItem value="dateDesc">{UI_TEXT.courseFilters.sortOptions.dateDesc}</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* No results message */}
            {filteredAndSortedRegistrations.length === 0 && searchTerm && (
                <div className="text-center py-8 text-muted-foreground">
                    No courses found matching &quot;{searchTerm}&quot;
                </div>
            )}

            {/* Course cards */}
            <div className="grid gap-rn-6 md:grid-cols-2">
                {filteredAndSortedRegistrations.map((reg) => {
                    const attended = reg.attendance.length

                    // Certificate eligibility: compute weeks elapsed for this specific registration
                    const today = new Date()
                    const periodStart = new Date(reg.CoursePeriod.startDate)
                    const periodEnd = new Date(reg.CoursePeriod.endDate)
                    const refDate = periodEnd > today ? today : periodEnd
                    const weeksElapsed = periodStart < refDate
                        ? Math.max(Math.floor((refDate.getTime() - periodStart.getTime()) / (7 * 24 * 60 * 60 * 1000)), 0)
                        : 0
                    const attendanceRate = weeksElapsed > 0 ? attended / weeksElapsed : 0
                    const certificateEligible = reg.status === 'ACTIVE' && attended > 0 && weeksElapsed >= CERTIFICATE_MIN_SESSIONS && attendanceRate >= CERTIFICATE_MIN_RATE

                    return (
                        <Card key={reg.id}>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div className="flex gap-2 flex-wrap">
                                        <Badge variant={reg.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                            {reg.status}
                                        </Badge>
                                        {getWeekdayName(reg.CourseTrack.weekday) && (
                                            <Badge variant="outline" className="font-medium">
                                                {getWeekdayName(reg.CourseTrack.weekday)}
                                            </Badge>
                                        )}
                                    </div>
                                    <span className="text-sm text-muted-foreground">
                                        {formatDateShort(reg.createdAt)}
                                    </span>
                                </div>
                                <CardTitle>{reg.CourseTrack.title}</CardTitle>
                                <CardDescription>{reg.CoursePeriod.name}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span>{UI_TEXT.courses.role}</span>
                                            <span>{reg.chosenRole}</span>
                                        </div>
                                        {reg.Order && (
                                            <div className="flex justify-between border-t pt-2">
                                                <span>{UI_TEXT.courses.totalPaid}</span>
                                                <span>{formatPrice(reg.Order.totalCents)}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* OFFER UI */}
                                    {reg.WaitlistEntry?.status === 'OFFERED' && reg.WaitlistEntry.offeredUntil && (
                                        <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-md border border-orange-200 dark:border-orange-800 space-y-3">
                                            <div>
                                                <h4 className="font-bold text-orange-800 dark:text-orange-400">{UI_TEXT.waitlist.spotOffered}</h4>
                                                <p className="text-xs text-orange-700 dark:text-orange-500">
                                                    {UI_TEXT.waitlist.expires} {formatRelativeTime(reg.WaitlistEntry.offeredUntil)}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <AcceptOfferButton registrationId={reg.id} />
                                                <DeclineOfferButton registrationId={reg.id} />
                                            </div>
                                        </div>
                                    )}

                                    {(reg.status === 'DRAFT' || reg.status === 'PENDING_PAYMENT') && reg.Order?.id && (
                                        <div className="space-y-2">
                                            <PayButton orderId={reg.Order.id} />
                                            <CancelOrderButton orderId={reg.Order.id} />
                                        </div>
                                    )}

                                    {reg.status === 'ACTIVE' && (
                                        (() => {
                                            const ticket = tickets.find(t => t.periodId === reg.periodId)
                                            if (ticket) {
                                                return (
                                                    <div className="space-y-4">
                                                        <TicketQR token={ticket.qrTokenHash} title={reg.CoursePeriod.name} />
                                                        <WalletButtons ticketId={ticket.id} type="course" />
                                                    </div>
                                                )
                                            }
                                            return null
                                        })()
                                    )}

                                    {/* Separator between wallet ticket and action buttons */}
                                    {reg.status === 'ACTIVE' && (
                                        <div className="border-t pt-4 space-y-3">
                                            {/* Planned Absence */}
                                            <PlannedAbsenceDialog
                                                registrationId={reg.id}
                                                trackId={reg.CourseTrack.id}
                                                trackTitle={reg.CourseTrack.title}
                                            />

                                            {/* Stats Toggle Button + Animated Panel */}
                                            <div className="relative">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => toggleStats(reg.id)}
                                                    className="w-full gap-2 transition-colors"
                                                >
                                                    <BarChart3 className="h-4 w-4" />
                                                    <span>Attendance Stats</span>
                                                    {attended > 0 && (
                                                        <Badge variant="secondary" className="ml-1 text-xs">
                                                            {attended} {attended === 1 ? 'session' : 'sessions'}
                                                        </Badge>
                                                    )}
                                                    <ChevronDown className={`h-4 w-4 ml-auto transition-transform duration-300 ${expandedStats.has(reg.id) ? 'rotate-180' : ''}`} />
                                                </Button>
                                                
                                                {/* Animated Stats Panel */}
                                                <div 
                                                    className={`grid transition-all duration-300 ease-in-out ${expandedStats.has(reg.id) ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0'}`}
                                                >
                                                    <div className="overflow-hidden">
                                                        <AttendanceStatsCard registrationId={reg.id} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Attendance Certificate */}
                                    {certificateEligible && (
                                        <a
                                            href={`/api/attendance-certificate?registrationId=${reg.id}`}
                                            className="flex items-center justify-center gap-2 w-full rounded-md border border-amber-400 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-sm font-medium text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/40 transition-colors"
                                            download
                                        >
                                            <Award className="h-4 w-4" />
                                            Download Attendance Certificate
                                        </a>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
