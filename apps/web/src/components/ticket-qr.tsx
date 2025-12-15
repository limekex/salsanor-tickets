
'use client'

import { QRCodeSVG } from 'qrcode.react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { QrCode } from 'lucide-react'

export function TicketQR({ token, title }: { token: string, title: string }) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full mt-2 gap-2">
                    <QrCode className="h-4 w-4" />
                    View Ticket
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Ticket: {title}</DialogTitle>
                    <DialogDescription>
                        Scan this code at the door for entry.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex justify-center p-6 bg-white rounded-lg">
                    <QRCodeSVG value={token} size={256} />
                </div>
                <div className="text-center text-xs text-muted-foreground break-all">
                    {token}
                </div>
            </DialogContent>
        </Dialog>
    )
}
