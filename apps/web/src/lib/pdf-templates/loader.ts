import { prisma } from '@/lib/db'
import { PdfTemplateType } from '@prisma/client'

/**
 * PDF Template configuration loaded from database
 */
export interface PdfTemplateConfig {
    id: string
    name: string
    type: PdfTemplateType
    
    // Color configuration
    primaryColor?: { r: number; g: number; b: number }
    secondaryColor?: { r: number; g: number; b: number }
    backgroundColor?: { r: number; g: number; b: number }
    textColor?: { r: number; g: number; b: number }
    
    // Layout configuration
    logoUrl?: string
    showHeader: boolean
    showFooter: boolean
    
    // QR code configuration
    qrConfig?: {
        size?: number
        position?: 'center' | 'top-right' | 'bottom-center'
    }
    
    // Compliance fields to include
    includeSellerInfo: boolean
    includePlatformInfo: boolean
    includeBuyerInfo: boolean
    includeVatBreakdown: boolean
    includePaymentInfo: boolean
    includeTerms: boolean
    
    // Custom text
    headerText?: string
    footerText?: string
    termsText?: string
}

/**
 * Load active PDF template for a specific type
 * Returns the default template or the first active template
 */
export async function loadPdfTemplate(type: PdfTemplateType): Promise<PdfTemplateConfig | null> {
    try {
        // Try to find the default active template
        const template = await prisma.pdfTemplate.findFirst({
            where: {
                type,
                isActive: true,
                isDefault: true
            }
        })
        
        // If no default, find any active template
        if (!template) {
            const anyActive = await prisma.pdfTemplate.findFirst({
                where: {
                    type,
                    isActive: true
                },
                orderBy: {
                    createdAt: 'desc'
                }
            })
            
            if (!anyActive) {
                return null
            }
            
            return convertTemplateToConfig(anyActive)
        }
        
        return convertTemplateToConfig(template)
    } catch (error) {
        console.error(`Error loading PDF template for type ${type}:`, error)
        return null
    }
}

/**
 * Convert database template to config object
 */
function convertTemplateToConfig(template: any): PdfTemplateConfig {
    // Parse colors from JSON
    const primaryColor = template.primaryColor ? parseColor(template.primaryColor) : undefined
    const secondaryColor = template.secondaryColor ? parseColor(template.secondaryColor) : undefined
    const backgroundColor = template.backgroundColor ? parseColor(template.backgroundColor) : undefined
    const textColor = template.textColor ? parseColor(template.textColor) : undefined
    
    // Parse QR config from JSON
    const qrConfig = template.qrConfig ? (typeof template.qrConfig === 'string' ? JSON.parse(template.qrConfig) : template.qrConfig) : undefined
    
    return {
        id: template.id,
        name: template.name,
        type: template.type,
        primaryColor,
        secondaryColor,
        backgroundColor,
        textColor,
        logoUrl: template.logoUrl || undefined,
        showHeader: template.showHeader ?? true,
        showFooter: template.showFooter ?? true,
        qrConfig,
        includeSellerInfo: template.includeSellerInfo ?? true,
        includePlatformInfo: template.includePlatformInfo ?? true,
        includeBuyerInfo: template.includeBuyerInfo ?? true,
        includeVatBreakdown: template.includeVatBreakdown ?? true,
        includePaymentInfo: template.includePaymentInfo ?? true,
        includeTerms: template.includeTerms ?? true,
        headerText: template.headerText || undefined,
        footerText: template.footerText || undefined,
        termsText: template.termsText || undefined,
    }
}

/**
 * Parse color from various formats to RGB object
 */
function parseColor(color: any): { r: number; g: number; b: number } | undefined {
    if (!color) return undefined
    
    // Already parsed object
    if (typeof color === 'object' && 'r' in color && 'g' in color && 'b' in color) {
        return {
            r: Number(color.r),
            g: Number(color.g),
            b: Number(color.b)
        }
    }
    
    // Hex color string
    if (typeof color === 'string' && color.startsWith('#')) {
        const hex = color.slice(1)
        if (hex.length === 6) {
            return {
                r: parseInt(hex.slice(0, 2), 16) / 255,
                g: parseInt(hex.slice(2, 4), 16) / 255,
                b: parseInt(hex.slice(4, 6), 16) / 255
            }
        }
    }
    
    return undefined
}

/**
 * Get default colors for a template type
 * Used as fallback when no template is configured
 */
export function getDefaultColors(type: PdfTemplateType): {
    primary: { r: number; g: number; b: number }
    secondary: { r: number; g: number; b: number }
} {
    switch (type) {
        case 'EVENT_TICKET':
            return {
                primary: { r: 0.96, g: 0.34, b: 0.42 }, // #f5576c
                secondary: { r: 0.4, g: 0.49, b: 0.92 } // #667eea
            }
        case 'COURSE_TICKET':
            return {
                primary: { r: 0.4, g: 0.49, b: 0.92 }, // #667eea
                secondary: { r: 0.46, g: 0.29, b: 0.64 } // #764ba2
            }
        case 'ORDER_RECEIPT':
            return {
                primary: { r: 0.13, g: 0.77, b: 0.25 }, // #22c55e
                secondary: { r: 0.10, g: 0.60, b: 0.56 } // #11998e
            }
        case 'INVOICE':
            return {
                primary: { r: 0.20, g: 0.47, b: 0.92 }, // #3478eb (blue)
                secondary: { r: 0.15, g: 0.35, b: 0.70 } // #2659b3
            }
        case 'MEMBERSHIP_CARD':
            return {
                primary: { r: 0.07, g: 0.60, b: 0.56 }, // #11998e
                secondary: { r: 0.22, g: 0.8, b: 0.71 } // #38ccb5
            }
        case 'CREDIT_NOTE':
            return {
                primary: { r: 0.93, g: 0.26, b: 0.26 }, // #ef4444
                secondary: { r: 0.60, g: 0.11, b: 0.11 } // #991b1b
            }
        default:
            return {
                primary: { r: 0.4, g: 0.49, b: 0.92 },
                secondary: { r: 0.3, g: 0.3, b: 0.3 }
            }
    }
}
