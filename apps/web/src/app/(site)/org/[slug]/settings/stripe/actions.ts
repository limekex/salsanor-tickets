'use server'

import { prisma } from '@/lib/db'
import { createClient } from '@/utils/supabase/server'
import Stripe from 'stripe'
import { revalidatePath } from 'next/cache'
import { requireOrganizerAccess } from '@/utils/auth-admin'

/**
 * Creates an embedded AccountSession for Stripe Connect onboarding or management
 * This returns a client secret that can be used with embedded components
 */
export async function createStripeEmbeddedSession(
    organizerId: string,
    type: 'onboarding' | 'management'
) {
    try {
        // Verify user has access
        await requireOrganizerAccess(organizerId)

        // Get payment config
        const paymentConfig = await prisma.paymentConfig.findUnique({
            where: { provider: 'STRIPE' },
        })

        if (!paymentConfig?.enabled || !paymentConfig?.useStripeConnect) {
            return {
                success: false,
                error: 'Stripe Connect is not enabled on this platform'
            }
        }

        // Get Stripe key from database or environment
        const stripeKey = paymentConfig.secretKey || process.env.STRIPE_SECRET_KEY

        if (!stripeKey) {
            return {
                success: false,
                error: 'Stripe secret key not configured'
            }
        }

        // Initialize Stripe
        const stripe = new Stripe(stripeKey, {
            apiVersion: '2024-11-20.acacia' as any,
        })

        // Get organizer
        const organizer = await prisma.organizer.findUnique({
            where: { id: organizerId },
            select: {
                id: true,
                name: true,
                slug: true,
                stripeConnectAccountId: true,
                contactEmail: true,
            }
        })

        if (!organizer) {
            return { success: false, error: 'Organizer not found' }
        }

        let accountId = organizer.stripeConnectAccountId

        // If no account exists, create one
        if (!accountId && type === 'onboarding') {
            const account = await stripe.accounts.create({
                type: 'standard',
                email: organizer.contactEmail || undefined,
                business_profile: {
                    name: organizer.name,
                },
                metadata: {
                    organizerId: organizer.id,
                    organizerSlug: organizer.slug,
                },
            })

            accountId = account.id

            // Save account ID
            await prisma.organizer.update({
                where: { id: organizerId },
                data: {
                    stripeConnectAccountId: account.id,
                }
            })
        }

        if (!accountId) {
            return {
                success: false,
                error: 'No Stripe account found. Please create one first.'
            }
        }

        // Create AccountSession for embedded components
        const components = type === 'onboarding' 
            ? { account_onboarding: { enabled: true } }
            : { account_management: { enabled: true } }

        const accountSession = await stripe.accountSessions.create({
            account: accountId,
            components,
        })

        return {
            success: true,
            clientSecret: accountSession.client_secret,
            accountId,
        }
    } catch (error) {
        console.error('Stripe embedded session error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'An error occurred'
        }
    }
}

/**
 * Legacy function for redirect-based flow (kept for backward compatibility)
 * Creates a Stripe Connect account link for onboarding or dashboard access
 */
export async function createStripeConnectLink(
    organizerId: string,
    action: 'connect' | 'dashboard' | 'complete'
) {
    try {
        // Get payment config
        const paymentConfig = await prisma.paymentConfig.findUnique({
            where: { provider: 'STRIPE' },
        })

        if (!paymentConfig?.enabled || !paymentConfig?.useStripeConnect) {
            return {
                success: false,
                error: 'Stripe Connect is not enabled on this platform'
            }
        }

        if (!paymentConfig.secretKey) {
            return {
                success: false,
                error: 'Stripe secret key not configured'
            }
        }

        // Initialize Stripe
        const stripe = new Stripe(paymentConfig.secretKey, {
            apiVersion: '2025-11-17.clover',
        })

        // Get organizer
        const organizer = await prisma.organizer.findUnique({
            where: { id: organizerId },
            select: {
                id: true,
                name: true,
                slug: true,
                stripeConnectAccountId: true,
                contactEmail: true,
                organizationNumber: true,
            }
        })

        if (!organizer) {
            return { success: false, error: 'Organizer not found' }
        }

        // Verify user has access to this organizer
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
            return { success: false, error: 'Not authenticated' }
        }

        // Check if user is admin or has access to this organizer
        const userAccount = await prisma.userAccount.findUnique({
            where: { supabaseUid: user.id },
            select: {
                roles: true,
                // TODO: Add organizer access check
            }
        })

        if (!userAccount?.roles?.some(r => r.role === 'ADMIN')) {
            // TODO: Also check if user is organizer admin
            return { success: false, error: 'Unauthorized' }
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const returnUrl = `${baseUrl}/org/${organizer.slug}/settings/stripe`
        const refreshUrl = `${baseUrl}/org/${organizer.slug}/settings/stripe`

        // If opening dashboard
        if (action === 'dashboard' && organizer.stripeConnectAccountId) {
            const loginLink = await stripe.accounts.createLoginLink(
                organizer.stripeConnectAccountId
            )
            return {
                success: true,
                url: loginLink.url
            }
        }

        // If creating new account
        if (action === 'connect' && !organizer.stripeConnectAccountId) {
            // Create Connected Account
            const account = await stripe.accounts.create({
                type: 'standard', // standard = full Stripe account, express = simpler
                email: organizer.contactEmail || undefined,
                business_profile: {
                    name: organizer.name,
                },
                metadata: {
                    organizerId: organizer.id,
                    organizerSlug: organizer.slug,
                },
            })

            // Save account ID
            await prisma.organizer.update({
                where: { id: organizerId },
                data: {
                    stripeConnectAccountId: account.id,
                }
            })

            // Create account link for onboarding
            const accountLink = await stripe.accountLinks.create({
                account: account.id,
                refresh_url: refreshUrl,
                return_url: returnUrl,
                type: 'account_onboarding',
            })

            return {
                success: true,
                url: accountLink.url
            }
        }

        // If completing onboarding
        if (action === 'complete' && organizer.stripeConnectAccountId) {
            const accountLink = await stripe.accountLinks.create({
                account: organizer.stripeConnectAccountId,
                refresh_url: refreshUrl,
                return_url: returnUrl,
                type: 'account_onboarding',
            })

            return {
                success: true,
                url: accountLink.url
            }
        }

        return {
            success: false,
            error: 'Invalid action or account state'
        }
    } catch (error) {
        console.error('Stripe Connect error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'An error occurred'
        }
    }
}

/**
 * Webhook handler to update organizer when Stripe account is updated
 * This should be called from your Stripe webhook endpoint
 */
export async function handleStripeConnectWebhook(event: Stripe.Event) {
    try {
        if (event.type === 'account.updated') {
            const account = event.data.object as Stripe.Account

            // Find organizer by Stripe account ID
            const organizer = await prisma.organizer.findFirst({
                where: {
                    stripeConnectAccountId: account.id
                }
            })

            if (organizer) {
                // Update organizer with account capabilities
                await prisma.organizer.update({
                    where: { id: organizer.id },
                    data: {
                        stripeOnboardingComplete: account.charges_enabled && account.details_submitted,
                        stripeChargesEnabled: account.charges_enabled || false,
                        stripePayoutsEnabled: account.payouts_enabled || false,
                    }
                })

                revalidatePath(`/org/${organizer.slug}/settings/stripe`)
            }
        }

        return { success: true }
    } catch (error) {
        console.error('Stripe webhook error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Webhook processing failed'
        }
    }
}
