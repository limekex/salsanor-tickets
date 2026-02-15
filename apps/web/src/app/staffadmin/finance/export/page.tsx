import { getSelectedOrganizerForFinance } from '@/utils/auth-org-finance'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeftIcon } from 'lucide-react'
import Link from 'next/link'
import { ExportForm } from './ExportForm'

export default async function ExportPage() {
    // Get selected organization (from cookie or first available)
    const organizerId = await getSelectedOrganizerForFinance()
    
    // Get organizer details
    const organizer = await prisma.organizer.findUnique({
        where: { id: organizerId },
        select: { name: true }
    })
    
    const organizerName = organizer?.name || 'Unknown Organization'

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
                    <h2 className="rn-h2">Export Financial Data</h2>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-rn-6">
                {/* Left: Export Form */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>CSV Export</CardTitle>
                        <p className="text-sm text-rn-text-muted mt-rn-1">
                            Export for <strong>{organizerName}</strong>
                        </p>
                    </CardHeader>
                    <CardContent>
                        <ExportForm organizerId={organizerId} />
                    </CardContent>
                </Card>

                {/* Right: Column Documentation */}
                <Card className="lg:col-span-3">
                    <CardHeader className="pb-rn-2">
                        <CardTitle className="text-base">Included Fields (29 columns)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-rn-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-rn-4 gap-y-rn-1 text-xs text-rn-text-muted">
                            <div><strong>Order ID</strong> – UUID</div>
                            <div><strong>Order Number</strong> – e.g., "OSLO-2024-001"</div>
                            <div><strong>Organization</strong> – Name</div>
                            <div><strong>Org.nr</strong> – Norwegian org number</div>
                            <div><strong>Product Name</strong> – Course/event/membership</div>
                            <div><strong>Product Code</strong> – Internal code</div>
                            <div><strong>Order Type</strong> – COURSE_PERIOD/EVENT/MEMBERSHIP</div>
                            <div><strong>Subtotal (NOK)</strong> – Before discount & MVA</div>
                            <div><strong>Discount (NOK)</strong> – Applied discount</div>
                            <div><strong>Subtotal After Discount</strong> – Before MVA</div>
                            <div><strong>MVA Rate (%)</strong> – VAT rate</div>
                            <div><strong>MVA Amount (NOK)</strong> – VAT amount</div>
                            <div><strong>Total (NOK)</strong> – Final with MVA</div>
                            <div><strong>Stripe Fee (NOK)*</strong> – Processing fee</div>
                            <div><strong>Platform Fee (NOK)*</strong> – RegiNor fee</div>
                            <div><strong>Net Amount (NOK)*</strong> – After all fees</div>
                            <div><strong>Payment ID*</strong> – Stripe pi_xxx</div>
                            <div><strong>Payment Method*</strong> – card, klarna, etc.</div>
                            <div><strong>Card Brand*</strong> – visa, mastercard, etc.</div>
                            <div><strong>Card Last 4*</strong> – Last 4 digits</div>
                            <div><strong>Card Fingerprint*</strong> – For reconciliation</div>
                            <div><strong>Currency</strong> – NOK</div>
                            <div><strong>Registration Count</strong> – Items in order</div>
                            <div><strong>Payment Provider</strong> – e.g., Stripe</div>
                            <div><strong>Payment Status</strong> – Transaction status</div>
                            <div><strong>Payment Reference</strong> – Checkout session ID</div>
                            <div><strong>Invoice Number</strong> – Document number</div>
                            <div><strong>Created At</strong> – Order timestamp</div>
                            <div><strong>Updated At</strong> – Last update</div>
                        </div>
                        <p className="text-xs text-rn-text-muted pt-rn-2 border-t border-rn-border">
                            <strong>*</strong> Payment detail columns are captured from Stripe webhooks. 
                            Use "Sync All Stripe Fees" before export to ensure complete data.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
