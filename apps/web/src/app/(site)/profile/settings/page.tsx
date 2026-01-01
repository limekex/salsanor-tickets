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

    // Check if user needs to update consent
    if (!userAccount.personProfile.gdprConsentAt || !userAccount.personProfile.touConsentAt) {
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

                {/* Address Information */}
                <Card>
                    <CardHeader>
                        <CardTitle>Address</CardTitle>
                        <CardDescription>
                            Your physical address
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {userAccount.personProfile.streetAddress && (
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Street Address</label>
                                <p className="text-sm">{userAccount.personProfile.streetAddress}</p>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            {userAccount.personProfile.postalCode && (
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Postal Code</label>
                                    <p className="text-sm">{userAccount.personProfile.postalCode}</p>
                                </div>
                            )}
                            {userAccount.personProfile.city && (
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">City</label>
                                    <p className="text-sm">{userAccount.personProfile.city}</p>
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Country</label>
                            <p className="text-sm">{userAccount.personProfile.country}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Marketing Preferences */}
                <Card>
                    <CardHeader>
                        <CardTitle>Marketing Preferences</CardTitle>
                        <CardDescription>
                            Manage your email subscription preferences
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">RegiNor Marketing</label>
                            <p className="text-sm">
                                {userAccount.personProfile.reginorMarketingConsent ? '✓ Subscribed' : '✗ Not subscribed'}
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Organizer Marketing</label>
                            <p className="text-sm">
                                {userAccount.personProfile.organizerMarketingConsent ? '✓ Subscribed' : '✗ Not subscribed'}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Privacy & Consent */}
                <Card>
                    <CardHeader>
                        <CardTitle>Privacy & Consent</CardTitle>
                        <CardDescription>
                            Your consent history
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">GDPR Consent</label>
                            <p className="text-sm">
                                {userAccount.personProfile.gdprConsentAt 
                                    ? `Accepted ${new Date(userAccount.personProfile.gdprConsentAt).toLocaleDateString()}`
                                    : 'Not accepted'
                                }
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Terms of Use</label>
                            <p className="text-sm">
                                {userAccount.personProfile.touConsentAt 
                                    ? `Accepted ${new Date(userAccount.personProfile.touConsentAt).toLocaleDateString()}`
                                    : 'Not accepted'
                                }
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
