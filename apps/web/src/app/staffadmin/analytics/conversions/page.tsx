import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, MousePointerClick, TrendingUp, ExternalLink } from 'lucide-react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

export default async function ConversionAnalyticsPage({
    searchParams,
}: {
    searchParams: Promise<{ organizerId?: string; days?: string }>
}) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    const { organizerId, days: daysParam } = await searchParams
    const days = Math.min(Math.max(Number(daysParam ?? '30'), 1), 365)

    // Verify user has access
    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: {
            UserAccountRole: {
                where: organizerId
                    ? {
                          OR: [
                              { role: 'ADMIN' },
                              { role: 'ORG_ADMIN', organizerId },
                          ],
                      }
                    : { role: 'ADMIN' },
                include: { Organizer: { select: { id: true, name: true, slug: true } } },
            },
        },
    })

    if (!userAccount?.UserAccountRole.length) {
        redirect('/staffadmin')
    }

    // Determine which organizer to show
    const orgId =
        organizerId ??
        userAccount.UserAccountRole.find((r) => r.organizerId)?.organizerId

    if (!orgId) {
        redirect('/staffadmin')
    }

    const organizer = await prisma.organizer.findUnique({
        where: { id: orgId },
        select: {
            id: true,
            name: true,
            slug: true,
            googleAnalyticsId: true,
            facebookPixelId: true,
            googleAdsConversionId: true,
        },
    })

    if (!organizer) {
        redirect('/staffadmin')
    }

    const since = new Date()
    since.setDate(since.getDate() - days)

    const events = await prisma.conversionEvent.findMany({
        where: { organizerId: orgId, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 200,
    })

    const clicks = events.filter((e) => e.eventType === 'OUTBOUND_CLICK')
    const conversions = events.filter((e) => e.eventType === 'CONVERSION')

    const convertedSessions = new Set(
        conversions.map((c) => c.sessionId).filter(Boolean)
    )
    const correlatedCount = clicks.filter(
        (c) => c.sessionId && convertedSessions.has(c.sessionId)
    ).length

    const conversionRate =
        clicks.length > 0
            ? Math.round((correlatedCount / clicks.length) * 10000) / 100
            : 0

    // UTM source breakdown
    const utmBreakdown: Record<string, number> = {}
    for (const click of clicks) {
        const key = click.utmSource ?? '(direct)'
        utmBreakdown[key] = (utmBreakdown[key] ?? 0) + 1
    }

    const trackingConfigured =
        organizer.googleAnalyticsId ||
        organizer.facebookPixelId ||
        organizer.googleAdsConversionId

    return (
        <div className="space-y-rn-6">
            <div className="flex items-center gap-rn-4">
                <Button asChild variant="ghost" size="sm">
                    <Link href="/staffadmin/settings">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Settings
                    </Link>
                </Button>
                <div className="flex-1">
                    <h2 className="rn-h2">Conversion Analytics</h2>
                    <p className="rn-meta text-rn-text-muted">
                        {organizer.name} — last {days} days
                    </p>
                </div>
                <div className="flex gap-2">
                    {[7, 30, 90].map((d) => (
                        <Button
                            key={d}
                            asChild
                            variant={days === d ? 'default' : 'outline'}
                            size="sm"
                        >
                            <Link href={`?organizerId=${orgId}&days=${d}`}>{d}d</Link>
                        </Button>
                    ))}
                </div>
            </div>

            {!trackingConfigured && (
                <Card className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950">
                    <CardContent className="pt-6">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            No tracking IDs configured yet. Go to{' '}
                            <Link
                                href="/staffadmin/settings"
                                className="underline font-medium"
                            >
                                Organization Settings
                            </Link>{' '}
                            → <strong>Conversion Tracking</strong> to add your Google Analytics,
                            Facebook Pixel, or Google Ads IDs.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* KPI cards */}
            <div className="grid gap-rn-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-rn-2">
                        <CardTitle className="rn-meta text-rn-text-muted flex items-center gap-2">
                            <MousePointerClick className="h-4 w-4" />
                            Outbound Clicks
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h1">{clicks.length}</div>
                        <p className="rn-caption text-rn-text-muted mt-1">
                            Sign-up button clicks tracked
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-rn-2">
                        <CardTitle className="rn-meta text-rn-text-muted flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Conversions
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h1">{conversions.length}</div>
                        <p className="rn-caption text-rn-text-muted mt-1">
                            Confirmed via webhook ({correlatedCount} correlated)
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-rn-2">
                        <CardTitle className="rn-meta text-rn-text-muted">
                            Conversion Rate
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h1">{conversionRate}%</div>
                        <p className="rn-caption text-rn-text-muted mt-1">
                            Correlated conversions / clicks
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* UTM breakdown */}
            {Object.keys(utmBreakdown).length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Traffic Sources (UTM)</CardTitle>
                        <CardDescription>Outbound clicks by utm_source</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Source</TableHead>
                                    <TableHead className="text-right">Clicks</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {Object.entries(utmBreakdown)
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([source, count]) => (
                                        <TableRow key={source}>
                                            <TableCell>{source}</TableCell>
                                            <TableCell className="text-right">{count}</TableCell>
                                        </TableRow>
                                    ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Recent events */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Events</CardTitle>
                    <CardDescription>Latest 200 tracking events</CardDescription>
                </CardHeader>
                <CardContent>
                    {events.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                            No events recorded in the last {days} days. Use the outbound
                            tracking link on your landing page to start collecting data.
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Source</TableHead>
                                    <TableHead>Campaign</TableHead>
                                    <TableHead>Destination</TableHead>
                                    <TableHead>Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {events.map((event) => (
                                    <TableRow key={event.id}>
                                        <TableCell>
                                            {event.eventType === 'OUTBOUND_CLICK' ? (
                                                <Badge variant="outline">Click</Badge>
                                            ) : (
                                                <Badge variant="success">Conversion</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {event.utmSource ?? '—'}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {event.utmCampaign ?? '—'}
                                        </TableCell>
                                        <TableCell className="text-sm max-w-xs truncate">
                                            {event.externalUrl ? (
                                                <span className="flex items-center gap-1">
                                                    <ExternalLink className="h-3 w-3 shrink-0" />
                                                    <span className="truncate">{event.externalUrl}</span>
                                                </span>
                                            ) : (
                                                '—'
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                            {event.createdAt.toLocaleString('nb-NO', {
                                                dateStyle: 'short',
                                                timeStyle: 'short',
                                            })}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Setup guide */}
            <Card>
                <CardHeader>
                    <CardTitle>How to Set Up Cross-Domain Tracking</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                        <li>
                            <strong className="text-foreground">Replace sign-up links</strong>{' '}
                            on your landing page (salsanor.no) with the RegiNor tracking URL:
                            <pre className="mt-1 bg-muted p-2 rounded text-xs overflow-x-auto">
                                {`/api/track/outbound?url=https://www.letsreg.com/…&organizerId=${orgId}&utm_source=google&utm_medium=cpc&utm_campaign=salsa-spring`}
                            </pre>
                        </li>
                        <li>
                            <strong className="text-foreground">Forward the session ID</strong>{' '}
                            – the redirect appends <code>_rn_session=&lt;uuid&gt;</code> to
                            the destination URL. Configure letsreg (or your ticketing
                            platform) to echo this parameter back when a booking completes.
                        </li>
                        <li>
                            <strong className="text-foreground">Send a conversion webhook</strong>{' '}
                            from your ticketing platform to:
                            <pre className="mt-1 bg-muted p-2 rounded text-xs overflow-x-auto">
                                {`POST https://app.reginor.no/api/track/conversion\nContent-Type: application/json\nX-RegiNor-Signature: sha256=<hmac>\n\n{"organizerId":"${orgId}","sessionId":"<_rn_session value>","value":599,"currency":"NOK"}`}
                            </pre>
                        </li>
                        <li>
                            <strong className="text-foreground">Add your tracking IDs</strong>{' '}
                            in Organization Settings → Conversion Tracking so the platform
                            can fire GA4 / Meta Pixel / Google Ads events on your behalf.
                        </li>
                    </ol>
                </CardContent>
            </Card>
        </div>
    )
}
