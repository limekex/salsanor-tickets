import { getKasseoppgjor } from '@/app/actions/admin-finance'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DateRangeFilter } from '@/components/finance/date-range-filter'
import { Suspense } from 'react'

type SearchParams = Promise<{ from?: string; to?: string; preset?: string }>

function formatCurrency(cents: number) {
    return new Intl.NumberFormat('nb-NO', {
        style: 'currency',
        currency: 'NOK',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(cents / 100)
}

async function KasseoppgjorContent({ filter }: { filter: { from?: string; to?: string } }) {
    const data = await getKasseoppgjor(filter)

    return (
        <div className="space-y-rn-6">
            {/* Grand Totals */}
            <div className="grid gap-rn-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                <Card>
                    <CardHeader className="pb-rn-2">
                        <CardTitle className="rn-meta">Count</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h2">{data.grandTotals.totalItems}</div>
                        <p className="rn-caption text-rn-text-muted">Registrations + tickets</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-rn-2">
                        <CardTitle className="rn-meta">Gross</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h2">{formatCurrency(data.grandTotals.grossRevenue)}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-rn-2">
                        <CardTitle className="rn-meta">Discounts</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h2 text-rn-warning">{formatCurrency(data.grandTotals.discounts)}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-rn-2">
                        <CardTitle className="rn-meta">Net</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h2">{formatCurrency(data.grandTotals.netRevenue)}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-rn-2">
                        <CardTitle className="rn-meta">VAT</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h2 text-rn-primary">{formatCurrency(data.grandTotals.mva)}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-rn-2">
                        <CardTitle className="rn-meta">Refunds</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h2 text-rn-danger">{formatCurrency(data.grandTotals.refunds)}</div>
                    </CardContent>
                </Card>

                <Card className="bg-rn-surface-2">
                    <CardHeader className="pb-rn-2">
                        <CardTitle className="rn-meta">Final Total</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h2 text-rn-success font-bold">{formatCurrency(data.grandTotals.finalAmount)}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Cash Reconciliation per Course (Track) */}
            <Card>
                <CardHeader>
                    <CardTitle>Cash Reconciliation - Courses</CardTitle>
                    <CardDescription>Detailed overview per course track</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Course</TableHead>
                                <TableHead>Period</TableHead>
                                <TableHead>Organizer</TableHead>
                                <TableHead className="text-right">Qty</TableHead>
                                <TableHead className="text-right">Gross</TableHead>
                                <TableHead className="text-right">Discount</TableHead>
                                <TableHead className="text-right">Net</TableHead>
                                <TableHead className="text-right">VAT</TableHead>
                                <TableHead className="text-right">Refund</TableHead>
                                <TableHead className="text-right font-bold">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.byTrack.map((track) => (
                                <TableRow key={track.trackId}>
                                    <TableCell className="font-medium">{track.trackTitle}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{track.periodName}</TableCell>
                                    <TableCell className="text-sm">{track.organizerName}</TableCell>
                                    <TableCell className="text-right">{track.registrationCount}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(track.grossRevenue)}</TableCell>
                                    <TableCell className="text-right text-rn-warning">{formatCurrency(track.discounts)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(track.netRevenue)}</TableCell>
                                    <TableCell className="text-right text-rn-primary">{formatCurrency(track.mva)}</TableCell>
                                    <TableCell className="text-right text-rn-danger">{formatCurrency(track.refunds)}</TableCell>
                                    <TableCell className="text-right font-bold text-rn-success">{formatCurrency(track.finalAmount)}</TableCell>
                                </TableRow>
                            ))}
                            {data.byTrack.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                                        No course data for selected period.
                                    </TableCell>
                                </TableRow>
                            )}
                            {data.byTrack.length > 0 && (
                                <TableRow className="bg-rn-surface-2 font-bold">
                                    <TableCell colSpan={3}>Course Total</TableCell>
                                    <TableCell className="text-right">{data.trackTotals.registrationCount}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(data.trackTotals.grossRevenue)}</TableCell>
                                    <TableCell className="text-right text-rn-warning">{formatCurrency(data.trackTotals.discounts)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(data.trackTotals.netRevenue)}</TableCell>
                                    <TableCell className="text-right text-rn-primary">{formatCurrency(data.trackTotals.mva)}</TableCell>
                                    <TableCell className="text-right text-rn-danger">{formatCurrency(data.trackTotals.refunds)}</TableCell>
                                    <TableCell className="text-right text-rn-success">{formatCurrency(data.trackTotals.finalAmount)}</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Cash Reconciliation per Event */}
            <Card>
                <CardHeader>
                    <CardTitle>Cash Reconciliation - Events</CardTitle>
                    <CardDescription>Detailed overview per event</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Event</TableHead>
                                <TableHead>Organizer</TableHead>
                                <TableHead className="text-right">Tickets</TableHead>
                                <TableHead className="text-right">Gross</TableHead>
                                <TableHead className="text-right">Discount</TableHead>
                                <TableHead className="text-right">Net</TableHead>
                                <TableHead className="text-right">VAT</TableHead>
                                <TableHead className="text-right">Refund</TableHead>
                                <TableHead className="text-right font-bold">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.byEvent.map((event) => (
                                <TableRow key={event.eventId}>
                                    <TableCell className="font-medium">{event.eventTitle}</TableCell>
                                    <TableCell className="text-sm">{event.organizerName}</TableCell>
                                    <TableCell className="text-right">{event.ticketCount}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(event.grossRevenue)}</TableCell>
                                    <TableCell className="text-right text-rn-warning">{formatCurrency(event.discounts)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(event.netRevenue)}</TableCell>
                                    <TableCell className="text-right text-rn-primary">{formatCurrency(event.mva)}</TableCell>
                                    <TableCell className="text-right text-rn-danger">{formatCurrency(event.refunds)}</TableCell>
                                    <TableCell className="text-right font-bold text-rn-success">{formatCurrency(event.finalAmount)}</TableCell>
                                </TableRow>
                            ))}
                            {data.byEvent.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                        No event data for selected period.
                                    </TableCell>
                                </TableRow>
                            )}
                            {data.byEvent.length > 0 && (
                                <TableRow className="bg-rn-surface-2 font-bold">
                                    <TableCell colSpan={2}>Event Total</TableCell>
                                    <TableCell className="text-right">{data.eventTotals.ticketCount}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(data.eventTotals.grossRevenue)}</TableCell>
                                    <TableCell className="text-right text-rn-warning">{formatCurrency(data.eventTotals.discounts)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(data.eventTotals.netRevenue)}</TableCell>
                                    <TableCell className="text-right text-rn-primary">{formatCurrency(data.eventTotals.mva)}</TableCell>
                                    <TableCell className="text-right text-rn-danger">{formatCurrency(data.eventTotals.refunds)}</TableCell>
                                    <TableCell className="text-right text-rn-success">{formatCurrency(data.eventTotals.finalAmount)}</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Summary Card */}
            <Card className="bg-rn-primary/5 border-rn-primary">
                <CardHeader>
                    <CardTitle>Cash Reconciliation Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span>Courses (gross):</span>
                                <span className="font-medium">{formatCurrency(data.trackTotals.grossRevenue)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Events (gross):</span>
                                <span className="font-medium">{formatCurrency(data.eventTotals.grossRevenue)}</span>
                            </div>
                            <div className="flex justify-between border-t pt-2">
                                <span className="font-bold">Total gross:</span>
                                <span className="font-bold">{formatCurrency(data.grandTotals.grossRevenue)}</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-rn-warning">
                                <span>- Discounts:</span>
                                <span>{formatCurrency(data.grandTotals.discounts)}</span>
                            </div>
                            <div className="flex justify-between text-rn-danger">
                                <span>- Refunds:</span>
                                <span>{formatCurrency(data.grandTotals.refunds)}</span>
                            </div>
                            <div className="flex justify-between border-t pt-2 text-rn-success">
                                <span className="font-bold text-lg">= Net payout:</span>
                                <span className="font-bold text-lg">{formatCurrency(data.grandTotals.finalAmount)}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default async function KasseoppgjorPage({ searchParams }: { searchParams: SearchParams }) {
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

            <Suspense fallback={<div className="text-center py-8 text-muted-foreground">Loading cash reconciliation...</div>}>
                <KasseoppgjorContent filter={filter} />
            </Suspense>
        </div>
    )
}
