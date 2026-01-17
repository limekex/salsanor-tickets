'use server'

import { prisma } from '@/lib/db'
import { requireAdmin } from '@/utils/auth-admin'
import { PaymentProvider } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'

export async function getPaymentConfigs() {
    await requireAdmin()
    return await prisma.paymentConfig.findMany()
}

export async function updatePaymentConfig(
    provider: PaymentProvider,
    data: {
        enabled: boolean,
        isTest: boolean,
        publishableKey?: string,
        secretKey?: string,
        webhookSecret?: string,
        useStripeConnect?: boolean,
        platformAccountId?: string,
        platformFeePercent?: number,
        platformFeeFixed?: number
    }
) {
    await requireAdmin()

    // Trim string values
    const trimmedData = {
        ...data,
        publishableKey: data.publishableKey?.trim() || null,
        secretKey: data.secretKey?.trim() || null,
        webhookSecret: data.webhookSecret?.trim() || null,
        platformAccountId: data.platformAccountId?.trim() || null,
    }

    // Simple upsert
    await prisma.paymentConfig.upsert({
        where: { provider },
        create: {
            id: randomUUID(),
            provider,
            updatedAt: new Date(),
            ...trimmedData,
        },
        update: {
            updatedAt: new Date(),
            ...trimmedData,
        }
    })

    revalidatePath('/admin/settings/payments')
    return { success: true }
}
