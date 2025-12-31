'use server'

import { prisma } from '@/lib/db'
import Stripe from 'stripe'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function createStripeEmbeddedSession(
    organizerId: string,
    type: 'onboarding' | 'management'
) {
    try {
        // Get Stripe key from database or environment
        const config = await prisma.paymentConfig.findUnique({
            where: { provider: 'STRIPE' }
        })

        const stripeKey = config?.secretKey || process.env.STRIPE_SECRET_KEY

        if (!stripeKey) {
            return {
                success: false,
                error: 'STRIPE_SECRET_KEY is not configured. Please set it in Admin Settings or environment variables.'
            }
        }

        const stripe = new Stripe(stripeKey, {
            apiVersion: '2025-11-17.clover'
        })

        // Auth check
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
            redirect('/auth/login')
        }

        // Check user has access to this organizer
        const userAccount = await prisma.userAccount.findUnique({
            where: { supabaseUid: user.id },
            include: {
                roles: {
                    where: {
                        organizerId,
                        role: { in: ['ADMIN', 'ORG_ADMIN', 'ORGANIZER'] }
                    }
                }
            }
        })

        if (!userAccount || userAccount.roles.length === 0) {
            return {
                success: false,
                error: 'Unauthorized'
            }
        }

        // Get organizer
        const organizer = await prisma.organizer.findUnique({
            where: { id: organizerId }
        })

        if (!organizer) {
            return {
                success: false,
                error: 'Organizer not found'
            }
        }

        let accountId = organizer.stripeConnectAccountId

        // Create Stripe account if it doesn't exist
        if (!accountId) {
            const account = await stripe.accounts.create({
                type: 'standard',
                country: 'NO',
                email: organizer.contactEmail || undefined,
                business_profile: {
                    name: organizer.name,
                    url: organizer.websiteUrl || undefined,
                },
                metadata: {
                    organizerId: organizer.id,
                    organizerName: organizer.name,
                }
            })

            accountId = account.id

            // Save account ID
            await prisma.organizer.update({
                where: { id: organizerId },
                data: { stripeConnectAccountId: accountId }
            })
        }

        // Create AccountSession
        const accountSession = await stripe.accountSessions.create({
            account: accountId,
            components: {
                [type === 'onboarding' ? 'account_onboarding' : 'account_management']: {
                    enabled: true,
                    features: type === 'management' ? {
                        external_account_collection: true,
                    } : undefined
                }
            }
        })

        return {
            success: true,
            clientSecret: accountSession.client_secret
        }
    } catch (error) {
        console.error('Error creating Stripe embedded session:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
    }
}
