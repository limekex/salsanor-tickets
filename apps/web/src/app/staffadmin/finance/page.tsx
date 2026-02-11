import { getSelectedOrganizerForFinance } from '@/utils/auth-org-finance'
import { getOrgFinancialSummary, getOrgRevenueByPeriod, getOrgPaidRegistrations } from '@/app/actions/staffadmin-finance'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DownloadIcon } from 'lucide-react'
import Link from 'next/link'
import { formatNOK } from '@/lib/tickets/legal-requirements'
import { formatDateNumeric } from '@/lib/formatters'

export default async function StaffFinancePage() {
    // Get selected organization (from cookie or first available)
    const organizerId = await getSelectedOrganizerForFinance()
    
    const summary = await getOrgFinancialSummary(organizerId)
    const revenueByPeriod = await getOrgRevenueByPeriod(organizerId)
    const recentOrders = await getOrgPaidRegistrations(organizerId, 10)

    return (
        <div className="space-y-rn-6">
            <div className="flex items-center justify-between">
                <h2 className="rn-h2">Finance Dashboard</h2>
                <div className="flex gap-rn-2">
                    <Button asChild variant="outline" size="sm">
                        <Link href="/staffadmin/finance/export">
                            <DownloadIcon className="mr-2 h-4 w-4" />
                            Export Data
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid gap-rn-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle className="rn-meta">Total Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h2">{formatNOK(summary.totalRevenue)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="rn-meta">Total Orders</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h2">{summary.totalOrders}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="rn-meta">Registrations</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h2">{summary.totalRegistrations}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="rn-meta">Avg Order Value</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h2">{formatNOK(Math.round(summary.avgOrderValue))}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="rn-meta">Pending Payments</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h2">{summary.pendingOrders}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="rn-meta">Discounts Given</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h2">{formatNOK(summary.totalDiscounts)}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Revenue by Product */}
            <Card>
                <CardHeader>
                    <CardTitle>Revenue by Product</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead className="text-right">Orders</TableHead>
                                <TableHead className="text-right">Registrations</TableHead>
                                <TableHead className="text-right">Revenue</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {revenueByPeriod.map((period: any) => (
                                <TableRow key={period.periodCode}>
                                    <TableCell>
                                        <div className="font-medium">{period.periodName}</div>
                                        <div className="rn-caption text-rn-text-muted">{period.periodCode}</div>
                                    </TableCell>
                                    <TableCell className="text-right">{period.orderCount}</TableCell>
                                    <TableCell className="text-right">{period.registrationCount}</TableCell>
                                    <TableCell className="text-right font-medium">{formatNOK(period.totalRevenue)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Recent Orders */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Orders (Last 10)</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order ID</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Product</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recentOrders.map((order) => {
                                let productName = ''
                                if (order.orderType === 'COURSE_PERIOD' && order.CoursePeriod) {
                                    productName = order.CoursePeriod.name
                                } else if (order.orderType === 'EVENT' && order.EventRegistration && order.EventRegistration.length > 0) {
                                    productName = order.EventRegistration[0]?.Event?.title || 'Event'
                                } else if (order.orderType === 'MEMBERSHIP' && order.Membership && order.Membership.length > 0) {
                                    productName = `Membership: ${order.Membership[0]?.MembershipTier?.name || 'Unknown'}`
                                } else {
                                    productName = 'Other'
                                }
                                
                                return (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-mono text-sm">{order.id.slice(0, 8)}</TableCell>
                                        <TableCell>{formatDateNumeric(order.createdAt)}</TableCell>
                                        <TableCell>{productName}</TableCell>
                                        <TableCell className="text-right font-medium">{formatNOK(order.totalCents)}</TableCell>
                                        <TableCell>
                                            <Badge variant="default">Paid</Badge>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
