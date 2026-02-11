import { requireOrgFinance } from '@/utils/auth-org-finance'
import { getOrgRevenueWithMVA, getOrgRevenueByPeriod } from '@/app/actions/staffadmin-finance'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ArrowLeftIcon } from 'lucide-react'
import Link from 'next/link'
import { formatNOK } from '@/lib/tickets/legal-requirements'

export default async function RevenueReportsPage() {
    const userAccount = await requireOrgFinance()
    
    // Get first organization with finance access
    const firstOrgRole = userAccount.UserAccountRole[0]
    if (!firstOrgRole?.organizerId) {
        throw new Error('No organization access found')
    }
    
    const organizerId = firstOrgRole.organizerId
    
    const revenueWithMVA = await getOrgRevenueWithMVA(organizerId)
    const revenueByPeriod = await getOrgRevenueByPeriod(organizerId)

    // Calculate totals
    const totals = revenueWithMVA.reduce((acc, period: any) => ({
        grossRevenue: acc.grossRevenue + period.grossRevenue,
        netRevenue: acc.netRevenue + period.netRevenue,
        mvaAmount: acc.mvaAmount + period.mvaAmount,
        orderCount: acc.orderCount + period.orderCount
    }), { grossRevenue: 0, netRevenue: 0, mvaAmount: 0, orderCount: 0 })

    return (
        <div className="space-y-rn-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-rn-4">
                    <Button asChild variant="ghost" size="sm">
                        <Link href="/staffadmin/finance">
                            <ArrowLeftIcon className="mr-2 h-4 w-4" />
                            Back to Finance
                        </Link>
                    </Button>
                    <h2 className="rn-h2">Revenue Reports</h2>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-rn-4 md:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle className="rn-meta">Total Gross Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h2">{formatNOK(totals.grossRevenue)}</div>
                        <p className="rn-caption text-rn-text-muted mt-rn-1">Including MVA</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="rn-meta">Total Net Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h2">{formatNOK(totals.netRevenue)}</div>
                        <p className="rn-caption text-rn-text-muted mt-rn-1">Excluding MVA</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="rn-meta">Total MVA</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h2">{formatNOK(totals.mvaAmount)}</div>
                        <p className="rn-caption text-rn-text-muted mt-rn-1">VAT Amount</p>
                    </CardContent>
                </Card>
            </div>

            {/* MVA Breakdown Table - MANDATORY for Norwegian Legal Compliance */}
            <Card>
                <CardHeader>
                    <CardTitle>Revenue by Product - MVA Breakdown</CardTitle>
                    <p className="text-sm text-rn-text-muted mt-rn-2">
                        Norwegian VAT (MVA) breakdown as required by Bokføringsloven
                    </p>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead className="text-right">Orders</TableHead>
                                <TableHead className="text-right">Gross Revenue<br/>(inkl. MVA)</TableHead>
                                <TableHead className="text-right">Net Revenue<br/>(grunnlag for MVA)</TableHead>
                                <TableHead className="text-right">MVA Rate</TableHead>
                                <TableHead className="text-right">MVA Amount<br/>(MVA-beløp)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {revenueWithMVA.map((period: any) => (
                                <TableRow key={period.periodCode}>
                                    <TableCell>
                                        <div className="font-medium">{period.periodName}</div>
                                        <div className="rn-caption text-rn-text-muted">{period.periodCode}</div>
                                    </TableCell>
                                    <TableCell className="text-right">{period.orderCount}</TableCell>
                                    <TableCell className="text-right font-medium">{formatNOK(period.grossRevenue)}</TableCell>
                                    <TableCell className="text-right">{formatNOK(period.netRevenue)}</TableCell>
                                    <TableCell className="text-right">{period.mvaRate}%</TableCell>
                                    <TableCell className="text-right font-medium">{formatNOK(period.mvaAmount)}</TableCell>
                                </TableRow>
                            ))}
                            <TableRow className="font-bold border-t-2">
                                <TableCell>Total</TableCell>
                                <TableCell className="text-right">{totals.orderCount}</TableCell>
                                <TableCell className="text-right">{formatNOK(totals.grossRevenue)}</TableCell>
                                <TableCell className="text-right">{formatNOK(totals.netRevenue)}</TableCell>
                                <TableCell className="text-right">—</TableCell>
                                <TableCell className="text-right">{formatNOK(totals.mvaAmount)}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Revenue by Product (Simple View) */}
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
                                <TableHead className="text-right">Total Revenue</TableHead>
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
        </div>
    )
}
