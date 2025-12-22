'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { createClient } from '@/utils/supabase/server'

export async function getEmailTemplates() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Not authenticated')
  }

  // Get user's admin access
  const userAccount = await prisma.userAccount.findUnique({
    where: { supabaseUid: user.id },
    include: {
      roles: {
        where: {
          OR: [
            { role: 'ADMIN' },
            { role: 'ORG_ADMIN' }
          ]
        }
      }
    }
  })

  if (!userAccount || userAccount.roles.length === 0) {
    throw new Error('Unauthorized: Admin access required')
  }

  // For now, return global templates
  // TODO: Filter by organization when implementing org-specific templates
  const templates = await prisma.emailTemplate.findMany({
    where: { organizerId: null },
    orderBy: [
      { category: 'asc' },
      { language: 'asc' },
      { slug: 'asc' }
    ]
  })

  return templates.map(t => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    category: t.category,
    language: t.language,
    subject: t.subject,
    preheader: t.preheader,
    htmlContent: t.htmlContent,
    textContent: t.textContent,
    variables: t.variables as Record<string, string>,
    isActive: t.isActive,
  }))
}

export async function updateEmailTemplate(
  templateId: string,
  data: {
    subject: string
    preheader?: string
    htmlContent: string
    textContent?: string
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Not authenticated')
  }

  // Verify admin access
  const userAccount = await prisma.userAccount.findUnique({
    where: { supabaseUid: user.id },
    include: {
      roles: {
        where: {
          OR: [
            { role: 'ADMIN' },
            { role: 'ORG_ADMIN' }
          ]
        }
      }
    }
  })

  if (!userAccount || userAccount.roles.length === 0) {
    throw new Error('Unauthorized: Admin access required')
  }

  await prisma.emailTemplate.update({
    where: { id: templateId },
    data: {
      subject: data.subject,
      preheader: data.preheader,
      htmlContent: data.htmlContent,
      textContent: data.textContent,
      updatedAt: new Date(),
    }
  })

  revalidatePath('/admin/email/templates')
  
  return { success: true }
}
