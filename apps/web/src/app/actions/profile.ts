'use server'

import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function updateProfile(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
        return { error: 'Not authenticated' }
    }

    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: { PersonProfile: true }
    })

    if (!userAccount?.PersonProfile) {
        return { error: 'Profile not found' }
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
        await prisma.personProfile.update({
            where: { id: userAccount.PersonProfile.id },
            data: {
                firstName,
                lastName,
                phone: phone || null,
                streetAddress: streetAddress || null,
                postalCode: postalCode || null,
                city: city || null,
                country: country || 'Norway',
                preferredLanguage: preferredLanguage || 'no',
                reginorMarketingConsent,
                organizerMarketingConsent
            }
        })

        revalidatePath('/profile/settings')

        return { success: true }
    } catch (error) {
        console.error('Profile update error:', error)
        return { error: 'Failed to update profile' }
    }
}
