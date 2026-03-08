import { prisma } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { Building2, ArrowLeft, CreditCard, Users } from 'lucide-react'
import { OrgSettingsForm } from './org-settings-form'
import { getSelectedOrganizerForAdmin } from '@/utils/auth-org-admin'

export default async function StaffAdminSettingsPage() {
    // Get selected organization (from cookie or first available)
    const organizerId = await getSelectedOrganizerForAdmin()

    // Get organization details
    const organizer = await prisma.organizer.findUnique({
        where: { id: organizerId }
    })

    if (!organizer) {
        throw new Error('Organization not found')
    }

    // Convert Decimal fields to numbers for client component
    const serializedOrg = {
        ...organizer,
        mvaRate: organizer.mvaRate ? Number(organizer.mvaRate) : null,
        stripeFeePercentage: organizer.stripeFeePercentage ? Number(organizer.stripeFeePercentage) : null,
        platformFeePercent: organizer.platformFeePercent ? Number(organizer.platformFeePercent) : null,
    }

    return (
        <div className="space-y-rn-6">
            <div className="flex items-center gap-rn-4">
                <Button asChild variant="ghost" size="sm">
                    <Link href="/staffadmin">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Link>
                </Button>
                <div className="flex-1">
                    <h2 className="rn-h2">Organization Settings</h2>
                    <p className="rn-meta text-rn-text-muted">Manage your organization details</p>
                </div>
                <div className="flex gap-rn-2">
                    <Button asChild variant="outline">
                        <Link href="/staffadmin/memberships">
                            <Users className="h-4 w-4 mr-2" />
                            Memberships
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link href="/staffadmin/settings/payments">
                            <CreditCard className="h-4 w-4 mr-2" />
                            Payment Settings
                        </Link>
                    </Button>
                </div>
            </div>

            <OrgSettingsForm key={organizer.id} organizer={serializedOrg as any} />
        </div>
    )
}
