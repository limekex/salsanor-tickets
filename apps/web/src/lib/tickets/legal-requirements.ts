/**
 * Norwegian Legal Requirements for Tickets and Receipts
 * 
 * According to Norwegian law (Bokføringsloven, Merverdiavgiftsloven), 
 * sales documentation must include:
 * 
 * 1. SELLER INFORMATION (Organizer):
 *    - Legal name (juridisk navn)
 *    - Organization number (organisasjonsnummer)
 *    - Address (forretningsadresse)
 *    - Contact information
 *    - VAT registration number if applicable (MVA-nummer)
 * 
 * 2. PLATFORM INFORMATION (as agent/utsender):
 *    - Platform legal name
 *    - Platform organization number
 *    - Statement that platform acts as agent
 * 
 * 3. BUYER INFORMATION:
 *    - Name
 *    - Email (for electronic receipts)
 * 
 * 4. TRANSACTION DETAILS:
 *    - Unique document number (ordre/billett nummer)
 *    - Date and time of transaction
 *    - Description of goods/services
 *    - Quantity
 *    - Unit price
 *    - Total amount
 * 
 * 5. VAT BREAKDOWN (if seller is VAT-registered):
 *    - Net amount (grunnlag for MVA)
 *    - VAT rate (MVA-sats)
 *    - VAT amount (MVA-beløp)
 *    - Gross amount (totalbeløp inkl. MVA)
 *    - Statement "Priser inkluderer MVA" if prices are VAT-inclusive
 * 
 * 6. PAYMENT INFORMATION:
 *    - Payment method
 *    - Payment date
 *    - Transaction reference
 */

export interface SellerInfo {
    legalName: string
    organizationNumber?: string
    address?: {
        street?: string
        postalCode?: string
        city?: string
        country?: string
    }
    contactEmail?: string
    vatRegistered: boolean
    vatNumber?: string  // Format: "NO 123 456 789 MVA"
    logoUrl?: string    // URL to organizer's logo
}

export interface PlatformInfo {
    name: string
    legalName: string
    organizationNumber: string
    website: string
    supportEmail: string
    logoUrl?: string    // URL to platform's logo
}

export interface BuyerInfo {
    name: string
    email: string
    address?: {
        street?: string
        postalCode?: string
        city?: string
    }
}

export interface TransactionInfo {
    orderNumber: string
    ticketNumber?: string  // For individual tickets in multi-ticket orders
    transactionDate: Date
    paymentMethod?: string
    paymentDate?: Date
    stripePaymentId?: string
}

export interface VatBreakdown {
    netAmountCents: number      // Amount before VAT
    vatRate: number             // e.g., 25 for 25%
    vatAmountCents: number      // VAT amount
    grossAmountCents: number    // Total including VAT
    pricesIncludeVat: boolean   // True if entered prices already include VAT
}

export interface TicketLineItem {
    description: string
    quantity: number
    unitPriceCents: number
    totalPriceCents: number
}

// Default platform info - reads from environment variables or falls back to defaults
// Configure via: PLATFORM_NAME, PLATFORM_LEGAL_NAME, PLATFORM_ORG_NUMBER, 
// PLATFORM_WEBSITE, PLATFORM_SUPPORT_EMAIL, PLATFORM_LOGO_URL
export const DEFAULT_PLATFORM_INFO: PlatformInfo = {
    name: process.env.PLATFORM_NAME || process.env.NEXT_PUBLIC_PLATFORM_NAME || 'RegiNor',
    legalName: process.env.PLATFORM_LEGAL_NAME || process.env.NEXT_PUBLIC_PLATFORM_LEGAL_NAME || 'RegiNor AS',
    organizationNumber: process.env.PLATFORM_ORG_NUMBER || process.env.NEXT_PUBLIC_PLATFORM_ORG_NUMBER || '000 000 000',
    website: process.env.PLATFORM_WEBSITE || process.env.NEXT_PUBLIC_PLATFORM_WEBSITE || 'https://reginor.no',
    supportEmail: process.env.PLATFORM_SUPPORT_EMAIL || process.env.NEXT_PUBLIC_PLATFORM_SUPPORT_EMAIL || 'support@reginor.no',
    logoUrl: process.env.PLATFORM_LOGO_URL || process.env.NEXT_PUBLIC_PLATFORM_LOGO_URL || undefined
}

/**
 * Format Norwegian organization number
 * Input: "123456789" -> Output: "123 456 789"
 */
export function formatOrgNumber(orgNumber: string | null | undefined): string {
    if (!orgNumber) return ''
    const cleaned = orgNumber.replace(/\s/g, '')
    if (cleaned.length !== 9) return orgNumber
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)}`
}

/**
 * Format VAT number for Norway
 * Input: "123456789" -> Output: "NO 123 456 789 MVA"
 */
export function formatVatNumber(orgNumber: string | null | undefined): string {
    if (!orgNumber) return ''
    const formatted = formatOrgNumber(orgNumber)
    return `NO ${formatted} MVA`
}

/**
 * Format amount in NOK
 */
export function formatNOK(cents: number): string {
    const amount = cents / 100
    return new Intl.NumberFormat('nb-NO', {
        style: 'currency',
        currency: 'NOK',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(amount)
}

/**
 * Format date in Norwegian format
 */
export function formatDateNO(date: Date | undefined | null): string {
    if (!date) {
        return 'Dato ikke satt'
    }
    // Ensure it's a Date object
    const dateObj = date instanceof Date ? date : new Date(date)
    return dateObj.toLocaleDateString('nb-NO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })
}

/**
 * Format datetime in Norwegian format
 */
export function formatDateTimeNO(date: Date): string {
    return date.toLocaleString('nb-NO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}
