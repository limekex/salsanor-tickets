import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { Building2, ArrowLeft, CreditCard, Users } from 'lucide-react'
import { OrgSettingsForm } from './org-settings-form'

export default async function StaffAdminSettingsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    // Get user's organizations where they have ORG_ADMIN role
    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: {
            roles: {
                where: {
                    role: 'ORG_ADMIN'
                },
                include: {
                    organizer: true
                }
            }
        }
    })

    const adminOrganizers = userAccount?.roles.map(r => r.organizer).filter(Boolean) || []

    if (adminOrganizers.length === 0) {
        redirect('/dashboard')
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

            <div className="grid gap-rn-6">
                {adminOrganizers.map(org => {
                    // Convert Decimal fields to numbers for client component
                    const serializedOrg = org ? {
                        ...org,
                        mvaRate: org.mvaRate ? Number(org.mvaRate) : null,
                        stripeFeePercentage: org.stripeFeePercentage ? Number(org.stripeFeePercentage) : null,
                    } : null
                    
                    return serializedOrg ? (
                        <OrgSettingsForm key={serializedOrg.id} organizer={serializedOrg as any} />
                    ) : null
                })}
            </div>
        </div>
    )
}
