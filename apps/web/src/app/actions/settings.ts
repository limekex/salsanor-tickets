'use server'

import { prisma } from '@/lib/db'
import { requireAdmin } from '@/utils/auth-admin'
import { PaymentProvider } from '@prisma/client'
import { revalidatePath } from 'next/cache'

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
        webhookSecret?: string
    }
) {
    await requireAdmin()

    // Simple upsert
    await prisma.paymentConfig.upsert({
        where: { provider },
        create: {
            provider,
            ...data,
            publishableKey: data.publishableKey?.trim(),
            secretKey: data.secretKey?.trim(),
            webhookSecret: data.webhookSecret?.trim()
        },
        update: {
            ...data,
            publishableKey: data.publishableKey?.trim(),
            secretKey: data.secretKey?.trim(),
            webhookSecret: data.webhookSecret?.trim()
        }
    })

    revalidatePath('/admin/settings/payments')
    return { success: true }
}
