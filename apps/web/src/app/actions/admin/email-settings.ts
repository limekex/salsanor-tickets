'use server'

import { requireAdmin } from '@/utils/auth-admin'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function getGlobalEmailSettings() {
  await requireAdmin()
  
  const settings = await prisma.emailSettings.findFirst({
    where: { organizerId: null },
  })
  
  return settings
}

export async function saveGlobalEmailSettings(data: {
  fromName: string
  fromEmail: string
  replyToEmail: string
  primaryLanguage: string
  enableLogo?: boolean
  enableSignature?: boolean
  signatureHtml?: string
}) {
  await requireAdmin()
  
  // Find existing global settings
  const existing = await prisma.emailSettings.findFirst({
    where: { organizerId: null },
  })
  
  let settings
  if (existing) {
    // Update existing
    settings = await prisma.emailSettings.update({
      where: { id: existing.id },
      data: {
        fromName: data.fromName,
        fromEmail: data.fromEmail,
        replyToEmail: data.replyToEmail,
        primaryLanguage: data.primaryLanguage,
        enableLogo: data.enableLogo ?? true,
        enableSignature: data.enableSignature ?? true,
        signatureHtml: data.signatureHtml || null,
      },
    })
  } else {
    // Create new
    settings = await prisma.emailSettings.create({
      data: {
        organizerId: null,
        fromName: data.fromName,
        fromEmail: data.fromEmail,
        replyToEmail: data.replyToEmail,
        primaryLanguage: data.primaryLanguage,
        enableLogo: data.enableLogo ?? true,
        enableSignature: data.enableSignature ?? true,
        signatureHtml: data.signatureHtml || null,
      },
    })
  }
  
  revalidatePath('/admin/email')
  return settings
}

export async function getEmailProvider() {
  await requireAdmin()
  
  const provider = await prisma.emailProvider.findFirst({
    where: { isActive: true },
  })
  
  // Don't expose the API key
  if (provider) {
    return {
      ...provider,
      apiKey: provider.apiKey ? '••••••••' : null,
    }
  }
  
  return null
}

export async function saveEmailProvider(data: {
  provider: string
  apiKey?: string
  smtpHost?: string
  smtpPort?: number
  smtpUsername?: string
  smtpPassword?: string
}) {
  await requireAdmin()
  
  // Get existing provider to check if we need to keep the old API key
  const existingProvider = await prisma.emailProvider.findFirst({
    where: { isActive: true },
  })
  
  // Deactivate all existing providers
  await prisma.emailProvider.updateMany({
    data: { isActive: false },
  })
  
  // Determine which API key to use:
  // 1. If new key is provided, use it
  // 2. If no new key and existing provider has one, keep it
  // 3. Otherwise null
  const apiKeyToUse = data.apiKey || existingProvider?.apiKey || null
  
  // Create new provider
  const provider = await prisma.emailProvider.create({
    data: {
      provider: data.provider as any,
      apiKey: apiKeyToUse,
      smtpHost: data.smtpHost || null,
      smtpPort: data.smtpPort || null,
      smtpUsername: data.smtpUsername || null,
      smtpPassword: data.smtpPassword || null,
      isActive: true,
    },
  })
  
  revalidatePath('/admin/email')
  return provider
}

export async function sendTestEmail(recipientEmail: string) {
  await requireAdmin()
  
  const { emailService } = await import('@/lib/email/email-service')
  
  const result = await emailService.sendTransactional({
    templateSlug: 'test-email',
    recipientEmail,
    variables: {
      recipientName: 'Administrator',
      testMessage: 'This is a test email from RegiNor Platform',
      currentYear: new Date().getFullYear(),
    },
  })
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to send test email')
  }
  
  return result
}
