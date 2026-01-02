import { getFinancialOverview } from '@/app/actions/finance'
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
import { Button } from '@/components/ui/button'
import { DownloadIcon } from 'lucide-react'
import Link from 'next/link'

function formatCurrency(cents: number) {
    return new Intl.NumberFormat('nb-NO', {
        style: 'currency',
        currency: 'NOK',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(cents / 100)
}

export default async function FinancePage() {
    const data = await getFinancialOverview()

    return (
        <div className="space-y-rn-6">
            <div className="flex items-center justify-between">
                <h2 className="rn-h2">Financial Reports</h2>
                <div className="flex gap-rn-2">
                    <Button asChild variant="outline" size="sm">
                        <Link href="/api/admin/export/finance?format=csv">
                            <DownloadIcon className="mr-2 h-4 w-4" />
                            Export CSV
                        </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                        <Link href="/api/admin/export/finance?format=json">
                            <DownloadIcon className="mr-2 h-4 w-4" />
                            Export JSON
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid gap-rn-4 md:grid-cols-2 lg:grid-cols-4">
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
                        <div className="text-2xl font-bold">
                            {formatCurrency(data.overview.totalDiscountsGiven)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            In {data.discounts.orderCount} orders
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
                                <p className="text-2xl font-bold">
                                    {formatCurrency(data.discounts.totalGiven)}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Orders with Discount</p>
                                <p className="text-2xl font-bold">{data.discounts.orderCount}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Average Discount</p>
                                <p className="text-2xl font-bold">
                                    {formatCurrency(data.discounts.averageDiscount)}
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
