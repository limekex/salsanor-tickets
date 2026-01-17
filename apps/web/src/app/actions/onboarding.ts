'use server'

import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'

export async function checkOnboardingStatus() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
        return { needsOnboarding: false, userAccount: null }
    }

    // Check if user has completed onboarding (has PersonProfile)
    let userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: { PersonProfile: true }
    })

    if (!userAccount) {
        // Try to find by email first (in case supabaseUid changed)
        userAccount = await prisma.userAccount.findUnique({
            where: { email: user.email! },
            include: { PersonProfile: true }
        })

        if (userAccount) {
            // Update the supabaseUid if found by email
            userAccount = await prisma.userAccount.update({
                where: { id: userAccount.id },
                data: { supabaseUid: user.id },
                include: { PersonProfile: true }
            })
        } else {
            // Create new account only if not found by email either
            try {
                userAccount = await prisma.userAccount.create({
                    data: {
                        id: randomUUID(),
                        supabaseUid: user.id,
                        email: user.email!
                    },
                    include: { PersonProfile: true }
                })
            } catch (error: any) {
                // If unique constraint fails, try one more time to find by email
                if (error.code === 'P2002') {
                    userAccount = await prisma.userAccount.findUnique({
                        where: { email: user.email! },
                        include: { PersonProfile: true }
                    })
                    if (userAccount) {
                        // Update supabaseUid
                        userAccount = await prisma.userAccount.update({
                            where: { id: userAccount.id },
                            data: { supabaseUid: user.id },
                            include: { PersonProfile: true }
                        })
                    }
                }
                if (!userAccount) {
                    throw error
                }
            }
        }
    }

    // Check if profile exists but is missing required consent
    const needsConsentUpdate = userAccount.PersonProfile && 
        (!userAccount.PersonProfile.gdprConsentAt || !userAccount.PersonProfile.touConsentAt)

    return { 
        needsOnboarding: !userAccount.PersonProfile || needsConsentUpdate,
        userAccount,
        needsConsentUpdate: needsConsentUpdate || false
    }
}

export async function completeOnboarding(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
        return { error: 'Not authenticated' }
    }

    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: { PersonProfile: true }
    })

    if (!userAccount) {
        return { error: 'User account not found' }
    }

    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string
    const phone = formData.get('phone') as string
    const streetAddress = formData.get('streetAddress') as string
    const postalCode = formData.get('postalCode') as string
    const city = formData.get('city') as string
    const country = formData.get('country') as string
    const preferredLanguage = formData.get('preferredLanguage') as string
    const reginorMarketingConsent = formData.get('reginorMarketingConsent') === 'on'
    const organizerMarketingConsent = formData.get('organizerMarketingConsent') === 'on'

    if (!firstName || !lastName) {
        return { error: 'First name and last name are required' }
    }

    try {
        const profileData = {
            email: userAccount.email || user.email || '',
            firstName,
            lastName,
            phone: phone || null,
            streetAddress: streetAddress || null,
            postalCode: postalCode || null,
            city: city || null,
            country: country || 'Norway',
            preferredLanguage: preferredLanguage || 'no',
            gdprConsentAt: new Date(),
            touConsentAt: new Date(),
            reginorMarketingConsent,
            organizerMarketingConsent
        }

        if (userAccount.PersonProfile) {
            // Update existing profile
            await prisma.personProfile.update({
                where: { id: userAccount.PersonProfile.id },
                data: profileData
            })
        } else {
            // Create new profile
            await prisma.personProfile.create({
                data: {
                    id: randomUUID(),
                    ...profileData,
                    userId: userAccount.id,
                    updatedAt: new Date()
                }
            })
        }

        // Revalidate to update layout checks
        revalidatePath('/', 'layout')
        revalidatePath('/onboarding')

        return { success: true }
    } catch (error) {
        console.error('Onboarding error:', error)
        return { error: 'Failed to complete onboarding' }
    }
}
