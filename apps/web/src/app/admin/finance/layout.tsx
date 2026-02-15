import { requireAdmin } from '@/utils/auth-admin'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { 
    BarChart3, 
    Receipt, 
    FileText, 
    Calculator,
    DownloadIcon,
    TrendingUp
} from 'lucide-react'

export default async function AdminFinanceLayout({
    children,
}: {
    children: React.ReactNode
}) {
    await requireAdmin()

    return (
        <div className="space-y-rn-6">
            {/* Finance Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="rn-h1">Global Finance</h1>
                    <p className="rn-meta text-rn-text-muted">Platform revenue and financial analytics</p>
                </div>
                <div className="flex gap-rn-2">
                    <Button asChild variant="default" size="sm">
                        <Link href="/api/admin/export/platform-revenue?format=csv">
                            <TrendingUp className="mr-2 h-4 w-4" />
                            Export Revenue
                        </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                        <Link href="/api/admin/export/finance?format=csv">
                            <DownloadIcon className="mr-2 h-4 w-4" />
                            Export All
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex gap-1 border-b">
                <Link 
                    href="/admin/finance"
                    className="px-4 py-2 text-sm font-medium hover:bg-rn-surface-2 rounded-t-rn-1 border-b-2 border-transparent data-[active=true]:border-rn-primary data-[active=true]:text-rn-primary flex items-center gap-2"
                >
                    <BarChart3 className="h-4 w-4" />
                    Overview
                </Link>
                <Link 
                    href="/admin/finance/fees"
                    className="px-4 py-2 text-sm font-medium hover:bg-rn-surface-2 rounded-t-rn-1 border-b-2 border-transparent data-[active=true]:border-rn-primary data-[active=true]:text-rn-primary flex items-center gap-2"
                >
                    <Receipt className="h-4 w-4" />
                    Fees & Charges
                </Link>
                <Link 
                    href="/admin/finance/kasseoppgjor"
                    className="px-4 py-2 text-sm font-medium hover:bg-rn-surface-2 rounded-t-rn-1 border-b-2 border-transparent data-[active=true]:border-rn-primary data-[active=true]:text-rn-primary flex items-center gap-2"
                >
                    <Calculator className="h-4 w-4" />
                    Cash Reconciliation
                </Link>
                <Link 
                    href="/admin/finance/reports"
                    className="px-4 py-2 text-sm font-medium hover:bg-rn-surface-2 rounded-t-rn-1 border-b-2 border-transparent data-[active=true]:border-rn-primary data-[active=true]:text-rn-primary flex items-center gap-2"
                >
                    <FileText className="h-4 w-4" />
                    Reports
                </Link>
            </nav>

            {/* Page Content */}
            {children}
        </div>
    )
}
