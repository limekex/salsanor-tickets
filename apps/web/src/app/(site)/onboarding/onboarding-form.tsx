'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { completeOnboarding } from '@/app/actions/onboarding'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function OnboardingForm({ email }: { email: string }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setError('')

        const formData = new FormData(e.currentTarget)
        const result = await completeOnboarding(formData)

        if (result.error) {
            setError(result.error)
            setLoading(false)
        } else {
            router.push('/')
            router.refresh()
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
