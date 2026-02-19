import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { SettingsContent } from './settings-content'
import { UI_TEXT } from '@/lib/i18n'

export default async function MySettingsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    // Fetch user account and profile
    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: {
            PersonProfile: true
        }
    })

    if (!userAccount?.PersonProfile) {
        redirect('/onboarding')
    }

    // Check if user needs to update consent
    if (!userAccount.PersonProfile.gdprConsentAt || !userAccount.PersonProfile.touConsentAt) {
        redirect('/onboarding')
    }

    return (
        <main className="container mx-auto py-rn-7 px-rn-4">
            <div className="max-w-4xl mx-auto space-y-rn-6">
                {/* Header with back navigation */}
                <div className="flex items-center gap-rn-4 mb-rn-6">
                    <Button asChild variant="ghost" size="sm">
                        <Link href="/my">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            {UI_TEXT.common.backToPortal}
                        </Link>
                    </Button>
                </div>

                <SettingsContent user={user} userAccount={userAccount} />
            </div>
        </main>
    )
}

