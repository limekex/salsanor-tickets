import { Card, CardContent } from '@/components/ui/card'
import { XCircle } from 'lucide-react'
import SelfCheckInScanner from './self-checkin-scanner'

export default async function SelfCheckInPage({
    searchParams,
}: {
    searchParams: Promise<{ trackId?: string; override?: string }>
}) {
    const { trackId, override } = await searchParams
    const allowOverride = override === '1'

    if (!trackId) {
        return (
            <div className="flex-1 flex items-center justify-center p-rn-4">
                <Card className="w-full max-w-sm">
                    <CardContent className="pt-rn-6 text-center space-y-rn-2">
                        <XCircle className="h-12 w-12 text-rn-danger mx-auto" />
                        <p className="text-rn-text font-medium">No course specified.</p>
                        <p className="rn-meta text-rn-text-muted">
                            Please scan the QR code posted at the venue or ask your instructor for the link.
                        </p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return <SelfCheckInScanner trackId={trackId} allowOverride={allowOverride} />
}
