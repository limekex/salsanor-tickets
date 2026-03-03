import { Card, CardContent } from '@/components/ui/card'
import { XCircle } from 'lucide-react'
import SelfCheckInScanner from './self-checkin-scanner'

export default async function SelfCheckInPage({
    searchParams,
}: {
    searchParams: Promise<{ trackId?: string }>
}) {
    const { trackId } = await searchParams

    if (!trackId) {
        return (
            <div className="flex-1 flex items-center justify-center p-4">
                <Card className="w-full max-w-sm border-slate-700">
                    <CardContent className="pt-6 text-center space-y-2">
                        <XCircle className="h-12 w-12 text-red-400 mx-auto" />
                        <p className="text-slate-300">No course specified.</p>
                        <p className="text-sm text-slate-500">
                            Please scan the QR code posted at the venue or ask your instructor for the link.
                        </p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return <SelfCheckInScanner trackId={trackId} />
}
