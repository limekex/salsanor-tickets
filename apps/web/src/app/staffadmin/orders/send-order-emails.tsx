'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Ticket, Receipt, FileX2 } from 'lucide-react'
import { toast } from 'sonner'

interface SendOrderEmailsProps {
    orderId: string
    orderStatus: string
    hasInvoice: boolean
    hasCreditNote: boolean
}

type EmailType = 'ticket' | 'invoice' | 'credit-note'

export function SendOrderEmails({ orderId, orderStatus, hasInvoice, hasCreditNote }: SendOrderEmailsProps) {
    const [sendingType, setSendingType] = useState<EmailType | null>(null)

    const handleSendEmail = async (type: EmailType) => {
        setSendingType(type)

        try {
            const response = await fetch('/api/staffadmin/orders/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    orderId,
                    emailType: type,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send email')
            }

            toast.success('Email sent successfully!')
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            toast.error(`Failed to send email: ${errorMessage}`)
        } finally {
            setSendingType(null)
        }
    }

    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
                Send order emails manually to the customer. Emails will be sent to the customer's
                registered email address.
            </p>

            <div className="flex flex-wrap gap-3">
                <Button
                    onClick={() => handleSendEmail('ticket')}
                    disabled={sendingType === 'ticket' || orderStatus === 'DRAFT'}
                >
                    {sendingType === 'ticket' ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Sending...
                        </>
                    ) : (
                        <>
                            <Ticket className="h-4 w-4 mr-2" />
                            Send Tickets
                        </>
                    )}
                </Button>

                <Button
                    onClick={() => handleSendEmail('invoice')}
                    disabled={sendingType === 'invoice' || !hasInvoice || orderStatus === 'DRAFT'}
                    variant="secondary"
                >
                    {sendingType === 'invoice' ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Sending...
                        </>
                    ) : (
                        <>
                            <Receipt className="h-4 w-4 mr-2" />
                            Send Receipt
                        </>
                    )}
                </Button>

                <Button
                    onClick={() => handleSendEmail('credit-note')}
                    disabled={
                        sendingType === 'credit-note' ||
                        !hasCreditNote ||
                        (orderStatus !== 'REFUNDED' && orderStatus !== 'CANCELLED')
                    }
                    variant="destructive"
                >
                    {sendingType === 'credit-note' ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Sending...
                        </>
                    ) : (
                        <>
                            <FileX2 className="h-4 w-4 mr-2" />
                            Send Credit Note
                        </>
                    )}
                </Button>
            </div>
        </div>
    )
}
