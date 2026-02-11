import { requireOrgFinance } from '@/utils/auth-org-finance'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeftIcon, DownloadIcon } from 'lucide-react'
import Link from 'next/link'

export default async function ExportPage() {
    const userAccount = await requireOrgFinance()
    
    // Get first organization with finance access
    const firstOrgRole = userAccount.UserAccountRole[0]
    if (!firstOrgRole?.organizerId) {
        throw new Error('No organization access found')
    }
    
    const organizerId = firstOrgRole.organizerId
    const organizerName = firstOrgRole.Organizer.name

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
                        <h4 className="font-medium">Included Fields:</h4>
                        <ul className="list-disc list-inside text-sm text-rn-text-muted space-y-rn-1">
                            <li>Order ID</li>
                            <li>Organization name and number</li>
                            <li>Period name and code</li>
                            <li>Subtotal (NOK)</li>
                            <li>Discount amount (NOK)</li>
                            <li>Subtotal after discount (NOK)</li>
                            <li>MVA rate (%)</li>
                            <li>MVA amount (NOK)</li>
                            <li>Total amount (NOK)</li>
                            <li>Currency</li>
                            <li>Registration count</li>
                            <li>Payment provider and status</li>
                            <li>Created and updated timestamps</li>
                        </ul>
                    </div>

                    <div className="pt-rn-4 border-t border-rn-border">
                        <form action={`/api/staffadmin/export/finance?organizerId=${organizerId}`} method="GET">
                            <Button type="submit" size="lg">
                                <DownloadIcon className="mr-2 h-4 w-4" />
                                Download CSV Export
                            </Button>
                        </form>
                    </div>

                    <div className="pt-rn-4 text-sm text-rn-text-muted">
                        <p><strong>Note:</strong> This export includes all paid orders for your organization and complies with Norwegian Bokføringsloven requirements.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
