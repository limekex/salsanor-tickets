import { getFilteredFinancialOverview } from '@/app/actions/admin-finance'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
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

async function OverviewContent({ filter }: { filter: { from?: string; to?: string } }) {
    const data = await getFilteredFinancialOverview(filter)

    return (
        <div className="space-y-rn-6">
            {/* Overview Cards */}
            <div className="grid gap-rn-4 md:grid-cols-2 lg:grid-cols-5">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-rn-2">
                        <CardTitle className="rn-meta">Total Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h1">
                            {formatCurrency(data.overview.totalRevenue)}
                        </div>
                        <p className="rn-caption text-rn-text-muted">
                            From {data.overview.totalOrders} paid orders
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-rn-2">
                        <CardTitle className="rn-meta">Total Registrations</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h1">
                            {data.overview.totalRegistrations}
                        </div>
                        <p className="rn-caption text-rn-text-muted">
                            Active course registrations
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-rn-2">
                        <CardTitle className="rn-meta">Average Order Value</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(data.overview.averageOrderValue)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Per order
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Discounts Given</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-rn-warning">
                            {formatCurrency(data.overview.totalDiscounts)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Total discounts
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">VAT</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-rn-primary">
                            {formatCurrency(data.overview.totalMva)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Output VAT collected
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Revenue by Organization */}
            <Card>
                <CardHeader>
                    <CardTitle>Revenue by Organization</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Organization</TableHead>
                                <TableHead className="text-right">Orders</TableHead>
                                <TableHead className="text-right">Registrations</TableHead>
                                <TableHead className="text-right">Total Revenue</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.revenueByOrganization.map((org: any) => (
                                <TableRow key={org.organizerId}>
                                    <TableCell className="font-medium">{org.organizerName}</TableCell>
                                    <TableCell className="text-right">{org.orderCount}</TableCell>
                                    <TableCell className="text-right">{org.registrationCount}</TableCell>
                                    <TableCell className="text-right font-bold">
                                        {formatCurrency(org.totalRevenue)}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {data.revenueByOrganization.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                        No revenue data available yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Revenue by Period */}
            <Card>
                <CardHeader>
                    <CardTitle>Revenue by Period</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Period</TableHead>
                                <TableHead>Code</TableHead>
                                <TableHead>Organization</TableHead>
                                <TableHead className="text-right">Orders</TableHead>
                                <TableHead className="text-right">Registrations</TableHead>
                                <TableHead className="text-right">Total Revenue</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.revenueByPeriod.map((period: any) => (
                                <TableRow key={period.periodId}>
                                    <TableCell className="font-medium">{period.periodName}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {period.periodCode}
                                    </TableCell>
                                    <TableCell className="text-sm">{period.organizerName}</TableCell>
                                    <TableCell className="text-right">{period.orderCount}</TableCell>
                                    <TableCell className="text-right">{period.registrationCount}</TableCell>
                                    <TableCell className="text-right font-bold">
                                        {formatCurrency(period.totalRevenue)}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {data.revenueByPeriod.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No revenue data available yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Payment Provider Statistics */}
            <Card>
                <CardHeader>
                    <CardTitle>Payment Provider Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Provider</TableHead>
                                <TableHead className="text-right">Transactions</TableHead>
                                <TableHead className="text-right">Total Amount</TableHead>
                                <TableHead className="text-right">Average Transaction</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.paymentProviders.map((provider: any) => (
                                <TableRow key={provider.provider}>
                                    <TableCell>
                                        <Badge variant="outline">{provider.provider}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">{provider.transactionCount}</TableCell>
                                    <TableCell className="text-right font-bold">
                                        {formatCurrency(provider.totalAmount)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {formatCurrency(provider.totalAmount / provider.transactionCount)}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {data.paymentProviders.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                        No payment data available yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Discount Statistics */}
            <Card>
                <CardHeader>
                    <CardTitle>Discount Usage</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Discounts</p>
                                <p className="text-2xl font-bold text-rn-warning">
                                    {formatCurrency(data.overview.totalDiscounts)}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Orders</p>
                                <p className="text-2xl font-bold">{data.overview.totalOrders}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Average Order Value</p>
                                <p className="text-2xl font-bold">
                                    {formatCurrency(data.overview.averageOrderValue)}
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default async function FinancePage({ searchParams }: { searchParams: SearchParams }) {
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

            <Suspense fallback={<div className="text-center py-8 text-muted-foreground">Loading financial data...</div>}>
                <OverviewContent filter={filter} />
            </Suspense>
        </div>
    )
}
