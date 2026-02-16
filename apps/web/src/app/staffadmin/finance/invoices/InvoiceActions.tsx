'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Download, Mail, MoreHorizontal, Send } from 'lucide-react'
import { toast } from 'sonner'

interface InvoiceActionsProps {
    invoiceId: string
    organizerId: string
    invoiceNumber: string
    customerEmail: string
    isSent: boolean
}

export function InvoiceActions({ 
    invoiceId, 
    organizerId, 
    invoiceNumber,
    customerEmail,
    isSent
}: InvoiceActionsProps) {
    const [isPending, startTransition] = useTransition()
    const [isDownloading, setIsDownloading] = useState(false)

    const handleDownloadPDF = async () => {
        setIsDownloading(true)
        try {
            const response = await fetch(`/api/staffadmin/invoices/${invoiceId}/pdf?organizerId=${organizerId}`)
            
            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Could not download PDF')
            }
            
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `faktura-${invoiceNumber}.pdf`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
            
            toast.success('PDF lastet ned')
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Kunne ikke laste ned PDF')
        } finally {
            setIsDownloading(false)
        }
    }

    const handleResendEmail = async () => {
        startTransition(async () => {
            try {
                const response = await fetch(`/api/staffadmin/invoices/${invoiceId}/send`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ organizerId })
                })
                
                if (!response.ok) {
                    const error = await response.json()
                    throw new Error(error.error || 'Could not send email')
                }
                
                toast.success(`Faktura sendt til ${customerEmail}`)
            } catch (error) {
                toast.error(error instanceof Error ? error.message : 'Kunne ikke sende e-post')
            }
        })
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" disabled={isPending || isDownloading}>
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Åpne meny</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDownloadPDF} disabled={isDownloading}>
                    <Download className="h-4 w-4 mr-2" />
                    Last ned PDF
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={handleResendEmail} disabled={isPending}>
                    {isSent ? (
                        <>
                            <Mail className="h-4 w-4 mr-2" />
                            Send på nytt
                        </>
                    ) : (
                        <>
                            <Send className="h-4 w-4 mr-2" />
                            Send til kunde
                        </>
                    )}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
