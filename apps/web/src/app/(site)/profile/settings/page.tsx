import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { LanguageSelector } from './language-selector'

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
            personProfile: true
        }
    })

    if (!userAccount?.personProfile) {
        redirect('/onboarding')
    }

    return (
        <div className="container mx-auto py-10 max-w-2xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Profile Settings</h1>
                <p className="text-muted-foreground">Manage your account preferences</p>
            </div>

            <div className="space-y-6">
                {/* Language Preference */}
                <Card>
                    <CardHeader>
                        <CardTitle>Language Preference</CardTitle>
                        <CardDescription>
                            Choose your preferred language for emails and communications
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <LanguageSelector 
                            personProfileId={userAccount.personProfile.id}
                            currentLanguage={userAccount.personProfile.preferredLanguage}
                        />
                    </CardContent>
                </Card>

                {/* Account Information */}
                <Card>
                    <CardHeader>
                        <CardTitle>Account Information</CardTitle>
                        <CardDescription>
                            Your personal information
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Email</label>
                            <p className="text-sm">{user.email}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Name</label>
                            <p className="text-sm">
                                {userAccount.personProfile.firstName} {userAccount.personProfile.lastName}
                            </p>
                        </div>
                        {userAccount.personProfile.phone && (
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Phone</label>
                                <p className="text-sm">{userAccount.personProfile.phone}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
