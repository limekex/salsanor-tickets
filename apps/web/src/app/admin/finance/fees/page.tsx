import { getFeesReport, getPlatformRevenueReport } from '@/app/actions/admin-finance'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { DateRangeFilter } from '@/components/finance/date-range-filter'
import { Suspense } from 'react'
import { CheckCircle, AlertCircle } from 'lucide-react'

type SearchParams = Promise<{ from?: string; to?: string; preset?: string }>

function formatCurrency(cents: number) {
    return new Intl.NumberFormat('nb-NO', {
        style: 'currency',
        currency: 'NOK',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(cents / 100)
}

function formatPercent(value: number) {
    return `${value.toFixed(2)}%`
}

async function FeesContent({ filter }: { filter: { from?: string; to?: string } }) {
    const [feesData, platformData] = await Promise.all([
        getFeesReport(filter),
        getPlatformRevenueReport(filter)
    ])

    return (
        <div className="space-y-rn-6">
            {/* Platform Revenue - THE IMPORTANT PART */}
            <Card className="border-rn-primary bg-rn-primary/5">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl">Platform Revenue</CardTitle>
                            <CardDescription>Your earnings from Stripe Connect application fees</CardDescription>
                        </div>
                        <div className="text-right">
                            <div className="rn-h1 text-rn-primary">{formatCurrency(platformData.summary.totalPlatformRevenue)}</div>
                            <p className="rn-caption text-rn-text-muted">
                                {formatPercent(platformData.summary.effectiveFeePercent)} of {formatCurrency(platformData.summary.totalGrossTransactions)}
                            </p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Confirmed Revenue</p>
                            <p className="text-lg font-semibold text-rn-success flex items-center gap-1">
                                <CheckCircle className="h-4 w-4" />
                                {formatCurrency(platformData.summary.confirmedPlatformRevenue)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Estimated Revenue</p>
                            <p className="text-lg font-semibold text-rn-warning flex items-center gap-1">
                                <AlertCircle className="h-4 w-4" />
                                {formatCurrency(platformData.summary.estimatedPlatformRevenue)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Transactions</p>
                            <p className="text-lg font-semibold">{platformData.summary.totalTransactions}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Data Quality</p>
                            <p className="text-lg font-semibold">{platformData.summary.dataQuality}% verified</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Fee Flow Summary */}
            <div className="grid gap-rn-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="pb-rn-2">
                        <CardTitle className="rn-meta">Gross Volume</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h2">{formatCurrency(feesData.totals.grossAmount)}</div>
                        <p className="rn-caption text-rn-text-muted">
                            {feesData.totals.transactionCount} transactions
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-rn-2">
                        <CardTitle className="rn-meta">Stripe Processing</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h2 text-rn-danger">-{formatCurrency(feesData.totals.stripeFees)}</div>
                        <p className="rn-caption text-rn-text-muted">
                            ~{formatPercent(feesData.totals.avgStripeFeePercent)}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-rn-2">
                        <CardTitle className="rn-meta">Platform Fee</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h2 text-rn-primary">+{formatCurrency(feesData.totals.platformFees)}</div>
                        <p className="rn-caption text-rn-text-muted">
                            Our revenue ({formatPercent(feesData.totals.platformFeePercent)})
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-rn-2">
                        <CardTitle className="rn-meta">To Organizers</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h2 text-rn-success">{formatCurrency(feesData.totals.netToOrganizers)}</div>
                        <p className="rn-caption text-rn-text-muted">
                            Net payout
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Platform Revenue by Organizer */}
            <Card>
                <CardHeader>
                    <CardTitle>Platform Revenue by Organizer</CardTitle>
                    <CardDescription>Revenue earned from each connected organization</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Organizer</TableHead>
                                <TableHead className="text-right">Transaction Volume</TableHead>
                                <TableHead className="text-right">Platform Revenue</TableHead>
                                <TableHead className="text-right">Effective Rate</TableHead>
                                <TableHead className="text-right">Transactions</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {platformData.byOrganizer.map((org) => (
                                <TableRow key={org.organizerId}>
                                    <TableCell className="font-medium">{org.organizerName}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(org.transactionVolume)}</TableCell>
                                    <TableCell className="text-right font-bold text-rn-primary">{formatCurrency(org.platformRevenue)}</TableCell>
                                    <TableCell className="text-right">{formatPercent(org.effectiveFeePercent)}</TableCell>
                                    <TableCell className="text-right">{org.transactionCount}</TableCell>
                                    <TableCell className="text-center">
                                        {org.confirmedRevenue > 0 ? (
                                            <Badge variant="default" className="bg-rn-success">Verified</Badge>
                                        ) : (
                                            <Badge variant="outline">Estimated</Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {platformData.byOrganizer.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No revenue data for selected period.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Monthly Revenue Trend */}
            {platformData.byMonth.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Monthly Platform Revenue</CardTitle>
                        <CardDescription>Revenue trend over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Month</TableHead>
                                    <TableHead className="text-right">Transaction Volume</TableHead>
                                    <TableHead className="text-right">Platform Revenue</TableHead>
                                    <TableHead className="text-right">Transactions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {platformData.byMonth.slice(0, 12).map((month) => (
                                    <TableRow key={month.month}>
                                        <TableCell className="font-medium">{month.month}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(month.transactionVolume)}</TableCell>
                                        <TableCell className="text-right font-bold text-rn-primary">{formatCurrency(month.platformRevenue)}</TableCell>
                                        <TableCell className="text-right">{month.transactionCount}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Fee Explanation */}
            <Card>
                <CardHeader>
                    <CardTitle>About Fee Calculation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p><strong>Platform Revenue:</strong> Application fees collected through Stripe Connect from connected organizer accounts. This is your actual platform revenue.</p>
                    <p><strong>Confirmed vs Estimated:</strong> &ldquo;Confirmed&rdquo; revenue is verified from Stripe payment data. &ldquo;Estimated&rdquo; is calculated based on organizer fee settings for historical transactions.</p>
                    <p><strong>Stripe Processing:</strong> Estimated at 1.4% + NOK 1.80 per transaction (actual may vary by card type).</p>
                    <p><strong>Data Quality:</strong> Shows the percentage of transactions with verified fee data from Stripe.</p>
                </CardContent>
            </Card>
        </div>
    )
}

export default async function FeesPage({ searchParams }: { searchParams: SearchParams }) {
    const params = await searchParams
    const filter = {
        from: params.from,
        to: params.to
    }

    return (
        <div className="space-y-rn-6">
            {/* Date Filter */}
            <Suspense fallback={<div className="h-10" />}>
                <DateRangeFilter />
            </Suspense>

            <Suspense fallback={<div className="text-center py-8 text-muted-foreground">Loading fee data...</div>}>
                <FeesContent filter={filter} />
            </Suspense>
        </div>
    )
}
