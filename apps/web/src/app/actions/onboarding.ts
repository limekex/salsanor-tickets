'use server'

import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'

export async function checkOnboardingStatus() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
        return { needsOnboarding: false, userAccount: null }
    }

    // Check if user has completed onboarding (has PersonProfile)
    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: { personProfile: true }
    })

    if (!userAccount) {
        // This shouldn't happen if trigger works, but let's create it
        const newAccount = await prisma.userAccount.create({
            data: {
                supabaseUid: user.id,
                email: user.email!
            }
        })
        return { needsOnboarding: true, userAccount: newAccount }
    }

    return { 
        needsOnboarding: !userAccount.personProfile,
        userAccount 
    }
}

export async function completeOnboarding(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
        return { error: 'Not authenticated' }
    }

    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id }
    })

    if (!userAccount) {
        return { error: 'User account not found' }
    }

    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string
    const phone = formData.get('phone') as string

    if (!firstName || !lastName) {
        return { error: 'First name and last name are required' }
    }

    try {
        await prisma.personProfile.create({
            data: {
                userId: userAccount.id,
                email: userAccount.email,
                firstName,
                lastName,
                phone: phone || null
            }
        })

        return { success: true }
    } catch (error) {
        console.error('Onboarding error:', error)
        return { error: 'Failed to complete onboarding' }
    }
}
