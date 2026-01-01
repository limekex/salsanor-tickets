'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { completeOnboarding } from '@/app/actions/onboarding'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function OnboardingForm({ email }: { email: string }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [gdprConsent, setGdprConsent] = useState(false)
    const [touConsent, setTouConsent] = useState(false)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setError('')

        // Validate required consents
        if (!gdprConsent || !touConsent) {
            setError('You must accept the Privacy Policy and Terms of Use to continue')
            setLoading(false)
            return
        }

        const formData = new FormData(e.currentTarget)
        const result = await completeOnboarding(formData)

        if (result.error) {
            setError(result.error)
            setLoading(false)
        } else if (result.success) {
            // Success! Redirect to home
            router.push('/')
            router.refresh()
        } else {
            // Unexpected error occurred
            setError('Unexpected error occurred')
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                    id="email" 
                    type="email" 
                    value={email} 
                    disabled 
                    className="bg-muted"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input 
                    id="firstName" 
                    name="firstName" 
                    type="text" 
                    required 
                    disabled={loading}
                    placeholder="John"
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
                    placeholder="Doe"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input 
                    id="phone" 
                    name="phone" 
                    type="tel" 
                    disabled={loading}
                    placeholder="+47 123 45 678"
                />
                <p className="text-sm text-muted-foreground">
                    Optional - used for SMS notifications
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="streetAddress">Street Address</Label>
                <Input 
                    id="streetAddress" 
                    name="streetAddress" 
                    type="text" 
                    disabled={loading}
                    placeholder="Main Street 123"
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
                        placeholder="0001"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input 
                        id="city" 
                        name="city" 
                        type="text" 
                        disabled={loading}
                        placeholder="Oslo"
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
                    defaultValue="Norway"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="preferredLanguage">Preferred Language</Label>
                <select
                    id="preferredLanguage"
                    name="preferredLanguage"
                    disabled={loading}
                    defaultValue="no"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <option value="no">Norwegian (Norsk)</option>
                    <option value="en">English</option>
                </select>
                <p className="text-sm text-muted-foreground">
                    Language for emails and notifications
                </p>
            </div>

            <div className="space-y-4 border-t pt-4">
                <div className="flex items-start space-x-2">
                    <Checkbox
                        id="gdprConsent"
                        checked={gdprConsent}
                        onCheckedChange={(checked) => setGdprConsent(checked as boolean)}
                        disabled={loading}
                        className="mt-1"
                    />
                    <Label htmlFor="gdprConsent" className="text-sm font-normal leading-relaxed cursor-pointer">
                        I accept the <a href="/privacy" target="_blank" className="text-primary hover:underline">Privacy Policy</a> and consent to the processing of my personal data in accordance with GDPR *
                    </Label>
                </div>

                <div className="flex items-start space-x-2">
                    <Checkbox
                        id="touConsent"
                        checked={touConsent}
                        onCheckedChange={(checked) => setTouConsent(checked as boolean)}
                        disabled={loading}
                        className="mt-1"
                    />
                    <Label htmlFor="touConsent" className="text-sm font-normal leading-relaxed cursor-pointer">
                        I accept the <a href="/terms" target="_blank" className="text-primary hover:underline">Terms of Use</a> *
                    </Label>
                </div>

                <div className="flex items-start space-x-2">
                    <Checkbox
                        id="reginorMarketingConsent"
                        name="reginorMarketingConsent"
                        disabled={loading}
                        className="mt-1"
                    />
                    <Label htmlFor="reginorMarketingConsent" className="text-sm font-normal leading-relaxed cursor-pointer">
                        I want to receive marketing emails and updates from RegiNor about new features and dance events
                    </Label>
                </div>

                <div className="flex items-start space-x-2">
                    <Checkbox
                        id="organizerMarketingConsent"
                        name="organizerMarketingConsent"
                        disabled={loading}
                        className="mt-1"
                    />
                    <Label htmlFor="organizerMarketingConsent" className="text-sm font-normal leading-relaxed cursor-pointer">
                        I want to receive marketing emails from event organizers I register with or make purchases from
                    </Label>
                </div>
            </div>

            {error && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                    <p className="text-sm text-destructive">{error}</p>
                </div>
            )}

            <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Setting up...' : 'Complete Setup'}
            </Button>
        </form>
    )
}
