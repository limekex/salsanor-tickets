import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { LanguageSelector } from './language-selector'
import { SettingsContent } from './settings-content'

export default async function ProfileSettingsPage() {
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
        <SettingsContent user={user} userAccount={userAccount} />
    )
}
