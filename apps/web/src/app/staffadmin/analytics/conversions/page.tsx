import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, ShoppingCart } from 'lucide-react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

function formatNOK(cents: number) {
    return `${(cents / 100).toLocaleString('nb-NO', { minimumFractionDigits: 0 })} NOK`
}

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

    // Fetch paid orders with UTM data
    const orders = await prisma.order.findMany({
        where: {
            organizerId: orgId,
            status: 'PAID',
            createdAt: { gte: since },
        },
        select: {
            id: true,
            orderNumber: true,
            totalCents: true,
            currency: true,
            utmSource: true,
            utmMedium: true,
            utmCampaign: true,
            utmContent: true,
            utmTerm: true,
            utmReferrer: true,
            createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
    })

    const totalRevenue = orders.reduce((sum, o) => sum + o.totalCents, 0)
    const ordersWithUtm = orders.filter((o) => o.utmSource)

    // Aggregate by UTM source
    const sourceBreakdown: Record<string, { count: number; revenueCents: number }> = {}
    for (const order of orders) {
        const key = order.utmSource ?? '(direct / unknown)'
        if (!sourceBreakdown[key]) sourceBreakdown[key] = { count: 0, revenueCents: 0 }
        sourceBreakdown[key].count++
        sourceBreakdown[key].revenueCents += order.totalCents
    }

    // Aggregate by campaign
    const campaignBreakdown: Record<string, { count: number; revenueCents: number }> = {}
    for (const order of orders.filter((o) => o.utmCampaign)) {
        const key = order.utmCampaign!
        if (!campaignBreakdown[key]) campaignBreakdown[key] = { count: 0, revenueCents: 0 }
        campaignBreakdown[key].count++
        campaignBreakdown[key].revenueCents += order.totalCents
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
                            Facebook Pixel, or Google Ads IDs. These are needed so RegiNor can fire
                            the conversion events when buyers complete their purchase.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* KPI cards */}
            <div className="grid gap-rn-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-rn-2">
                        <CardTitle className="rn-meta text-rn-text-muted flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4" />
                            Paid Orders
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h1">{orders.length}</div>
                        <p className="rn-caption text-rn-text-muted mt-1">
                            {formatNOK(totalRevenue)} total
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-rn-2">
                        <CardTitle className="rn-meta text-rn-text-muted flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Orders with UTM
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h1">{ordersWithUtm.length}</div>
                        <p className="rn-caption text-rn-text-muted mt-1">
                            {orders.length > 0
                                ? `${Math.round((ordersWithUtm.length / orders.length) * 100)}% attributed`
                                : 'no orders yet'}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-rn-2">
                        <CardTitle className="rn-meta text-rn-text-muted">
                            Attributed Revenue
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h1">
                            {formatNOK(ordersWithUtm.reduce((s, o) => s + o.totalCents, 0))}
                        </div>
                        <p className="rn-caption text-rn-text-muted mt-1">from tracked sources</p>
                    </CardContent>
                </Card>
            </div>

            {/* Source breakdown */}
            {Object.keys(sourceBreakdown).length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Orders by Traffic Source (utm_source)</CardTitle>
                        <CardDescription>Paid orders grouped by the utm_source captured on arrival</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Source</TableHead>
                                    <TableHead className="text-right">Orders</TableHead>
                                    <TableHead className="text-right">Revenue</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {Object.entries(sourceBreakdown)
                                    .sort((a, b) => b[1].revenueCents - a[1].revenueCents)
                                    .map(([source, data]) => (
                                        <TableRow key={source}>
                                            <TableCell>{source}</TableCell>
                                            <TableCell className="text-right">{data.count}</TableCell>
                                            <TableCell className="text-right">
                                                {formatNOK(data.revenueCents)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Campaign breakdown */}
            {Object.keys(campaignBreakdown).length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Orders by Campaign (utm_campaign)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Campaign</TableHead>
                                    <TableHead className="text-right">Orders</TableHead>
                                    <TableHead className="text-right">Revenue</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {Object.entries(campaignBreakdown)
                                    .sort((a, b) => b[1].revenueCents - a[1].revenueCents)
                                    .map(([campaign, data]) => (
                                        <TableRow key={campaign}>
                                            <TableCell>{campaign}</TableCell>
                                            <TableCell className="text-right">{data.count}</TableCell>
                                            <TableCell className="text-right">
                                                {formatNOK(data.revenueCents)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Recent orders */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Paid Orders</CardTitle>
                    <CardDescription>Latest orders with UTM attribution data</CardDescription>
                </CardHeader>
                <CardContent>
                    {orders.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                            No paid orders in the last {days} days.
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Order</TableHead>
                                    <TableHead>Source</TableHead>
                                    <TableHead>Medium</TableHead>
                                    <TableHead>Campaign</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead>Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders.slice(0, 50).map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-mono text-xs">
                                            {order.orderNumber ?? order.id.slice(0, 8)}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {order.utmSource ? (
                                                <Badge variant="outline">{order.utmSource}</Badge>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {order.utmMedium ?? '—'}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {order.utmCampaign ?? '—'}
                                        </TableCell>
                                        <TableCell className="text-right text-sm">
                                            {formatNOK(order.totalCents)}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                            {order.createdAt.toLocaleDateString('nb-NO')}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* How it works */}
            <Card>
                <CardHeader>
                    <CardTitle>How Conversion Tracking Works</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <p>
                        The full funnel is:{' '}
                        <strong className="text-foreground">Ad platform</strong> (Google / Meta){' '}
                        →{' '}
                        <strong className="text-foreground">Your website</strong>{' '}
                        →{' '}
                        <strong className="text-foreground">RegiNor registration page</strong>{' '}
                        →{' '}
                        <strong className="text-foreground">Payment = Conversion</strong>
                    </p>
                    <ol className="list-decimal list-inside space-y-2">
                        <li>
                            Create an ad on Google or Meta that points to a page on{' '}
                            <strong className="text-foreground">your own website</strong> with UTM
                            parameters (e.g.{' '}
                            <code className="bg-muted px-1 rounded text-xs">
                                https://salsanor.no/courses?utm_source=google&amp;utm_medium=cpc&amp;utm_campaign=salsa-spring
                            </code>
                            ).
                        </li>
                        <li>
                            On your website, the "Register" link should forward the UTM parameters
                            to RegiNor (e.g.{' '}
                            <code className="bg-muted px-1 rounded text-xs">
                                https://reginor.no/org/{organizer.slug}/courses?utm_source=google&amp;utm_medium=cpc&amp;utm_campaign=salsa-spring
                            </code>
                            ). You can do this with a simple JavaScript snippet or by keeping the
                            UTM params in your static links.
                        </li>
                        <li>
                            When the buyer lands on RegiNor with UTM parameters, they are
                            automatically stored in a browser cookie.
                        </li>
                        <li>
                            When the buyer completes checkout, the UTM data is saved on the Order
                            (visible in this report) and conversion events are fired to the
                            tracking platforms you configured above.
                        </li>
                    </ol>
                </CardContent>
            </Card>
        </div>
    )
}
