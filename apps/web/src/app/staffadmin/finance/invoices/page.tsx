'use server'

import { getSelectedOrganizerForFinance } from '@/utils/auth-org-finance'
import { getOrgInvoices } from '@/app/actions/staffadmin-finance'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components'
import { FileText, Receipt, Clock, CheckCircle, XCircle, AlertTriangle, ReceiptText } from 'lucide-react'
import { formatNOK, formatDateNO } from '@/lib/tickets/legal-requirements'
import Link from 'next/link'
import { InvoiceActions } from './InvoiceActions'
import { InvoiceStatus } from '@prisma/client'

// Status badge colors and labels
const statusConfig: Record<InvoiceStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof FileText }> = {
    DRAFT: { label: 'Utkast', variant: 'secondary', icon: FileText },
    SENT: { label: 'Sendt', variant: 'default', icon: Clock },
    PAID: { label: 'Betalt', variant: 'default', icon: CheckCircle },
    OVERDUE: { label: 'Forfalt', variant: 'destructive', icon: AlertTriangle },
    CANCELLED: { label: 'Kansellert', variant: 'outline', icon: XCircle },
    CREDITED: { label: 'Kreditert', variant: 'outline', icon: ReceiptText },
}

export default async function InvoicesPage() {
    const organizerId = await getSelectedOrganizerForFinance()
    const invoices = await getOrgInvoices(organizerId)

    // Calculate stats
    const totalInvoices = invoices.length
    const paidCount = invoices.filter(inv => inv.status === 'PAID').length
    const pendingCount = invoices.filter(inv => inv.status === 'SENT' || inv.status === 'DRAFT').length
    const totalAmount = invoices.reduce((sum, inv) => sum + inv.totalCents, 0)
    const paidAmount = invoices
        .filter(inv => inv.status === 'PAID')
        .reduce((sum, inv) => sum + (inv.paidAmount || inv.totalCents), 0)

    return (
        <div className="space-y-rn-6">
            {/* Header */}
            <div>
                <h1 className="rn-h2">Fakturaer</h1>
                <p className="rn-meta text-rn-text-muted">
                    Administrer fakturaer for din organisasjon
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-rn-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Totalt fakturaer</CardDescription>
                        <CardTitle className="text-2xl">{totalInvoices}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Betalte</CardDescription>
                        <CardTitle className="text-2xl text-green-600">{paidCount}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Ventende</CardDescription>
                        <CardTitle className="text-2xl text-amber-600">{pendingCount}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total fakturert</CardDescription>
                        <CardTitle className="text-2xl">{formatNOK(totalAmount)}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Invoice List */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Receipt className="h-5 w-5" />
                        Fakturaliste
                    </CardTitle>
                    <CardDescription>
                        Alle fakturaer for din organisasjon
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {invoices.length === 0 ? (
                        <EmptyState
                            icon={FileText}
                            title="Ingen fakturaer"
                            description="Det finnes ingen fakturaer ennå. Fakturaer opprettes automatisk for betalte ordrer."
                        />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fakturanr.</TableHead>
                                    <TableHead>Kunde</TableHead>
                                    <TableHead>Ordrenr.</TableHead>
                                    <TableHead>Dato</TableHead>
                                    <TableHead>Forfallsdato</TableHead>
                                    <TableHead>Beløp</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Sendt</TableHead>
                                    <TableHead className="text-right">Handlinger</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invoices.map((invoice) => {
                                    const status = statusConfig[invoice.status] || statusConfig.DRAFT
                                    const StatusIcon = status.icon
                                    
                                    return (
                                        <TableRow key={invoice.id}>
                                            <TableCell className="font-mono font-medium">
                                                {invoice.invoiceNumber}
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">{invoice.customerName}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {invoice.customerEmail}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {invoice.Order?.orderNumber ? (
                                                    <Link 
                                                        href={`/staffadmin/orders/${invoice.orderId}`}
                                                        className="text-primary hover:underline font-mono"
                                                    >
                                                        {invoice.Order.orderNumber}
                                                    </Link>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell>{formatDateNO(invoice.invoiceDate)}</TableCell>
                                            <TableCell>{formatDateNO(invoice.dueDate)}</TableCell>
                                            <TableCell className="font-medium">
                                                {formatNOK(invoice.totalCents)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge 
                                                    variant={status.variant}
                                                    className="flex items-center gap-1 w-fit"
                                                >
                                                    <StatusIcon className="h-3 w-3" />
                                                    {status.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {invoice.sentAt ? (
                                                    <span className="text-sm text-muted-foreground">
                                                        {formatDateNO(invoice.sentAt)}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <InvoiceActions 
                                                    invoiceId={invoice.id}
                                                    organizerId={organizerId}
                                                    invoiceNumber={invoice.invoiceNumber}
                                                    customerEmail={invoice.customerEmail}
                                                    isSent={!!invoice.sentAt}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Paid Amount Summary */}
            {paidAmount > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Oppsummering</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Total innbetalt:</span>
                            <span className="text-xl font-bold text-green-600">{formatNOK(paidAmount)}</span>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
