import { checkOnboardingStatus } from '@/app/actions/onboarding'
import { redirect } from 'next/navigation'
import { OnboardingForm } from './onboarding-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function OnboardingPage() {
    const { needsOnboarding, userAccount } = await checkOnboardingStatus()

    if (!needsOnboarding) {
        redirect('/')
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-rn-surface px-rn-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Welcome to RegiNor! 🎉</CardTitle>
                    <CardDescription>
                        Let&apos;s set up your profile to get started
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <OnboardingForm email={userAccount?.email || ''} />
                </CardContent>
            </Card>
        </div>
    )
}
