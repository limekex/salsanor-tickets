import { getCourseTrackDetails } from '@/app/actions/courses'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { formatDateRange, formatWeekday, formatDateShort, formatPrice } from '@/lib/formatters'
import { ArrowLeft, CalendarDays, CreditCard, MapPin, Users, CalendarOff, GraduationCap, Pencil, Tag, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { SocialShare } from '@/components/social-share'

interface PageProps {
    params: Promise<{
        periodId: string
        trackId: string
    }>
}

// Parse discount rules for display-friendly format
function parseDiscounts(discountRules: Array<{ ruleType: string; name: string; config: unknown }>) {
    const discounts: { memberPercent?: number; multiCourseTiers?: Array<{ count: number; percent?: number; cents?: number }> } = {}
    
    for (const rule of discountRules) {
        if (rule.ruleType === 'MEMBERSHIP_TIER_PERCENT') {
            const config = rule.config as { discountPercent?: number }
            if (config.discountPercent) {
                discounts.memberPercent = config.discountPercent
            }
        }
        if (rule.ruleType === 'MULTI_COURSE_TIERED') {
            const config = rule.config as { tiers?: Array<{ count: number; discountPercent?: number; discountCents?: number }> }
            if (config.tiers) {
                discounts.multiCourseTiers = config.tiers.map(t => ({
                    count: t.count,
                    percent: t.discountPercent,
                    cents: t.discountCents
                }))
            }
        }
    }
    
    return discounts
}

export default async function TrackDetailPage({ params }: PageProps) {
    const { trackId, periodId } = await params
    const track = await getCourseTrackDetails(trackId, periodId)

    if (!track) {
        notFound()
    }

    const period = track.CoursePeriod
    const organizer = period.Organizer
    const isSalesOpen = period.salesOpenAt < new Date() && period.salesCloseAt > new Date()
    const availableSpots = track.capacityTotal - track._count.Registration
    const isFull = availableSpots <= 0
    const weekDayLabel = formatWeekday(track.weekday)
    
    // Type assertion for fields that may not be in cached Prisma types yet
    const trackWithExtras = track as typeof track & {
        description?: string | null
        imageUrl?: string | null
        locationName?: string | null
        locationAddress?: string | null
        latitude?: number | null
        longitude?: number | null
    }

    // Check if current user is org admin
    let isOrgAdmin = false
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
        const userAccount = await prisma.userAccount.findUnique({
            where: { supabaseUid: user.id },
            include: {
                UserAccountRole: {
                    where: {
                        role: 'ORG_ADMIN',
                        organizerId: organizer.id
                    }
                }
            }
        })
        isOrgAdmin = (userAccount?.UserAccountRole?.length ?? 0) > 0
    }

    // Check if org has membership product enabled
    const organizerDetails = await prisma.organizer.findUnique({
        where: { id: organizer.id },
        select: { membershipEnabled: true }
    })
    const hasMembershipProduct = organizerDetails?.membershipEnabled ?? false

    // Parse discount rules for display - merge org-level and period-level rules
    type OrganizerWithRules = typeof organizer & { 
        OrgDiscountRule?: Array<{ ruleType: string; name: string; config: unknown }> 
    }
    const orgDiscountRules = (organizer as OrganizerWithRules).OrgDiscountRule || []
    const periodDiscountRules = period.DiscountRule || []
    const allDiscountRules = [...orgDiscountRules, ...periodDiscountRules]
    const discounts = parseDiscounts(allDiscountRules)

    // Calculate member price if no fixed member price but discount rule exists
    const effectiveMemberPrice = track.memberPriceSingleCents 
        ?? (discounts.memberPercent 
            ? Math.round(track.priceSingleCents * (1 - discounts.memberPercent / 100))
            : null)

    // Pretty URL for sharing (use period code + track slug when available)
    const trackSlug = 'slug' in track ? track.slug as string | null : null
    const prettyUrl = trackSlug 
        ? `/courses/${period.code}/${trackSlug}`
        : null

    return (
        <main className="container mx-auto py-rn-6 px-rn-4 max-w-3xl">
            {/* Back link */}
            <Link 
                href="/courses" 
                className="inline-flex items-center gap-rn-2 text-rn-text-muted hover:text-rn-text mb-rn-4"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to courses
            </Link>

            {/* Header */}
            <div className="space-y-rn-3 mb-rn-6">
                <div className="flex items-start justify-between gap-rn-4">
                    <div>
                        <p className="rn-caption text-rn-text-muted mb-rn-1">
                            <Link href={`/org/${organizer.slug}`} className="hover:text-rn-text">
                                {organizer.name}
                            </Link>
                        </p>
                        <h1 className="text-3xl sm:text-4xl font-bold">{track.title}</h1>
                        {track.levelLabel && (
                            <p className="rn-meta text-rn-text-muted mt-rn-1">
                                <GraduationCap className="inline h-4 w-4 mr-rn-1" />
                                {track.levelLabel}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-rn-2">
                        {prettyUrl && (
                            <SocialShare 
                                url={prettyUrl} 
                                title={`${track.title} - ${organizer.name}`}
                                description={trackWithExtras.description || `Join ${track.title} with ${organizer.name}! ${weekDayLabel}s at ${track.timeStart}.`}
                            />
                        )}
                        {isOrgAdmin && (
                            <Button asChild variant="outline" size="sm">
                                <Link href={`/staffadmin/tracks/${track.id}`}>
                                    <Pencil className="h-4 w-4 mr-rn-1" />
                                    Edit
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Hero Image */}
            {trackWithExtras.imageUrl && (
                <div className="relative aspect-[2/1] w-full overflow-hidden rounded-rn-2 mb-rn-6">
                    <Image
                        src={trackWithExtras.imageUrl}
                        alt={track.title}
                        fill
                        className="object-cover"
                        priority
                    />
                </div>
            )}

            {/* Description + Registration CTA */}
            <div className="grid gap-rn-6 lg:grid-cols-3 mb-rn-6">
                {/* Description - 2/3 */}
                <div className="lg:col-span-2">
                    {trackWithExtras.description ? (
                        <Card className="h-full">
                            <CardHeader className="pb-rn-2">
                                <CardTitle className="rn-h4">About this course</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="rn-body text-rn-text-muted whitespace-pre-wrap">{trackWithExtras.description}</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="h-full">
                            <CardContent className="py-rn-6">
                                <p className="rn-body text-rn-text-muted">No description available for this course.</p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Registration CTA - 1/3 */}
                <Card className="h-fit">
                    <CardContent className="py-rn-6 space-y-rn-4">
                        <div className="text-center">
                            <p className="rn-body font-medium text-lg mb-rn-1">
                                {formatPrice(track.priceSingleCents)}
                            </p>
                            {effectiveMemberPrice && effectiveMemberPrice < track.priceSingleCents && (
                                <p className="rn-meta text-rn-primary">
                                    {organizer.name} member: {formatPrice(effectiveMemberPrice)}
                                </p>
                            )}
                        </div>
                        <div className="space-y-rn-2">
                            <p className="rn-body font-medium text-center">
                                {isSalesOpen ? (
                                    isFull ? 'Course is full' : 'Registration is open!'
                                ) : (
                                    period.salesOpenAt > new Date() 
                                        ? `Opens ${formatDateShort(period.salesOpenAt)}` 
                                        : 'Registration closed'
                                )}
                            </p>
                            {isSalesOpen && !isFull && (
                                <p className="rn-meta text-rn-text-muted text-center">
                                    Deadline: {formatDateShort(period.salesCloseAt)}
                                </p>
                            )}
                            <p className="rn-meta text-rn-text-muted text-center">
                                {isFull ? (
                                    <span className="text-rn-danger">Full</span>
                                ) : (
                                    <span>{availableSpots} spots left</span>
                                )}
                            </p>
                        </div>
                        <Button 
                            asChild 
                            size="lg" 
                            className={`w-full ${!isSalesOpen || isFull ? 'opacity-55 pointer-events-none' : ''}`}
                        >
                            <Link href={`/courses/${periodId}/${track.id}/register`}>
                                {isFull ? 'Join waitlist' : 'Register now'}
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Schedule & Location Section */}
            <div className="mb-rn-6">
                <h2 className="rn-h3 mb-rn-4 flex items-center gap-rn-2">
                    <CalendarDays className="h-5 w-5" />
                    Schedule & Location
                </h2>
                <div className="grid gap-rn-4 sm:grid-cols-2">
                    {/* Schedule info */}
                    <Card>
                        <CardHeader className="pb-rn-2">
                            <CardTitle className="rn-h4 flex items-center gap-rn-2">
                                <CalendarDays className="h-5 w-5 text-rn-primary" />
                                Schedule
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-rn-2">
                            <p className="rn-body">
                                <span className="font-medium">{weekDayLabel}</span> at {track.timeStart} – {track.timeEnd}
                            </p>
                            <p className="rn-meta text-rn-text-muted">
                                {formatDateRange(period.startDate, period.endDate)}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Location info */}
                    <Card>
                        <CardHeader className="pb-rn-2">
                            <CardTitle className="rn-h4 flex items-center gap-rn-2">
                                <MapPin className="h-5 w-5 text-rn-primary" />
                                Location
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-rn-2">
                            {trackWithExtras.locationName ? (
                                <>
                                    <p className="rn-body font-medium">{trackWithExtras.locationName}</p>
                                    {trackWithExtras.locationAddress && (
                                        <p className="rn-meta text-rn-text-muted">{trackWithExtras.locationAddress}</p>
                                    )}
                                    {trackWithExtras.latitude && trackWithExtras.longitude && (
                                        <a 
                                            href={`https://www.openstreetmap.org/?mlat=${trackWithExtras.latitude}&mlon=${trackWithExtras.longitude}#map=17/${trackWithExtras.latitude}/${trackWithExtras.longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="rn-meta text-rn-primary hover:underline inline-block"
                                        >
                                            View on map →
                                        </a>
                                    )}
                                </>
                            ) : (
                                <p className="rn-body">{period.city}</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Breaks info - part of Schedule section */}
                {period.PeriodBreak && (period.PeriodBreak as Array<typeof period.PeriodBreak[number] & { trackId?: string | null }>).filter(b => !b.trackId || b.trackId === track.id).length > 0 && (
                    <Card className="mt-rn-4">
                        <CardHeader className="pb-rn-2">
                            <CardTitle className="rn-h4 flex items-center gap-rn-2">
                                <CalendarOff className="h-5 w-5 text-rn-text-muted" />
                                Breaks in this period
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-rn-1">
                                {(period.PeriodBreak as Array<typeof period.PeriodBreak[number] & { trackId?: string | null }>).filter(b => !b.trackId || b.trackId === track.id).map((breakPeriod) => (
                                    <li key={breakPeriod.id} className="rn-body text-rn-text-muted">
                                        {breakPeriod.description && <span className="font-medium">{breakPeriod.description}: </span>}
                                        {formatDateShort(breakPeriod.startDate)} – {formatDateShort(breakPeriod.endDate)}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Pricing & Discounts Section */}
            <div className="mb-rn-6">
                <div className="flex items-center justify-between mb-rn-4">
                    <h2 className="rn-h3 flex items-center gap-rn-2">
                        <CreditCard className="h-5 w-5" />
                        Pricing & Discounts
                    </h2>
                    {hasMembershipProduct && (
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/org/${organizer.slug}/membership`}>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Browse memberships
                            </Link>
                        </Button>
                    )}
                </div>
                <div className="grid gap-rn-4 sm:grid-cols-2">
                    {/* Price info */}
                    <Card>
                        <CardHeader className="pb-rn-2">
                            <CardTitle className="rn-h4 flex items-center gap-rn-2">
                                <CreditCard className="h-5 w-5 text-rn-primary" />
                                Price
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-rn-2">
                            <p className="rn-body font-medium text-lg">
                                {formatPrice(track.priceSingleCents)}
                            </p>
                            {track.pricePairCents && (
                                <p className="rn-meta text-rn-success">
                                    Couple: {formatPrice(track.pricePairCents)}
                                </p>
                            )}
                            {effectiveMemberPrice && effectiveMemberPrice < track.priceSingleCents && (
                                <p className="rn-meta text-rn-primary">
                                    <Tag className="inline h-3 w-3 mr-rn-1" />
                                    {organizer.name} member: {formatPrice(effectiveMemberPrice)}
                                    {discounts.memberPercent && !track.memberPriceSingleCents && (
                                        <span className="text-rn-text-muted"> ({discounts.memberPercent}% off)</span>
                                    )}
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Capacity info */}
                    <Card>
                        <CardHeader className="pb-rn-2">
                            <CardTitle className="rn-h4 flex items-center gap-rn-2">
                                <Users className="h-5 w-5 text-rn-primary" />
                                Capacity
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-rn-1">
                            <p className="rn-body">
                                {isFull ? (
                                    <span className="text-rn-danger font-medium">Full</span>
                                ) : (
                                    <span><span className="font-medium">{availableSpots}</span> spots available</span>
                                )}
                            </p>
                            <p className="rn-meta text-rn-text-muted">{track.capacityTotal} spots total</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Multi-course Discounts info */}
                {discounts.multiCourseTiers && discounts.multiCourseTiers.length > 0 && (
                    <Card className="mt-rn-4 border-rn-primary/20 bg-rn-primary/5">
                        <CardHeader className="pb-rn-2">
                            <CardTitle className="rn-h4 flex items-center gap-rn-2">
                                <Tag className="h-5 w-5 text-rn-primary" />
                                Multi-course discounts
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-rn-1">
                                {discounts.multiCourseTiers.map((tier, idx) => (
                                    <li key={idx} className="rn-body text-rn-text-muted">
                                        {tier.count}+ courses: {tier.percent 
                                            ? `${tier.percent}% off` 
                                            : tier.cents 
                                                ? `${formatPrice(tier.cents)} off per course`
                                                : ''}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                )}
            </div>
        </main>
    )
}
