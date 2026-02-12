import { getSelectedOrganizerForFinance } from '@/utils/auth-org-finance'
import { getOrgPaymentStatus } from '@/app/actions/staffadmin-finance'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeftIcon } from 'lucide-react'
import Link from 'next/link'
import { formatNOK } from '@/lib/tickets/legal-requirements'
import { formatDateNumeric } from '@/lib/formatters'

export default async function PaymentStatusPage() {
    // Get selected organization (from cookie or first available)
    const organizerId = await getSelectedOrganizerForFinance()
    
    const payments = await getOrgPaymentStatus(organizerId)

    // Calculate payment statistics
    const stats = payments.reduce((acc, payment) => {
        if (payment.status === 'SUCCEEDED') {
            acc.succeeded.count += 1
            acc.succeeded.amount += payment.amountCents
        } else if (payment.status === 'REQUIRES_ACTION') {
            acc.requiresAction.count += 1
            acc.requiresAction.amount += payment.amountCents
        } else if (payment.status === 'FAILED') {
            acc.failed.count += 1
            acc.failed.amount += payment.amountCents
        } else if (payment.status === 'REFUNDED') {
            acc.refunded.count += 1
            acc.refunded.amount += payment.amountCents
        }
        return acc
    }, {
        succeeded: { count: 0, amount: 0 },
        requiresAction: { count: 0, amount: 0 },
        failed: { count: 0, amount: 0 },
        refunded: { count: 0, amount: 0 }
    })

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
                    <h2 className="rn-h2">Payment Status</h2>
                </div>
            </div>

            {/* Payment Statistics */}
            <div className="grid gap-rn-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="rn-meta">Succeeded</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h2">{stats.succeeded.count}</div>
                        <p className="rn-caption text-rn-text-muted mt-rn-1">{formatNOK(stats.succeeded.amount)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="rn-meta">Requires Action</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h2">{stats.requiresAction.count}</div>
                        <p className="rn-caption text-rn-text-muted mt-rn-1">{formatNOK(stats.requiresAction.amount)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="rn-meta">Failed</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h2">{stats.failed.count}</div>
                        <p className="rn-caption text-rn-text-muted mt-rn-1">{formatNOK(stats.failed.amount)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="rn-meta">Refunded</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h2">{stats.refunded.count}</div>
                        <p className="rn-caption text-rn-text-muted mt-rn-1">{formatNOK(stats.refunded.amount)}</p>
                    </CardContent>
                </Card>
            </div>

            {/* All Payments Table */}
            <Card>
                <CardHeader>
                    <CardTitle>All Payments</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Order Number</TableHead>
                                    <TableHead>Payment ID</TableHead>
                                    <TableHead>Order ID</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead>Provider</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Payment Ref</TableHead>
                                    <TableHead>Invoice Number</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payments.map((payment) => (
                                    <TableRow key={payment.id}>
                                        <TableCell className="font-medium">{payment.Order.orderNumber || '—'}</TableCell>
                                        <TableCell className="font-mono text-sm">{payment.id.slice(0, 8)}</TableCell>
                                        <TableCell className="font-mono text-sm">{payment.orderId.slice(0, 8)}</TableCell>
                                        <TableCell>{formatDateNumeric(payment.createdAt)}</TableCell>
                                        <TableCell className="text-right font-medium">{formatNOK(payment.amountCents)}</TableCell>
                                        <TableCell className="capitalize">{payment.provider}</TableCell>
                                        <TableCell>
                                            <Badge 
                                                variant={
                                                    payment.status === 'SUCCEEDED' ? 'default' :
                                                    payment.status === 'REQUIRES_ACTION' ? 'secondary' :
                                                    payment.status === 'FAILED' ? 'destructive' :
                                                    'outline'
                                                }
                                            >
                                                {payment.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-rn-text-muted">
                                            {payment.providerPaymentRef ? payment.providerPaymentRef.slice(0, 20) + '...' : '—'}
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">
                                            {payment.Order.Invoice && payment.Order.Invoice.length > 0 ? payment.Order.Invoice[0].invoiceNumber : '—'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
