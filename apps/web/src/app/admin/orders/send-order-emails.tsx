'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, Loader2, FileText, Receipt, FileX2, CheckCircle2 } from 'lucide-react'
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
    purchaserEmail
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
                throw new Error(data.error || 'Kunne ikke sende e-post')
            }

            toast.success(`E-post sendt til ${purchaserEmail}`)
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Kunne ikke sende e-post'
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

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Send e-post
                </CardTitle>
                <CardDescription>
                    Send ordre-dokumenter til kjøper
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-rn-3">
                {/* Send tickets */}
                <div className="flex items-center justify-between p-rn-3 border border-rn-border rounded-lg">
                    <div className="flex items-center gap-rn-3">
                        <FileText className="h-5 w-5 text-rn-text-muted" />
                        <div>
                            <p className="font-medium">Billetter</p>
                            <p className="text-sm text-rn-text-muted">
                                {hasRegistrations && 'Kursbevis'}
                                {hasRegistrations && hasEventRegistrations && ' og '}
                                {hasEventRegistrations && 'Eventbilletter'}
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={() => handleSendEmail('ticket')}
                        disabled={!canSendTickets || sending !== null}
                        size="sm"
                    >
                        {sending === 'ticket' ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Sender...
                            </>
                        ) : (
                            <>
                                <Mail className="h-4 w-4 mr-2" />
                                Send billetter
                            </>
                        )}
                    </Button>
                </div>

                {/* Send invoice */}
                <div className="flex items-center justify-between p-rn-3 border border-rn-border rounded-lg">
                    <div className="flex items-center gap-rn-3">
                        <Receipt className="h-5 w-5 text-rn-text-muted" />
                        <div>
                            <p className="font-medium">Kvittering</p>
                            <p className="text-sm text-rn-text-muted">
                                {hasInvoice ? 'Faktura opprettet' : 'Ingen faktura'}
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={() => handleSendEmail('invoice')}
                        disabled={!canSendInvoice || sending !== null}
                        size="sm"
                        variant="outline"
                    >
                        {sending === 'invoice' ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Sender...
                            </>
                        ) : (
                            <>
                                <Mail className="h-4 w-4 mr-2" />
                                Send kvittering
                            </>
                        )}
                    </Button>
                </div>

                {/* Send credit note */}
                <div className="flex items-center justify-between p-rn-3 border border-rn-border rounded-lg">
                    <div className="flex items-center gap-rn-3">
                        <FileX2 className="h-5 w-5 text-rn-text-muted" />
                        <div>
                            <p className="font-medium">Kreditnota</p>
                            <p className="text-sm text-rn-text-muted">
                                {hasCreditNote ? 'Kreditnota opprettet' : 'Ingen kreditnota'}
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={() => handleSendEmail('credit-note')}
                        disabled={!canSendCreditNote || sending !== null}
                        size="sm"
                        variant="outline"
                    >
                        {sending === 'credit-note' ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Sender...
                            </>
                        ) : (
                            <>
                                <Mail className="h-4 w-4 mr-2" />
                                Send kreditnota
                            </>
                        )}
                    </Button>
                </div>

                {orderStatus === 'PAID' && (
                    <div className="p-rn-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-rn-2 text-green-800">
                            <CheckCircle2 className="h-4 w-4" />
                            <p className="text-sm font-medium">
                                Ordren er betalt - dokumenter kan sendes
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
