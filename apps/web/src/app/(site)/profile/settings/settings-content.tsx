'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ProfileEditForm } from './profile-edit-form'
import type { User } from '@supabase/supabase-js'

interface SettingsContentProps {
    user: User
    userAccount: any
}

export function SettingsContent({ user, userAccount }: SettingsContentProps) {
    const [isEditing, setIsEditing] = useState(false)

    if (isEditing) {
        return (
            <div className="container mx-auto py-10 max-w-2xl">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold">Edit Profile</h1>
                    <p className="text-muted-foreground">Update your information</p>
                </div>

                <Card>
                    <CardContent className="pt-6">
                        <ProfileEditForm 
                            profile={userAccount.PersonProfile}
                            onCancel={() => setIsEditing(false)}
                        />
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-10 max-w-2xl">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Profile Settings</h1>
                    <p className="text-muted-foreground">Manage your account preferences</p>
                </div>
                <Button onClick={() => setIsEditing(true)}>
                    Edit Profile
                </Button>
            </div>

            <div className="space-y-6">
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
                                {userAccount.PersonProfile.firstName} {userAccount.PersonProfile.lastName}
                            </p>
                        </div>
                        {userAccount.PersonProfile.phone && (
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Phone</label>
                                <p className="text-sm">{userAccount.PersonProfile.phone}</p>
                            </div>
                        )}
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Language</label>
                            <p className="text-sm">
                                {userAccount.PersonProfile.preferredLanguage === 'no' ? 'Norwegian (Norsk)' : 'English'}
                            </p>
                        </div>
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
                        {userAccount.PersonProfile.streetAddress ? (
                            <>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Street Address</label>
                                    <p className="text-sm">{userAccount.PersonProfile.streetAddress}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {userAccount.PersonProfile.postalCode && (
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">Postal Code</label>
                                            <p className="text-sm">{userAccount.personProfile.postalCode}</p>
                                        </div>
                                    )}
                                    {userAccount.PersonProfile.city && (
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">City</label>
                                            <p className="text-sm">{userAccount.PersonProfile.city}</p>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Country</label>
                                    <p className="text-sm">{userAccount.PersonProfile.country}</p>
                                </div>
                            </>
                        ) : (
                            <p className="text-sm text-muted-foreground">No address provided</p>
                        )}
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
                                {userAccount.PersonProfile.reginorMarketingConsent ? '✓ Subscribed' : '✗ Not subscribed'}
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Organizer Marketing</label>
                            <p className="text-sm">
                                {userAccount.PersonProfile.organizerMarketingConsent ? '✓ Subscribed' : '✗ Not subscribed'}
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
                                {userAccount.PersonProfile.gdprConsentAt 
                                    ? `Accepted ${new Date(userAccount.PersonProfile.gdprConsentAt).toLocaleDateString()}`
                                    : 'Not accepted'
                                }
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Terms of Use</label>
                            <p className="text-sm">
                                {userAccount.PersonProfile.touConsentAt 
                                    ? `Accepted ${new Date(userAccount.PersonProfile.touConsentAt).toLocaleDateString()}`
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
