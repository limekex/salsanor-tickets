import { checkOnboardingStatus } from '@/app/actions/onboarding'
import { redirect } from 'next/navigation'
import { OnboardingForm } from './onboarding-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function OnboardingPage() {
    const { needsOnboarding, userAccount, needsConsentUpdate } = await checkOnboardingStatus()

    console.log('Onboarding check:', { needsOnboarding, hasAccount: !!userAccount, hasProfile: !!userAccount?.personProfile, needsConsentUpdate })

    if (!needsOnboarding) {
        console.log('Redirecting to home - onboarding not needed')
        redirect('/')
    }

    if (!userAccount) {
        console.log('Redirecting to login - no user account')
        redirect('/auth/login')
    }

    const isUpdate = !!userAccount.personProfile

    return (
        <div className="min-h-screen flex items-center justify-center bg-rn-surface px-rn-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>
                        {isUpdate ? 'Update Your Profile' : 'Welcome to RegiNor! 🎉'}
                    </CardTitle>
                    <CardDescription>
                        {isUpdate 
                            ? 'Please update your profile with the required information'
                            : "Let's set up your profile to get started"
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <OnboardingForm 
                        email={userAccount.email || ''} 
                        existingProfile={userAccount.personProfile}
                        isUpdate={isUpdate}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
