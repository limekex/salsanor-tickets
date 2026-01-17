'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { createClient } from '@/utils/supabase/server'
import { PdfTemplateType } from '@prisma/client'

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
      UserAccountRole: {
        where: {
          OR: [
            { role: 'ADMIN' },
            { role: 'ORG_ADMIN' }
          ]
        }
      }
    }
  })

  if (!userAccount || userAccount.UserAccountRole.length === 0) {
    throw new Error('Unauthorized: Admin access required')
  }

  // For now, return global templates
  // TODO: Filter by organization when implementing org-specific templates
  const templates = await prisma.emailTemplate.findMany({
    where: { organizerId: null },
    include: {
      pdfAttachments: {
        orderBy: { sortOrder: 'asc' }
      }
    },
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
    pdfAttachments: t.pdfAttachments.map(a => ({
      id: a.id,
      pdfTemplateType: a.pdfTemplateType,
      isRequired: a.isRequired,
      sortOrder: a.sortOrder
    }))
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
      UserAccountRole: {
        where: {
          OR: [
            { role: 'ADMIN' },
            { role: 'ORG_ADMIN' }
          ]
        }
      }
    }
  })

  if (!userAccount || userAccount.UserAccountRole.length === 0) {
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

// PDF Attachment functions
export async function getEmailPdfAttachments(emailTemplateId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Not authenticated')
  }

  const attachments = await prisma.emailPdfAttachment.findMany({
    where: { emailTemplateId },
    orderBy: { sortOrder: 'asc' }
  })

  return attachments.map(a => ({
    id: a.id,
    pdfTemplateType: a.pdfTemplateType,
    isRequired: a.isRequired,
    sortOrder: a.sortOrder
  }))
}

export async function addEmailPdfAttachment(
  emailTemplateId: string,
  pdfTemplateType: PdfTemplateType,
  isRequired: boolean = true
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
      UserAccountRole: {
        where: {
          OR: [
            { role: 'ADMIN' },
            { role: 'ORG_ADMIN' }
          ]
        }
      }
    }
  })

  if (!userAccount || userAccount.UserAccountRole.length === 0) {
    throw new Error('Unauthorized: Admin access required')
  }

  // Check if attachment already exists
  const existing = await prisma.emailPdfAttachment.findFirst({
    where: { emailTemplateId, pdfTemplateType }
  })

  if (existing) {
    throw new Error('This PDF type is already attached to this template')
  }

  // Get next sort order
  const lastAttachment = await prisma.emailPdfAttachment.findFirst({
    where: { emailTemplateId },
    orderBy: { sortOrder: 'desc' }
  })
  const nextSortOrder = (lastAttachment?.sortOrder ?? -1) + 1

  await prisma.emailPdfAttachment.create({
    data: {
      emailTemplateId,
      pdfTemplateType,
      isRequired,
      sortOrder: nextSortOrder
    }
  })

  revalidatePath('/admin/email/templates')
  return { success: true }
}

export async function updateEmailPdfAttachment(
  attachmentId: string,
  data: {
    isRequired?: boolean
    sortOrder?: number
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
      UserAccountRole: {
        where: {
          OR: [
            { role: 'ADMIN' },
            { role: 'ORG_ADMIN' }
          ]
        }
      }
    }
  })

  if (!userAccount || userAccount.UserAccountRole.length === 0) {
    throw new Error('Unauthorized: Admin access required')
  }

  await prisma.emailPdfAttachment.update({
    where: { id: attachmentId },
    data
  })

  revalidatePath('/admin/email/templates')
  return { success: true }
}

export async function deleteEmailPdfAttachment(attachmentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Not authenticated')
  }

  // Verify admin access
  const userAccount = await prisma.userAccount.findUnique({
    where: { supabaseUid: user.id },
    include: {
      UserAccountRole: {
        where: {
          OR: [
            { role: 'ADMIN' },
            { role: 'ORG_ADMIN' }
          ]
        }
      }
    }
  })

  if (!userAccount || userAccount.UserAccountRole.length === 0) {
    throw new Error('Unauthorized: Admin access required')
  }

  await prisma.emailPdfAttachment.delete({
    where: { id: attachmentId }
  })

  revalidatePath('/admin/email/templates')
  return { success: true }
}
