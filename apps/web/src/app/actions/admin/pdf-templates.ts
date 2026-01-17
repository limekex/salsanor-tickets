'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/utils/auth-admin'
import { PdfTemplateType } from '@prisma/client'
import { randomUUID } from 'crypto'

export interface PdfTemplateData {
    name: string
    type: PdfTemplateType
    isDefault?: boolean
    isActive?: boolean
    // Header configuration
    headerConfig?: {
        showLogo?: boolean
        logoPosition?: 'left' | 'center' | 'right'
        headerText?: string
        backgroundColor?: string
    }
    // Body configuration  
    bodyConfig?: {
        showEventBox?: boolean
        boxBorderColor?: string
        boxBackgroundColor?: string
        fontFamily?: string
        fontSize?: number
    }
    // Footer configuration
    footerConfig?: {
        footerText?: string
        showPageNumbers?: boolean
    }
    // QR configuration
    qrConfig?: {
        size?: number
        position?: 'center' | 'bottom-left' | 'bottom-right'
        showInstructions?: boolean
        instructionText?: string
    }
    // Legal compliance toggles
    includeSellerInfo?: boolean
    includePlatformInfo?: boolean
    includeBuyerInfo?: boolean
    includeVatBreakdown?: boolean
    includePaymentInfo?: boolean
    includeTerms?: boolean
    // Custom text fields
    headerText?: string
    footerText?: string
    termsText?: string
}

export async function createPdfTemplate(data: PdfTemplateData) {
    await requireAdmin()

    // If this is marked as default, unset any existing default for this type
    if (data.isDefault) {
        await prisma.pdfTemplate.updateMany({
            where: {
                type: data.type,
                isDefault: true
            },
            data: {
                isDefault: false
            }
        })
    }

    const template = await prisma.pdfTemplate.create({
        data: {
            id: randomUUID(),
            name: data.name,
            type: data.type,
            isDefault: data.isDefault ?? false,
            isActive: data.isActive ?? true,
            headerConfig: data.headerConfig || {},
            bodyConfig: data.bodyConfig || {},
            footerConfig: data.footerConfig || {},
            qrConfig: data.qrConfig || {},
            includeSellerInfo: data.includeSellerInfo ?? true,
            includePlatformInfo: data.includePlatformInfo ?? true,
            includeBuyerInfo: data.includeBuyerInfo ?? true,
            includeVatBreakdown: data.includeVatBreakdown ?? true,
            includePaymentInfo: data.includePaymentInfo ?? true,
            includeTerms: data.includeTerms ?? false,
            headerText: data.headerText,
            footerText: data.footerText,
            termsText: data.termsText,
        }
    })

    revalidatePath('/admin/pdf-templates')
    return { success: true, template }
}

export async function updatePdfTemplate(id: string, data: Partial<PdfTemplateData>) {
    await requireAdmin()

    // If setting as default, unset existing defaults
    if (data.isDefault) {
        const existing = await prisma.pdfTemplate.findUnique({ where: { id } })
        if (existing) {
            await prisma.pdfTemplate.updateMany({
                where: {
                    type: existing.type,
                    isDefault: true,
                    NOT: { id }
                },
                data: {
                    isDefault: false
                }
            })
        }
    }

    const template = await prisma.pdfTemplate.update({
        where: { id },
        data: {
            ...(data.name && { name: data.name }),
            ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
            ...(data.isActive !== undefined && { isActive: data.isActive }),
            ...(data.headerConfig && { headerConfig: data.headerConfig }),
            ...(data.bodyConfig && { bodyConfig: data.bodyConfig }),
            ...(data.footerConfig && { footerConfig: data.footerConfig }),
            ...(data.qrConfig && { qrConfig: data.qrConfig }),
            ...(data.includeSellerInfo !== undefined && { includeSellerInfo: data.includeSellerInfo }),
            ...(data.includePlatformInfo !== undefined && { includePlatformInfo: data.includePlatformInfo }),
            ...(data.includeBuyerInfo !== undefined && { includeBuyerInfo: data.includeBuyerInfo }),
            ...(data.includeVatBreakdown !== undefined && { includeVatBreakdown: data.includeVatBreakdown }),
            ...(data.includePaymentInfo !== undefined && { includePaymentInfo: data.includePaymentInfo }),
            ...(data.includeTerms !== undefined && { includeTerms: data.includeTerms }),
            ...(data.headerText !== undefined && { headerText: data.headerText }),
            ...(data.footerText !== undefined && { footerText: data.footerText }),
            ...(data.termsText !== undefined && { termsText: data.termsText }),
        }
    })

    revalidatePath('/admin/pdf-templates')
    revalidatePath(`/admin/pdf-templates/${id}`)
    return { success: true, template }
}

export async function deletePdfTemplate(id: string) {
    await requireAdmin()

    await prisma.pdfTemplate.delete({
        where: { id }
    })

    revalidatePath('/admin/pdf-templates')
    return { success: true }
}

export async function getPdfTemplate(id: string) {
    await requireAdmin()

    return await prisma.pdfTemplate.findUnique({
        where: { id }
    })
}

export async function getDefaultPdfTemplate(type: PdfTemplateType) {
    // First try to find an active default template
    const defaultTemplate = await prisma.pdfTemplate.findFirst({
        where: {
            type,
            isDefault: true,
            isActive: true
        }
    })

    if (defaultTemplate) {
        return defaultTemplate
    }

    // Fall back to any active template of this type
    return await prisma.pdfTemplate.findFirst({
        where: {
            type,
            isActive: true
        }
    })
}

export async function duplicatePdfTemplate(id: string, newName: string) {
    await requireAdmin()

    const existing = await prisma.pdfTemplate.findUnique({
        where: { id }
    })

    if (!existing) {
        throw new Error('Template not found')
    }

    const template = await prisma.pdfTemplate.create({
        data: {
            id: randomUUID(),
            name: newName,
            type: existing.type,
            isDefault: false,
            isActive: true,
            headerConfig: existing.headerConfig || {},
            bodyConfig: existing.bodyConfig || {},
            footerConfig: existing.footerConfig || {},
            qrConfig: existing.qrConfig || {},
            includeSellerInfo: existing.includeSellerInfo,
            includePlatformInfo: existing.includePlatformInfo,
            includeBuyerInfo: existing.includeBuyerInfo,
            includeVatBreakdown: existing.includeVatBreakdown,
            includePaymentInfo: existing.includePaymentInfo,
            includeTerms: existing.includeTerms,
            headerText: existing.headerText,
            footerText: existing.footerText,
            termsText: existing.termsText,
        }
    })

    revalidatePath('/admin/pdf-templates')
    return { success: true, template }
}
