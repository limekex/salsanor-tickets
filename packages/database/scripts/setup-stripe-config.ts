/**
 * Script to create a default PaymentConfig entry for Stripe
 * Run this if your Stripe configuration was lost after migration
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Creating default Stripe PaymentConfig...')
    
    // Check if it already exists
    const existing = await prisma.paymentConfig.findUnique({
        where: { provider: 'STRIPE' }
    })
    
    if (existing) {
        console.log('✅ Stripe PaymentConfig already exists')
        console.log({
            enabled: existing.enabled,
            isTest: existing.isTest,
            hasSecretKey: !!existing.secretKey,
            hasPublishableKey: !!existing.publishableKey,
            hasWebhookSecret: !!existing.webhookSecret
        })
        return
    }
    
    // Create default config
    const config = await prisma.paymentConfig.create({
        data: {
            provider: 'STRIPE',
            enabled: false, // Disabled by default, admin needs to configure
            isTest: true,   // Start in test mode
            secretKey: null,
            publishableKey: null,
            webhookSecret: null
        }
    })
    
    console.log('✅ Created default Stripe PaymentConfig:')
    console.log({
        id: config.id,
        provider: config.provider,
        enabled: config.enabled,
        isTest: config.isTest
    })
    console.log('\n⚠️  Remember to configure your Stripe API keys in /admin/settings/payments')
}

main()
    .catch((e) => {
        console.error('❌ Error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
