import { getSelectedOrganizerForFinance } from '@/utils/auth-org-finance'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeftIcon, DownloadIcon } from 'lucide-react'
import Link from 'next/link'

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

            <Card>
                <CardHeader>
                    <CardTitle>CSV Export</CardTitle>
                    <p className="text-sm text-rn-text-muted mt-rn-2">
                        Export financial data for <strong>{organizerName}</strong> with all legally required fields for Norwegian accounting compliance.
                    </p>
                </CardHeader>
                <CardContent className="space-y-rn-4">
                    <div className="space-y-rn-2">
                        <h4 className="font-medium">Included Fields (21 columns):</h4>
                        <ul className="list-disc list-inside text-sm text-rn-text-muted space-y-rn-1">
                            <li><strong>Order ID</strong> - Unique order identifier (UUID)</li>
                            <li><strong>Order Number</strong> - Sequential number with org prefix (e.g., "OSLO-2024-001")</li>
                            <li><strong>Organization</strong> - Organization name</li>
                            <li><strong>Org.nr</strong> - Norwegian organization number</li>
                            <li><strong>Product Name</strong> - Course period/event/membership name (includes track names for periods)</li>
                            <li><strong>Product Code</strong> - Product code (includes track codes for periods)</li>
                            <li><strong>Order Type</strong> - COURSE_PERIOD, EVENT, or MEMBERSHIP</li>
                            <li><strong>Subtotal (NOK)</strong> - Amount before discount and MVA</li>
                            <li><strong>Discount (NOK)</strong> - Discount amount applied</li>
                            <li><strong>Subtotal After Discount (NOK)</strong> - Amount after discount, before MVA</li>
                            <li><strong>MVA Rate (%)</strong> - Norwegian VAT rate (usually 25% or 0%)</li>
                            <li><strong>MVA Amount (NOK)</strong> - VAT amount</li>
                            <li><strong>Total (NOK)</strong> - Final amount including MVA</li>
                            <li><strong>Currency</strong> - Currency code (NOK)</li>
                            <li><strong>Registration Count</strong> - Number of registrations in order</li>
                            <li><strong>Payment Provider</strong> - Payment gateway used (e.g., Stripe, Vipps)</li>
                            <li><strong>Payment Status</strong> - Payment transaction status</li>
                            <li><strong>Payment Reference</strong> - Stripe payment intent ID for reconciliation</li>
                            <li><strong>Invoice Number</strong> - Document tracking number (e.g., "INV-1768423851212-782016A8")</li>
                            <li><strong>Created At</strong> - Order creation timestamp</li>
                            <li><strong>Updated At</strong> - Order last update timestamp</li>
                        </ul>
                    </div>

                    <div className="pt-rn-4 border-t border-rn-border">
                        <Button asChild size="lg">
                            <Link href={`/api/staffadmin/export/finance?organizerId=${organizerId}`}>
                                <DownloadIcon className="mr-2 h-4 w-4" />
                                Download CSV Export
                            </Link>
                        </Button>
                    </div>

                    <div className="pt-rn-4 text-sm text-rn-text-muted">
                        <p><strong>Note:</strong> This export includes all paid orders for your organization and complies with Norwegian Bokføringsloven requirements.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
