'use client'

import { useState } from 'react'
import { updateProfile } from '@/app/actions/profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import type { PersonProfile } from '@prisma/client'
import { useRouter } from 'next/navigation'

interface ProfileEditFormProps {
    profile: PersonProfile
    onCancel: () => void
}

export function ProfileEditForm({ profile, onCancel }: ProfileEditFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSuccess(false)

        const formData = new FormData(e.currentTarget)
        const result = await updateProfile(formData)

        if (result.error) {
            setError(result.error)
            setLoading(false)
        } else if (result.success) {
            setSuccess(true)
            setLoading(false)
            router.refresh()
            setTimeout(() => {
                onCancel()
            }, 1000)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input 
                        id="firstName" 
                        name="firstName" 
                        type="text" 
                        required 
                        disabled={loading}
                        defaultValue={profile.firstName}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input 
                        id="lastName" 
                        name="lastName" 
                        type="text" 
                        required 
                        disabled={loading}
                        defaultValue={profile.lastName}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input 
                    id="phone" 
                    name="phone" 
                    type="tel" 
                    disabled={loading}
                    defaultValue={profile.phone || ''}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="streetAddress">Street Address</Label>
                <Input 
                    id="streetAddress" 
                    name="streetAddress" 
                    type="text" 
                    disabled={loading}
                    defaultValue={profile.streetAddress || ''}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input 
                        id="postalCode" 
                        name="postalCode" 
                        type="text" 
                        disabled={loading}
                        defaultValue={profile.postalCode || ''}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input 
                        id="city" 
                        name="city" 
                        type="text" 
                        disabled={loading}
                        defaultValue={profile.city || ''}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input 
                    id="country" 
                    name="country" 
                    type="text" 
                    disabled={loading}
                    defaultValue={profile.country}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="preferredLanguage">Preferred Language</Label>
                <select
                    id="preferredLanguage"
                    name="preferredLanguage"
                    disabled={loading}
                    defaultValue={profile.preferredLanguage}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <option value="no">Norwegian (Norsk)</option>
                    <option value="en">English</option>
                </select>
            </div>

            <div className="space-y-4 border-t pt-4">
                <h3 className="font-medium">Marketing Preferences</h3>
                
                <div className="flex items-start space-x-2">
                    <Checkbox
                        id="reginorMarketingConsent"
                        name="reginorMarketingConsent"
                        disabled={loading}
                        className="mt-1 flex-shrink-0"
                        defaultChecked={profile.reginorMarketingConsent}
                    />
                    <div className="flex-1">
                        <Label htmlFor="reginorMarketingConsent" className="text-sm font-normal leading-relaxed cursor-pointer">
                            I want to receive marketing emails and updates from RegiNor
                        </Label>
                    </div>
                </div>

                <div className="flex items-start space-x-2">
                    <Checkbox
                        id="organizerMarketingConsent"
                        name="organizerMarketingConsent"
                        disabled={loading}
                        className="mt-1 flex-shrink-0"
                        defaultChecked={profile.organizerMarketingConsent}
                    />
                    <div className="flex-1">
                        <Label htmlFor="organizerMarketingConsent" className="text-sm font-normal leading-relaxed cursor-pointer">
                            I want to receive marketing emails from event organizers
                        </Label>
                    </div>
                </div>
            </div>

            {error && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                    <p className="text-sm text-destructive">{error}</p>
                </div>
            )}

            {success && (
                <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-3">
                    <p className="text-sm text-green-700">Profile updated successfully!</p>
                </div>
            )}

            <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                    Cancel
                </Button>
            </div>
        </form>
    )
}
