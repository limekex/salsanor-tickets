import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { 
    FileSpreadsheet, 
    FileJson, 
    Calendar, 
    Building2, 
    Receipt, 
    Calculator,
    TrendingUp
} from 'lucide-react'

export default function ReportsPage() {
    return (
        <div className="space-y-rn-6">
            <div>
                <h2 className="rn-h2">Reports</h2>
                <p className="rn-meta text-rn-text-muted">
                    Download detailed reports and export data
                </p>
            </div>

            {/* Available Reports */}
            <div className="grid gap-rn-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Financial Export */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-rn-primary/10">
                                <FileSpreadsheet className="h-5 w-5 text-rn-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-base">Financial Report</CardTitle>
                                <CardDescription>Complete order history</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="rn-meta text-rn-text-muted">
                            Export all paid orders with details on VAT, discounts, and payment method.
                        </p>
                        <div className="flex gap-2">
                            <Button asChild variant="outline" size="sm" className="flex-1">
                                <Link href="/api/admin/export/finance?format=csv">
                                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                                    CSV
                                </Link>
                            </Button>
                            <Button asChild variant="outline" size="sm" className="flex-1">
                                <Link href="/api/admin/export/finance?format=json">
                                    <FileJson className="h-4 w-4 mr-2" />
                                    JSON
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Cash Reconciliation Report */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-rn-success/10">
                                <Calculator className="h-5 w-5 text-rn-success" />
                            </div>
                            <div>
                                <CardTitle className="text-base">Cash Reconciliation</CardTitle>
                                <CardDescription>Detailed settlement</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="rn-meta text-rn-text-muted">
                            View cash reconciliation per course and event with gross, discounts, VAT, and refunds.
                        </p>
                        <Button asChild variant="outline" size="sm" className="w-full">
                            <Link href="/admin/finance/kasseoppgjor">
                                <Calculator className="h-4 w-4 mr-2" />
                                Open reconciliation
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                {/* Fees Report */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-rn-warning/10">
                                <Receipt className="h-5 w-5 text-rn-warning" />
                            </div>
                            <div>
                                <CardTitle className="text-base">Fees Report</CardTitle>
                                <CardDescription>Stripe fees</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="rn-meta text-rn-text-muted">
                            Overview of Stripe fees, platform fees, and net payout per organizer.
                        </p>
                        <Button asChild variant="outline" size="sm" className="w-full">
                            <Link href="/admin/finance/fees">
                                <Receipt className="h-4 w-4 mr-2" />
                                Open fees report
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                {/* Organization Report */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-500/10">
                                <Building2 className="h-5 w-5 text-purple-500" />
                            </div>
                            <div>
                                <CardTitle className="text-base">Organizer Report</CardTitle>
                                <CardDescription>Per organization</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="rn-meta text-rn-text-muted">
                            Revenue and registrations distributed across each organization in the system.
                        </p>
                        <Button asChild variant="outline" size="sm" className="w-full">
                            <Link href="/admin/finance?preset=all-time">
                                <Building2 className="h-4 w-4 mr-2" />
                                View overview
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                {/* Period Report */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/10">
                                <Calendar className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <CardTitle className="text-base">Period Report</CardTitle>
                                <CardDescription>Per course period</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="rn-meta text-rn-text-muted">
                            Revenue and registrations distributed across each course period.
                        </p>
                        <Button asChild variant="outline" size="sm" className="w-full">
                            <Link href="/admin/finance?preset=all-time">
                                <Calendar className="h-4 w-4 mr-2" />
                                View overview
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                {/* Trend Report */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-cyan-500/10">
                                <TrendingUp className="h-5 w-5 text-cyan-500" />
                            </div>
                            <div>
                                <CardTitle className="text-base">Trend Report</CardTitle>
                                <CardDescription>Compare periods</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="rn-meta text-rn-text-muted">
                            Compare revenue between this month, last month, last year, etc.
                        </p>
                        <div className="flex gap-2">
                            <Button asChild variant="outline" size="sm" className="flex-1">
                                <Link href="/admin/finance?preset=this-month">
                                    This month
                                </Link>
                            </Button>
                            <Button asChild variant="outline" size="sm" className="flex-1">
                                <Link href="/admin/finance?preset=last-year">
                                    Last year
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Links */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Links</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline" size="sm">
                            <Link href="/admin/finance?preset=today">Today</Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                            <Link href="/admin/finance?preset=this-week">This Week</Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                            <Link href="/admin/finance?preset=this-month">This Month</Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                            <Link href="/admin/finance?preset=this-year">Year to Date</Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                            <Link href="/admin/finance?preset=last-year">Last Year</Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                            <Link href="/admin/finance?preset=all-time">All Time</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
