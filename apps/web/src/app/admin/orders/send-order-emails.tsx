'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, Loader2, FileText, Receipt, FileX2, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'

interface SendOrderEmailsProps {
    orderId: string
    orderStatus: string
    hasInvoice: boolean
    hasCreditNote: boolean
    hasRegistrations: boolean
    hasEventRegistrations: boolean
    purchaserEmail: string
}

export function SendOrderEmails({
    orderId,
    orderStatus,
    hasInvoice,
    hasCreditNote,
    hasRegistrations,
    hasEventRegistrations,
    purchaserEmail,
}: SendOrderEmailsProps) {
    const [sending, setSending] = useState<string | null>(null)

    const handleSendEmail = async (type: 'ticket' | 'invoice' | 'credit-note') => {
        setSending(type)
        try {
            const response = await fetch('/api/admin/orders/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId,
                    emailType: type
                })
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Could not send email')
            }

            toast.success(`Email sent to ${purchaserEmail}`)
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Could not send email'
            toast.error(message)
            console.error(error)
        } finally {
            setSending(null)
        }
    }

    const canSendTickets = (orderStatus === 'PAID' || orderStatus === 'PENDING_PAYMENT') && 
                           (hasRegistrations || hasEventRegistrations)
    const canSendInvoice = hasInvoice && (orderStatus === 'PAID' || orderStatus === 'PENDING_PAYMENT')
    const canSendCreditNote = hasCreditNote && (orderStatus === 'CANCELLED' || orderStatus === 'REFUNDED')

    const ticketDescription = hasRegistrations && hasEventRegistrations
        ? 'Course certificates and event tickets'
        : hasRegistrations
            ? 'Course certificates'
            : hasEventRegistrations
                ? 'Event tickets'
                : 'No tickets available'

    return (
        <div className="space-y-rn-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Send Documents
                    </h3>
                    <p className="text-sm text-rn-text-muted">
                        Send order documents to <span className="font-medium">{purchaserEmail}</span>
                    </p>
                </div>
            </div>

            {/* Three columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-rn-4">
                {/* Tickets */}
                <Card className={canSendTickets ? 'border-rn-primary/50' : ''}>
                    <CardHeader className="pb-rn-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <FileText className="h-4 w-4" />
                            Tickets
                        </CardTitle>
                        <CardDescription className="text-xs">
                            {ticketDescription}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-rn-3">
                        <div className="flex items-center gap-2 text-sm">
                            {canSendTickets ? (
                                <>
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    <span className="text-green-600">Ready to send</span>
                                </>
                            ) : (
                                <>
                                    <XCircle className="h-4 w-4 text-rn-text-muted" />
                                    <span className="text-rn-text-muted">
                                        {!hasRegistrations && !hasEventRegistrations 
                                            ? 'No registrations'
                                            : 'Order not paid'
                                        }
                                    </span>
                                </>
                            )}
                        </div>
                        <Button
                            onClick={() => handleSendEmail('ticket')}
                            disabled={!canSendTickets || sending !== null}
                            className="w-full"
                            variant={canSendTickets ? 'default' : 'outline'}
                        >
                            {sending === 'ticket' ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Mail className="h-4 w-4 mr-2" />
                                    Send Tickets
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Invoice */}
                <Card className={canSendInvoice ? 'border-rn-primary/50' : ''}>
                    <CardHeader className="pb-rn-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Receipt className="h-4 w-4" />
                            Invoice
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Payment receipt for accounting
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-rn-3">
                        <div className="flex items-center gap-2 text-sm">
                            {canSendInvoice ? (
                                <>
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    <span className="text-green-600">Invoice available</span>
                                </>
                            ) : (
                                <>
                                    <XCircle className="h-4 w-4 text-rn-text-muted" />
                                    <span className="text-rn-text-muted">
                                        {!hasInvoice ? 'No invoice created' : 'Order not paid'}
                                    </span>
                                </>
                            )}
                        </div>
                        <Button
                            onClick={() => handleSendEmail('invoice')}
                            disabled={!canSendInvoice || sending !== null}
                            className="w-full"
                            variant={canSendInvoice ? 'default' : 'outline'}
                        >
                            {sending === 'invoice' ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Mail className="h-4 w-4 mr-2" />
                                    Send Invoice
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Credit Note */}
                <Card className={canSendCreditNote ? 'border-rn-primary/50' : ''}>
                    <CardHeader className="pb-rn-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <FileX2 className="h-4 w-4" />
                            Credit Note
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Refund confirmation document
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-rn-3">
                        <div className="flex items-center gap-2 text-sm">
                            {canSendCreditNote ? (
                                <>
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    <span className="text-green-600">Credit note available</span>
                                </>
                            ) : (
                                <>
                                    <XCircle className="h-4 w-4 text-rn-text-muted" />
                                    <span className="text-rn-text-muted">
                                        {!hasCreditNote ? 'No credit note' : 'Order not refunded'}
                                    </span>
                                </>
                            )}
                        </div>
                        <Button
                            onClick={() => handleSendEmail('credit-note')}
                            disabled={!canSendCreditNote || sending !== null}
                            className="w-full"
                            variant={canSendCreditNote ? 'default' : 'outline'}
                        >
                            {sending === 'credit-note' ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Mail className="h-4 w-4 mr-2" />
                                    Send Credit Note
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
