import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont, PDFImage } from 'pdf-lib'
import { generateQRCodeBuffer } from './qr-generator'
import { loadPdfTemplate } from '@/lib/pdf-templates/loader'
import {
    SellerInfo,
    PlatformInfo,
    BuyerInfo,
    TransactionInfo,
    VatBreakdown,
    TicketLineItem,
    DEFAULT_PLATFORM_INFO,
    formatOrgNumber,
    formatVatNumber,
    formatNOK,
    formatDateNO,
    formatDateTimeNO
} from './legal-requirements'

// =============================================================================
// IMAGE LOADING HELPER
// =============================================================================

async function loadImageFromUrl(pdfDoc: PDFDocument, url: string): Promise<PDFImage | null> {
    try {
        const response = await fetch(url)
        if (!response.ok) return null
        
        const arrayBuffer = await response.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)
        
        // Detect image type from URL or content
        const isPng = url.toLowerCase().endsWith('.png') || uint8Array[0] === 0x89
        const isJpg = url.toLowerCase().endsWith('.jpg') || 
                      url.toLowerCase().endsWith('.jpeg') || 
                      (uint8Array[0] === 0xFF && uint8Array[1] === 0xD8)
        
        if (isPng) {
            return await pdfDoc.embedPng(uint8Array)
        } else if (isJpg) {
            return await pdfDoc.embedJpg(uint8Array)
        }
        
        // Try PNG first, then JPG
        try {
            return await pdfDoc.embedPng(uint8Array)
        } catch {
            try {
                return await pdfDoc.embedJpg(uint8Array)
            } catch {
                return null
            }
        }
    } catch (error) {
        console.error('Failed to load image from URL:', url, error)
        return null
    }
}

// =============================================================================
// DATA INTERFACES
// =============================================================================

export interface EventTicketData {
    ticketNumber: number
    totalTickets: number
    eventTitle: string
    eventDate: Date
    eventVenue?: string
    qrToken: string
    // Norwegian legal requirements
    seller: SellerInfo
    buyer: BuyerInfo
    transaction: TransactionInfo
    vat?: VatBreakdown
    lineItem: TicketLineItem
    platform?: PlatformInfo
    // Template customization
    headerTitle?: string  // Custom header (default: "BILLETT")
    footerText?: string  // Custom footer text
    includeQrCode?: boolean  // Whether to include QR code (default: true)
}

export interface CourseTicketData {
    periodName: string
    trackNames: string[]
    startDate: Date
    endDate: Date
    qrToken: string
    // Norwegian legal requirements
    seller: SellerInfo
    buyer: BuyerInfo
    transaction: TransactionInfo
    vat?: VatBreakdown
    lineItems: TicketLineItem[]
    platform?: PlatformInfo
    // Template customization
    headerTitle?: string  // Custom header (default: "KURSBEKREFTELSE")
    footerText?: string  // Custom footer text
    includeQrCode?: boolean  // Whether to include QR code (default: true)
}

export interface OrderReceiptData {
    headerTitle?: string  // Custom header (default: "KVITTERING")
    // Norwegian legal requirements
    seller: SellerInfo
    buyer: BuyerInfo
    transaction: TransactionInfo
    vat?: VatBreakdown
    lineItems: TicketLineItem[]
    platform?: PlatformInfo
    // Optional elements
    footerText?: string  // Custom footer text
    includeQrCode?: boolean
    qrToken?: string
}

export interface CreditNoteData {
    creditNumber: string
    issueDate: Date
    // Reference to original transaction
    originalOrderNumber?: string
    originalInvoiceNumber?: string
    originalTransactionDate?: Date
    // Refund details
    refundType: 'FULL' | 'PARTIAL' | 'NONE'
    refundPercentage: number  // 0-100
    reason: string
    // Amounts
    originalAmountCents: number
    refundAmountCents: number
    mvaCents: number
    totalCents: number  // Total credit amount
    // Line items being refunded
    lineItems: TicketLineItem[]
    // Norwegian legal requirements
    seller: SellerInfo
    buyer: BuyerInfo
    platform?: PlatformInfo
    footerText?: string  // Custom footer text
}

export interface InvoiceData {
    invoiceNumber: string
    invoiceDate: Date
    dueDate: Date
    // Reference to original order
    orderNumber?: string
    paidAt?: Date
    status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED'
    // Amounts
    subtotalCents: number
    mvaCents: number
    totalCents: number
    mvaRate: number  // 0-25 (percentage)
    // Line items
    lineItems: TicketLineItem[]
    // Norwegian legal requirements
    seller: SellerInfo
    buyer: BuyerInfo
    platform?: PlatformInfo
    vat?: VatBreakdown
    footerText?: string  // Custom footer text
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

interface DrawTextOptions {
    page: PDFPage
    text: string
    x: number
    y: number
    font: PDFFont
    size: number
    color?: { r: number; g: number; b: number }
    maxWidth?: number
}

function drawText(opts: DrawTextOptions): void {
    const color = opts.color || { r: 0, g: 0, b: 0 }
    opts.page.drawText(opts.text, {
        x: opts.x,
        y: opts.y,
        size: opts.size,
        font: opts.font,
        color: rgb(color.r, color.g, color.b),
        maxWidth: opts.maxWidth
    })
}

function drawCenteredText(
    page: PDFPage,
    text: string,
    y: number,
    font: PDFFont,
    size: number,
    color?: { r: number; g: number; b: number }
): void {
    const width = page.getSize().width
    const textWidth = font.widthOfTextAtSize(text, size)
    drawText({
        page,
        text,
        x: (width - textWidth) / 2,
        y,
        font,
        size,
        color
    })
}

// =============================================================================
// SELLER INFO SECTION (Organizer)
// =============================================================================

function drawSellerInfo(
    page: PDFPage,
    seller: SellerInfo,
    y: number,
    fonts: { regular: PDFFont; bold: PDFFont }
): number {
    const x = 50
    const gray = { r: 0.3, g: 0.3, b: 0.3 }
    const lineHeight = 14  // Increased line height for better readability
    
    drawText({ page, text: 'SELGER / ARRANGØR', x, y, font: fonts.bold, size: 9, color: gray })
    y -= 16
    
    drawText({ page, text: seller.legalName, x, y, font: fonts.bold, size: 10 })
    y -= lineHeight
    
    if (seller.organizationNumber) {
        drawText({ 
            page, 
            text: `Org.nr: ${formatOrgNumber(seller.organizationNumber)}`, 
            x, y, 
            font: fonts.regular, 
            size: 9, 
            color: gray 
        })
        y -= lineHeight
    }
    
    if (seller.address) {
        if (seller.address.street) {
            drawText({ page, text: seller.address.street, x, y, font: fonts.regular, size: 9, color: gray })
            y -= lineHeight
        }
        const cityLine = [seller.address.postalCode, seller.address.city].filter(Boolean).join(' ')
        if (cityLine) {
            drawText({ page, text: cityLine, x, y, font: fonts.regular, size: 9, color: gray })
            y -= lineHeight
        }
        if (seller.address.country && seller.address.country !== 'Norway') {
            drawText({ page, text: seller.address.country, x, y, font: fonts.regular, size: 9, color: gray })
            y -= lineHeight
        }
    }
    
    if (seller.contactEmail) {
        drawText({ page, text: seller.contactEmail, x, y, font: fonts.regular, size: 9, color: gray })
        y -= lineHeight
    }
    
    if (seller.vatRegistered && seller.organizationNumber) {
        drawText({ 
            page, 
            text: `MVA-nr: ${formatVatNumber(seller.organizationNumber)}`, 
            x, y, 
            font: fonts.regular, 
            size: 9, 
            color: gray 
        })
        y -= lineHeight
    }
    
    return y
}

// =============================================================================
// PLATFORM INFO SECTION (Agent)
// =============================================================================

function drawPlatformInfo(
    page: PDFPage,
    platform: PlatformInfo,
    y: number,
    fonts: { regular: PDFFont; bold: PDFFont },
    platformLogo?: PDFImage | null
): number {
    const x = 320
    const gray = { r: 0.3, g: 0.3, b: 0.3 }
    const lineHeight = 14  // Increased line height for better readability
    
    drawText({ page, text: 'FORMIDLER / AGENT', x, y, font: fonts.bold, size: 9, color: gray })
    y -= 16
    
    // Draw platform logo if available (maintaining aspect ratio)
    if (platformLogo) {
        const logoMaxHeight = 25
        const logoMaxWidth = 80
        const aspectRatio = platformLogo.width / platformLogo.height
        
        // Calculate dimensions maintaining aspect ratio
        let logoWidth = logoMaxWidth
        let logoHeight = logoWidth / aspectRatio
        
        if (logoHeight > logoMaxHeight) {
            logoHeight = logoMaxHeight
            logoWidth = logoHeight * aspectRatio
        }
        
        page.drawImage(platformLogo, {
            x: x,
            y: y - logoHeight + 8,
            width: logoWidth,
            height: logoHeight
        })
        y -= logoHeight + 4
        
        // Platform name under logo
        drawText({ page, text: platform.legalName, x, y, font: fonts.bold, size: 10 })
    } else {
        drawText({ page, text: platform.legalName, x, y, font: fonts.bold, size: 10 })
    }
    y -= lineHeight
    
    drawText({ 
        page, 
        text: `Org.nr: ${formatOrgNumber(platform.organizationNumber)}`, 
        x, y, 
        font: fonts.regular, 
        size: 9, 
        color: gray 
    })
    y -= lineHeight
    
    drawText({ page, text: platform.website, x, y, font: fonts.regular, size: 9, color: gray })
    y -= lineHeight
    
    drawText({ page, text: platform.supportEmail, x, y, font: fonts.regular, size: 9, color: gray })
    y -= lineHeight
    
    return y
}

// =============================================================================
// HEADER WITH ORGANIZER LOGO
// =============================================================================

function drawHeaderWithLogo(
    page: PDFPage,
    title: string,
    subtitle: string | null,
    y: number,
    fonts: { regular: PDFFont; bold: PDFFont },
    organizerLogo?: PDFImage | null
): number {
    
    // Draw organizer logo on the left if available
    if (organizerLogo) {
        const logoMaxHeight = 50
        const logoMaxWidth = 120
        const aspectRatio = organizerLogo.width / organizerLogo.height
        
        let logoWidth = logoMaxWidth
        let logoHeight = logoWidth / aspectRatio
        
        if (logoHeight > logoMaxHeight) {
            logoHeight = logoMaxHeight
            logoWidth = logoHeight * aspectRatio
        }
        
        page.drawImage(organizerLogo, {
            x: 50,
            y: y - logoHeight + 10,
            width: logoWidth,
            height: logoHeight
        })
    }
    
    // Draw title centered (or to the right if logo exists)
    drawCenteredText(page, title, y, fonts.bold, 28, { r: 0.1, g: 0.1, b: 0.1 })
    y -= 25
    
    if (subtitle) {
        drawCenteredText(page, subtitle, y, fonts.regular, 12, { r: 0.4, g: 0.4, b: 0.4 })
        y -= 25
    } else {
        y -= 10
    }
    
    return y
}

// =============================================================================
// BUYER INFO SECTION
// =============================================================================

function drawBuyerInfo(
    page: PDFPage,
    buyer: BuyerInfo,
    y: number,
    fonts: { regular: PDFFont; bold: PDFFont }
): number {
    const x = 50
    const gray = { r: 0.3, g: 0.3, b: 0.3 }
    const lineHeight = 14  // Increased line height for better readability
    
    drawText({ page, text: 'KJØPER', x, y, font: fonts.bold, size: 9, color: gray })
    y -= 16
    
    drawText({ page, text: buyer.name, x, y, font: fonts.bold, size: 10 })
    y -= lineHeight
    
    drawText({ page, text: buyer.email, x, y, font: fonts.regular, size: 9, color: gray })
    y -= lineHeight
    
    return y
}

// =============================================================================
// TRANSACTION INFO SECTION
// =============================================================================

function drawTransactionInfo(
    page: PDFPage,
    transaction: TransactionInfo,
    ticketNumber: number,
    totalTickets: number,
    y: number,
    fonts: { regular: PDFFont; bold: PDFFont }
): number {
    const x = 320
    const gray = { r: 0.3, g: 0.3, b: 0.3 }
    
    drawText({ page, text: 'TRANSAKSJON', x, y, font: fonts.bold, size: 9, color: gray })
    y -= 14
    
    drawText({ page, text: `Ordre: ${transaction.orderNumber}`, x, y, font: fonts.regular, size: 9 })
    y -= 11
    
    if (totalTickets > 1) {
        drawText({ 
            page, 
            text: `Billett: ${ticketNumber} av ${totalTickets}`, 
            x, y, 
            font: fonts.regular, 
            size: 9 
        })
        y -= 11
    }
    
    drawText({ 
        page, 
        text: `Dato: ${formatDateTimeNO(transaction.transactionDate)}`, 
        x, y, 
        font: fonts.regular, 
        size: 9, 
        color: gray 
    })
    y -= 11
    
    if (transaction.paymentMethod) {
        drawText({ 
            page, 
            text: `Betaling: ${transaction.paymentMethod}`, 
            x, y, 
            font: fonts.regular, 
            size: 9, 
            color: gray 
        })
        y -= 11
    }
    
    return y
}

// =============================================================================
// VAT BREAKDOWN SECTION
// =============================================================================

function drawVatBreakdown(
    page: PDFPage,
    vat: VatBreakdown,
    y: number,
    fonts: { regular: PDFFont; bold: PDFFont }
): number {
    const x = 50
    const gray = { r: 0.3, g: 0.3, b: 0.3 }
    const width = page.getSize().width
    
    // Draw separator line
    page.drawLine({
        start: { x: 50, y: y + 5 },
        end: { x: width - 50, y: y + 5 },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8)
    })
    y -= 15
    
    drawText({ page, text: 'MVA-SPESIFIKASJON', x, y, font: fonts.bold, size: 9, color: gray })
    y -= 14
    
    // Net amount
    drawText({ page, text: 'Grunnlag for MVA:', x, y, font: fonts.regular, size: 9 })
    drawText({ 
        page, 
        text: formatNOK(vat.netAmountCents), 
        x: 200, y, 
        font: fonts.regular, 
        size: 9 
    })
    y -= 11
    
    // VAT amount
    drawText({ page, text: `MVA (${vat.vatRate}%):`, x, y, font: fonts.regular, size: 9 })
    drawText({ 
        page, 
        text: formatNOK(vat.vatAmountCents), 
        x: 200, y, 
        font: fonts.regular, 
        size: 9 
    })
    y -= 11
    
    // Total
    drawText({ page, text: 'Totalbeløp inkl. MVA:', x, y, font: fonts.bold, size: 9 })
    drawText({ 
        page, 
        text: formatNOK(vat.grossAmountCents), 
        x: 200, y, 
        font: fonts.bold, 
        size: 9 
    })
    y -= 11
    
    if (vat.pricesIncludeVat) {
        drawText({ 
            page, 
            text: 'Priser er oppgitt inklusiv MVA', 
            x, y, 
            font: fonts.regular, 
            size: 8, 
            color: gray 
        })
        y -= 10
    }
    
    return y
}

// =============================================================================
// QR CODE SECTION
// =============================================================================

async function drawQRCode(
    pdfDoc: PDFDocument,
    page: PDFPage,
    qrToken: string,
    y: number,
    fonts: { regular: PDFFont }
): Promise<number> {
    const width = page.getSize().width
    const qrBuffer = await generateQRCodeBuffer(qrToken)
    const qrImage = await pdfDoc.embedPng(qrBuffer)
    const qrSize = 150
    const qrX = (width - qrSize) / 2
    
    page.drawImage(qrImage, {
        x: qrX,
        y: y - qrSize,
        width: qrSize,
        height: qrSize
    })
    y -= qrSize + 15
    
    drawCenteredText(
        page,
        'Skann QR-koden ved innsjekk',
        y,
        fonts.regular,
        10,
        { r: 0.4, g: 0.4, b: 0.4 }
    )
    
    return y - 20
}

// =============================================================================
// FOOTER SECTION
// =============================================================================

function drawFooter(
    page: PDFPage,
    fonts: { regular: PDFFont },
    footerText?: string
): void {
    const y = 40
    const gray = { r: 0.5, g: 0.5, b: 0.5 }
    
    if (footerText) {
        // Use custom footer text - split into lines if needed
        const lines = footerText.split('\n')
        lines.forEach((line, index) => {
            drawCenteredText(
                page,
                line,
                y - (index * 10),
                fonts.regular,
                8,
                gray
            )
        })
    } else {
        // Default footer text
        drawCenteredText(
            page,
            'Denne billetten er personlig og kan ikke overdras.',
            y,
            fonts.regular,
            8,
            gray
        )
        
        drawCenteredText(
            page,
            'Ved spørsmål, kontakt arrangøren direkte.',
            y - 10,
            fonts.regular,
            8,
            gray
        )
    }
}

// =============================================================================
// EVENT TICKET PDF GENERATOR
// =============================================================================

export async function generateEventTicketPDF(data: EventTicketData): Promise<Buffer> {
    // Load PDF template configuration
    const template = await loadPdfTemplate('EVENT_TICKET')
    
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595, 842]) // A4
    
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const fonts = { regular: helvetica, bold: helveticaBold }
    
    const { width, height } = page.getSize()
    const platform = data.platform || DEFAULT_PLATFORM_INFO
    let y = height - 50

    // ==========================================================================
    // LOAD LOGOS
    // ==========================================================================
    
    // Use template logo if available, otherwise organizer logo
    const organizerLogoUrl = template?.logoUrl || data.seller.logoUrl
    const organizerLogo = organizerLogoUrl
        ? await loadImageFromUrl(pdfDoc, organizerLogoUrl) 
        : null
    const platformLogo = (template?.includePlatformInfo !== false) && platform.logoUrl 
        ? await loadImageFromUrl(pdfDoc, platform.logoUrl) 
        : null

    // ==========================================================================
    // HEADER WITH ORGANIZER LOGO
    // ==========================================================================
    
    const headerTitle = template?.headerText || data.headerTitle || 'BILLETT'
    const subtitle = data.totalTickets > 1 
        ? `Billett ${data.ticketNumber} av ${data.totalTickets}` 
        : null
    y = template?.showHeader !== false 
        ? drawHeaderWithLogo(page, headerTitle, subtitle, y, fonts, organizerLogo)
        : y

    // ==========================================================================
    // SELLER & PLATFORM INFO (side by side)
    // ==========================================================================
    
    if (template?.includeSellerInfo !== false || template?.includePlatformInfo !== false) {
        const infoStartY = y
        if (template?.includeSellerInfo !== false) {
            drawSellerInfo(page, data.seller, y, fonts)
        }
        if (template?.includePlatformInfo !== false) {
            drawPlatformInfo(page, platform, infoStartY, fonts, platformLogo)
        }
        y -= 110  // Increased spacing to accommodate logo and more line height
    }
    
    // ==========================================================================
    // BUYER & TRANSACTION INFO (side by side)
    // ==========================================================================
    
    if (template?.includeBuyerInfo !== false || template?.includePaymentInfo !== false) {
        const buyerStartY = y
        if (template?.includeBuyerInfo !== false) {
            drawBuyerInfo(page, data.buyer, y, fonts)
        }
        if (template?.includePaymentInfo !== false) {
            drawTransactionInfo(page, data.transaction, data.ticketNumber, data.totalTickets, buyerStartY, fonts)
        }
        y -= 75  // Increased spacing for more line height
    }

    // ==========================================================================
    // EVENT DETAILS BOX
    // ==========================================================================
    
    const boxX = 50
    const boxWidth = width - 100
    const boxHeight = 120
    const boxY = y - boxHeight
    
    page.drawRectangle({
        x: boxX,
        y: boxY,
        width: boxWidth,
        height: boxHeight,
        borderColor: rgb(0.2, 0.5, 0.8),
        borderWidth: 2,
        color: rgb(0.95, 0.97, 1)
    })
    
    let textY = y - 20
    
    drawText({ 
        page, 
        text: data.eventTitle, 
        x: boxX + 15, 
        y: textY, 
        font: helveticaBold, 
        size: 16,
        maxWidth: boxWidth - 30
    })
    textY -= 25
    
    const dateStr = formatDateNO(data.eventDate)
    const timeStr = data.eventDate.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })
    
    drawText({ 
        page, 
        text: `Dato: ${dateStr} kl. ${timeStr}`, 
        x: boxX + 15, 
        y: textY, 
        font: helvetica, 
        size: 11,
        color: { r: 0.2, g: 0.2, b: 0.2 }
    })
    textY -= 16
    
    if (data.eventVenue) {
        drawText({ 
            page, 
            text: `Sted: ${data.eventVenue}`, 
            x: boxX + 15, 
            y: textY, 
            font: helvetica, 
            size: 11,
            color: { r: 0.2, g: 0.2, b: 0.2 }
        })
        textY -= 16
    }
    
    // Price info
    drawText({ 
        page, 
        text: `Pris: ${formatNOK(data.lineItem.totalPriceCents)}`, 
        x: boxX + 15, 
        y: textY, 
        font: helveticaBold, 
        size: 11
    })
    
    y = boxY - 20

    // ==========================================================================
    // VAT BREAKDOWN (if applicable)
    // ==========================================================================
    
    if (data.vat && data.seller.vatRegistered) {
        y = drawVatBreakdown(page, data.vat, y, fonts)
    }
    
    y -= 20

    // ==========================================================================
    // QR CODE (optional)
    // ==========================================================================
    
    const includeQr = data.includeQrCode !== false  // Default to true
    if (includeQr) {
        y = await drawQRCode(pdfDoc, page, data.qrToken, y, fonts)
    }

    // ==========================================================================
    // FOOTER
    // ==========================================================================
    
    drawFooter(page, fonts, data.footerText)

    const pdfBytes = await pdfDoc.save()
    return Buffer.from(pdfBytes)
}

// =============================================================================
// COURSE TICKET PDF GENERATOR
// =============================================================================

export async function generateCourseTicketPDF(data: CourseTicketData): Promise<Buffer> {
    // Load PDF template configuration
    const template = await loadPdfTemplate('COURSE_TICKET')
    
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595, 842]) // A4
    
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const fonts = { regular: helvetica, bold: helveticaBold }
    
    const { width, height } = page.getSize()
    const platform = data.platform || DEFAULT_PLATFORM_INFO
    let y = height - 50

    // Load logos
    const organizerLogoUrl = template?.logoUrl || data.seller.logoUrl
    const organizerLogo = organizerLogoUrl
        ? await loadImageFromUrl(pdfDoc, organizerLogoUrl) 
        : null
    const platformLogo = (template?.includePlatformInfo !== false) && platform.logoUrl 
        ? await loadImageFromUrl(pdfDoc, platform.logoUrl) 
        : null

    // Header with logo
    const headerTitle = template?.headerText || data.headerTitle || 'KURSBEKREFTELSE'
    y = template?.showHeader !== false 
        ? drawHeaderWithLogo(page, headerTitle, null, y, fonts, organizerLogo)
        : y

    // Seller & Platform info
    if (template?.includeSellerInfo !== false || template?.includePlatformInfo !== false) {
        const infoStartY = y
        if (template?.includeSellerInfo !== false) {
            drawSellerInfo(page, data.seller, y, fonts)
        }
        if (template?.includePlatformInfo !== false) {
            drawPlatformInfo(page, platform, infoStartY, fonts, platformLogo)
        }
        y -= 110  // Increased spacing to accommodate logo and more line height
    }
    
    // Buyer & Transaction info
    if (template?.includeBuyerInfo !== false || template?.includePaymentInfo !== false) {
        const buyerStartY = y
        if (template?.includeBuyerInfo !== false) {
            drawBuyerInfo(page, data.buyer, y, fonts)
        }
        if (template?.includePaymentInfo !== false) {
            drawTransactionInfo(page, data.transaction, 1, 1, buyerStartY, fonts)
        }
        y -= 75  // Increased spacing for more line height
    }

    // Course Details Box
    const boxX = 50
    const boxWidth = width - 100
    const boxHeight = 140 + (data.trackNames.length * 14)
    const boxY = y - boxHeight
    
    page.drawRectangle({
        x: boxX,
        y: boxY,
        width: boxWidth,
        height: boxHeight,
        borderColor: rgb(0.2, 0.6, 0.4),
        borderWidth: 2,
        color: rgb(0.95, 1, 0.97)
    })
    
    let textY = y - 20
    
    drawText({ 
        page, 
        text: data.periodName, 
        x: boxX + 15, 
        y: textY, 
        font: helveticaBold, 
        size: 16,
        maxWidth: boxWidth - 30
    })
    textY -= 25
    
    drawText({ 
        page, 
        text: 'Kurs:', 
        x: boxX + 15, 
        y: textY, 
        font: helveticaBold, 
        size: 11
    })
    textY -= 14
    
    for (const track of data.trackNames) {
        drawText({ 
            page, 
            text: `  • ${track}`, 
            x: boxX + 15, 
            y: textY, 
            font: helvetica, 
            size: 10,
            color: { r: 0.2, g: 0.2, b: 0.2 }
        })
        textY -= 14
    }
    
    textY -= 5
    
    drawText({ 
        page, 
        text: `Periode: ${formatDateNO(data.startDate)} - ${formatDateNO(data.endDate)}`, 
        x: boxX + 15, 
        y: textY, 
        font: helvetica, 
        size: 11,
        color: { r: 0.2, g: 0.2, b: 0.2 }
    })
    textY -= 20
    
    // Total price
    const totalCents = data.lineItems.reduce((sum, item) => sum + item.totalPriceCents, 0)
    drawText({ 
        page, 
        text: `Totalt: ${formatNOK(totalCents)}`, 
        x: boxX + 15, 
        y: textY, 
        font: helveticaBold, 
        size: 11
    })
    
    y = boxY - 20

    // VAT Breakdown
    if (data.vat && data.seller.vatRegistered) {
        y = drawVatBreakdown(page, data.vat, y, fonts)
    }
    
    y -= 20

    // QR Code (optional)
    const includeQr = data.includeQrCode !== false  // Default to true
    if (includeQr) {
        y = await drawQRCode(pdfDoc, page, data.qrToken, y, fonts)
    }

    // Footer
    drawFooter(page, fonts, data.footerText)

    const pdfBytes = await pdfDoc.save()
    return Buffer.from(pdfBytes)
}

// =============================================================================
// ORDER RECEIPT PDF GENERATOR
// =============================================================================

/**
 * Generate an order receipt PDF (no QR code by default)
 * Used for order confirmations and purchase receipts
 */
export async function generateOrderReceiptPDF(data: OrderReceiptData): Promise<Buffer> {
    // Load PDF template configuration
    const template = await loadPdfTemplate('ORDER_RECEIPT')
    
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595, 842]) // A4
    
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const fonts = { regular: helvetica, bold: helveticaBold }
    
    const { width, height } = page.getSize()
    const platform = data.platform || DEFAULT_PLATFORM_INFO
    let y = height - 50

    // ==========================================================================
    // LOAD LOGOS
    // ==========================================================================
    
    // Use template logo if available, otherwise organizer logo
    const organizerLogoUrl = template?.logoUrl || data.seller.logoUrl
    const organizerLogo = organizerLogoUrl
        ? await loadImageFromUrl(pdfDoc, organizerLogoUrl) 
        : null
    const platformLogo = (template?.includePlatformInfo !== false) && platform.logoUrl 
        ? await loadImageFromUrl(pdfDoc, platform.logoUrl) 
        : null

    // ==========================================================================
    // HEADER
    // ==========================================================================
    
    const headerTitle = template?.headerText || data.headerTitle || 'KVITTERING'
    y = template?.showHeader !== false 
        ? drawHeaderWithLogo(page, headerTitle, null, y, fonts, organizerLogo)
        : y

    // ==========================================================================
    // SELLER & PLATFORM INFO (side by side)
    // ==========================================================================
    
    if (template?.includeSellerInfo !== false || template?.includePlatformInfo !== false) {
        const infoStartY = y
        if (template?.includeSellerInfo !== false) {
            drawSellerInfo(page, data.seller, y, fonts)
        }
        if (template?.includePlatformInfo !== false) {
            drawPlatformInfo(page, platform, infoStartY, fonts, platformLogo)
        }
        y -= 110
    }

    // ==========================================================================
    // BUYER & TRANSACTION INFO (side by side)
    // ==========================================================================
    
    if (template?.includeBuyerInfo !== false || template?.includePaymentInfo !== false) {
        const buyerStartY = y
        if (template?.includeBuyerInfo !== false) {
            drawBuyerInfo(page, data.buyer, y, fonts)
        }
        if (template?.includePaymentInfo !== false) {
            drawTransactionInfo(page, data.transaction, 1, 1, buyerStartY, fonts)
        }
        y -= 75
    }

    // ==========================================================================
    // LINE ITEMS BOX
    // ==========================================================================
    
    const boxX = 50
    const boxWidth = width - 100
    const lineItemHeight = 20
    const boxHeight = 60 + (data.lineItems.length * lineItemHeight)
    const boxY = y - boxHeight
    
    page.drawRectangle({
        x: boxX,
        y: boxY,
        width: boxWidth,
        height: boxHeight,
        borderColor: rgb(0.3, 0.3, 0.3),
        borderWidth: 1,
        color: rgb(0.98, 0.98, 0.98)
    })
    
    let textY = y - 20
    
    // Header row
    drawText({ 
        page, 
        text: 'Beskrivelse', 
        x: boxX + 15, 
        y: textY, 
        font: helveticaBold, 
        size: 10
    })
    drawText({ 
        page, 
        text: 'Antall', 
        x: boxX + 300, 
        y: textY, 
        font: helveticaBold, 
        size: 10
    })
    drawText({ 
        page, 
        text: 'Pris', 
        x: boxX + 360, 
        y: textY, 
        font: helveticaBold, 
        size: 10
    })
    drawText({ 
        page, 
        text: 'Sum', 
        x: boxX + 430, 
        y: textY, 
        font: helveticaBold, 
        size: 10
    })
    textY -= 18
    
    // Draw line under header
    page.drawLine({
        start: { x: boxX + 10, y: textY + 5 },
        end: { x: boxX + boxWidth - 10, y: textY + 5 },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7)
    })
    textY -= 5
    
    // Line items
    let totalCents = 0
    for (const item of data.lineItems) {
        drawText({ 
            page, 
            text: item.description, 
            x: boxX + 15, 
            y: textY, 
            font: helvetica, 
            size: 10,
            maxWidth: 270
        })
        drawText({ 
            page, 
            text: String(item.quantity), 
            x: boxX + 310, 
            y: textY, 
            font: helvetica, 
            size: 10
        })
        drawText({ 
            page, 
            text: formatNOK(item.unitPriceCents), 
            x: boxX + 360, 
            y: textY, 
            font: helvetica, 
            size: 10
        })
        drawText({ 
            page, 
            text: formatNOK(item.totalPriceCents), 
            x: boxX + 430, 
            y: textY, 
            font: helvetica, 
            size: 10
        })
        totalCents += item.totalPriceCents
        textY -= lineItemHeight
    }
    
    // Total row
    textY -= 5
    page.drawLine({
        start: { x: boxX + 350, y: textY + 12 },
        end: { x: boxX + boxWidth - 10, y: textY + 12 },
        thickness: 0.5,
        color: rgb(0.5, 0.5, 0.5)
    })
    drawText({ 
        page, 
        text: 'Totalt:', 
        x: boxX + 360, 
        y: textY, 
        font: helveticaBold, 
        size: 11
    })
    drawText({ 
        page, 
        text: formatNOK(totalCents), 
        x: boxX + 430, 
        y: textY, 
        font: helveticaBold, 
        size: 11
    })
    
    y = boxY - 20

    // ==========================================================================
    // VAT BREAKDOWN (if applicable)
    // ==========================================================================
    
    if (data.vat && data.seller.vatRegistered) {
        y = drawVatBreakdown(page, data.vat, y, fonts)
    }
    
    y -= 20

    // ==========================================================================
    // QR CODE (optional)
    // ==========================================================================
    
    if (data.includeQrCode && data.qrToken) {
        y = await drawQRCode(pdfDoc, page, data.qrToken, y, fonts)
    }

    // ==========================================================================
    // FOOTER
    // ==========================================================================
    
    drawFooter(page, fonts, data.footerText)

    const pdfBytes = await pdfDoc.save()
    return Buffer.from(pdfBytes)
}

// =============================================================================
// CREDIT NOTE PDF GENERATOR
// =============================================================================

/**
 * Generate a credit note PDF for refunds
 * Norwegian compliance: Must reference original invoice/order and include all legal info
 */
export async function generateCreditNotePDF(data: CreditNoteData): Promise<Buffer> {
    // Load PDF template configuration
    const template = await loadPdfTemplate('CREDIT_NOTE')
    
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595, 842]) // A4
    
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const fonts = { regular: helvetica, bold: helveticaBold }
    
    const { width, height } = page.getSize()
    const platform = data.platform || DEFAULT_PLATFORM_INFO
    let y = height - 50

    // ==========================================================================
    // LOAD LOGOS
    // ==========================================================================
    
    const organizerLogoUrl = template?.logoUrl || data.seller.logoUrl
    const organizerLogo = organizerLogoUrl
        ? await loadImageFromUrl(pdfDoc, organizerLogoUrl) 
        : null
    const platformLogo = (template?.includePlatformInfo !== false) && platform.logoUrl 
        ? await loadImageFromUrl(pdfDoc, platform.logoUrl) 
        : null

    // ==========================================================================
    // HEADER
    // ==========================================================================
    
    const headerTitle = template?.headerText || 'KREDITNOTA'
    y = template?.showHeader !== false
        ? drawHeaderWithLogo(page, headerTitle, null, y, fonts, organizerLogo)
        : y

    // ==========================================================================
    // CREDIT NOTE NUMBER & DATE
    // ==========================================================================
    
    const gray = { r: 0.3, g: 0.3, b: 0.3 }
    
    drawText({ page, text: `Kreditnota nr: ${data.creditNumber}`, x: 50, y, font: helveticaBold, size: 11 })
    drawText({ 
        page, 
        text: `Dato: ${formatDateNO(data.issueDate)}`, 
        x: 350, y, 
        font: fonts.regular, 
        size: 10, 
        color: gray 
    })
    y -= 18
    
    // Reference to original document
    if (data.originalOrderNumber) {
        drawText({ 
            page, 
            text: `Referanse: Ordre ${data.originalOrderNumber}`, 
            x: 50, y, 
            font: fonts.regular, 
            size: 10, 
            color: gray 
        })
        y -= 14
    }
    if (data.originalInvoiceNumber) {
        drawText({ 
            page, 
            text: `Original faktura: ${data.originalInvoiceNumber}`, 
            x: 50, y, 
            font: fonts.regular, 
            size: 10, 
            color: gray 
        })
        y -= 14
    }
    if (data.originalTransactionDate) {
        drawText({ 
            page, 
            text: `Opprinnelig kjøpsdato: ${formatDateNO(data.originalTransactionDate)}`, 
            x: 50, y, 
            font: fonts.regular, 
            size: 10, 
            color: gray 
        })
        y -= 14
    }
    y -= 10

    // ==========================================================================
    // SELLER & PLATFORM INFO
    // ==========================================================================
    
    const infoStartY = y
    drawSellerInfo(page, data.seller, y, fonts)
    drawPlatformInfo(page, platform, infoStartY, fonts, platformLogo)
    y -= 110

    // ==========================================================================
    // BUYER INFO
    // ==========================================================================
    
    drawText({ page, text: 'KREDITERES', x: 50, y, font: helveticaBold, size: 9, color: gray })
    y -= 16
    drawText({ page, text: data.buyer.name, x: 50, y, font: helveticaBold, size: 10 })
    y -= 14
    drawText({ page, text: data.buyer.email, x: 50, y, font: fonts.regular, size: 9, color: gray })
    y -= 30

    // ==========================================================================
    // REFUND REASON BOX
    // ==========================================================================
    
    const reasonBoxHeight = 50
    page.drawRectangle({
        x: 50,
        y: y - reasonBoxHeight,
        width: width - 100,
        height: reasonBoxHeight,
        borderColor: rgb(0.8, 0.3, 0.3),
        borderWidth: 1,
        color: rgb(1, 0.95, 0.95)
    })
    
    drawText({ 
        page, 
        text: 'GRUNN FOR KREDITERING', 
        x: 60, 
        y: y - 15, 
        font: helveticaBold, 
        size: 9,
        color: { r: 0.6, g: 0.2, b: 0.2 }
    })
    
    const refundTypeText = data.refundType === 'FULL' 
        ? 'Full refusjon (100%)' 
        : data.refundType === 'PARTIAL' 
            ? `Delvis refusjon (${data.refundPercentage}%)` 
            : 'Ingen refusjon'
    
    drawText({ 
        page, 
        text: `${refundTypeText}: ${data.reason}`, 
        x: 60, 
        y: y - 35, 
        font: fonts.regular, 
        size: 10,
        maxWidth: width - 120
    })
    
    y -= reasonBoxHeight + 20

    // ==========================================================================
    // LINE ITEMS BEING REFUNDED
    // ==========================================================================
    
    const boxX = 50
    const boxWidth = width - 100
    const lineItemHeight = 20
    const boxHeight = 60 + (data.lineItems.length * lineItemHeight)
    const boxY = y - boxHeight
    
    page.drawRectangle({
        x: boxX,
        y: boxY,
        width: boxWidth,
        height: boxHeight,
        borderColor: rgb(0.3, 0.3, 0.3),
        borderWidth: 1,
        color: rgb(0.98, 0.98, 0.98)
    })
    
    let textY = y - 20
    
    // Header row
    drawText({ page, text: 'Beskrivelse', x: boxX + 15, y: textY, font: helveticaBold, size: 10 })
    drawText({ page, text: 'Antall', x: boxX + 280, y: textY, font: helveticaBold, size: 10 })
    drawText({ page, text: 'Oppr. pris', x: boxX + 340, y: textY, font: helveticaBold, size: 10 })
    drawText({ page, text: 'Kreditert', x: boxX + 430, y: textY, font: helveticaBold, size: 10 })
    textY -= 18
    
    // Draw line under header
    page.drawLine({
        start: { x: boxX + 10, y: textY + 5 },
        end: { x: boxX + boxWidth - 10, y: textY + 5 },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7)
    })
    textY -= 5
    
    // Line items
    for (const item of data.lineItems) {
        const refundedAmount = Math.round(item.totalPriceCents * data.refundPercentage / 100)
        
        drawText({ 
            page, 
            text: item.description, 
            x: boxX + 15, 
            y: textY, 
            font: helvetica, 
            size: 10,
            maxWidth: 250
        })
        drawText({ 
            page, 
            text: String(item.quantity), 
            x: boxX + 290, 
            y: textY, 
            font: helvetica, 
            size: 10
        })
        drawText({ 
            page, 
            text: formatNOK(item.totalPriceCents), 
            x: boxX + 340, 
            y: textY, 
            font: helvetica, 
            size: 10
        })
        drawText({ 
            page, 
            text: `-${formatNOK(refundedAmount)}`, 
            x: boxX + 430, 
            y: textY, 
            font: helvetica, 
            size: 10,
            color: { r: 0.6, g: 0.2, b: 0.2 }
        })
        textY -= lineItemHeight
    }
    
    y = boxY - 20

    // ==========================================================================
    // CREDIT SUMMARY
    // ==========================================================================
    
    page.drawRectangle({
        x: 300,
        y: y - 80,
        width: width - 350,
        height: 80,
        borderColor: rgb(0.2, 0.5, 0.2),
        borderWidth: 1,
        color: rgb(0.95, 1, 0.95)
    })
    
    let summaryY = y - 20
    
    drawText({ 
        page, 
        text: 'Opprinnelig beløp:', 
        x: 310, 
        y: summaryY, 
        font: fonts.regular, 
        size: 10 
    })
    drawText({ 
        page, 
        text: formatNOK(data.originalAmountCents), 
        x: 450, 
        y: summaryY, 
        font: fonts.regular, 
        size: 10 
    })
    summaryY -= 16
    
    if (data.mvaCents > 0 && data.seller.vatRegistered) {
        drawText({ 
            page, 
            text: 'MVA-justering:', 
            x: 310, 
            y: summaryY, 
            font: fonts.regular, 
            size: 10 
        })
        drawText({ 
            page, 
            text: `-${formatNOK(data.mvaCents)}`, 
            x: 450, 
            y: summaryY, 
            font: fonts.regular, 
            size: 10,
            color: { r: 0.6, g: 0.2, b: 0.2 }
        })
        summaryY -= 16
    }
    
    // Total credit line
    page.drawLine({
        start: { x: 310, y: summaryY + 10 },
        end: { x: width - 60, y: summaryY + 10 },
        thickness: 1,
        color: rgb(0.2, 0.5, 0.2)
    })
    
    drawText({ 
        page, 
        text: 'TOTALT KREDITERT:', 
        x: 310, 
        y: summaryY - 5, 
        font: helveticaBold, 
        size: 11 
    })
    drawText({ 
        page, 
        text: `-${formatNOK(data.totalCents)}`, 
        x: 450, 
        y: summaryY - 5, 
        font: helveticaBold, 
        size: 11,
        color: { r: 0.6, g: 0.2, b: 0.2 }
    })
    
    y -= 100

    // ==========================================================================
    // REFUND INFO
    // ==========================================================================
    
    if (data.refundAmountCents > 0) {
        drawText({ 
            page, 
            text: 'Refusjonsbeløpet vil bli tilbakeført til opprinnelig betalingsmåte innen 5-10 virkedager.', 
            x: 50, 
            y: y, 
            font: fonts.regular, 
            size: 9,
            color: gray
        })
        y -= 20
    }

    // ==========================================================================
    // FOOTER
    // ==========================================================================
    
    drawFooter(page, fonts, data.footerText)

    const pdfBytes = await pdfDoc.save()
    return Buffer.from(pdfBytes)
}

// =============================================================================
// INVOICE PDF GENERATOR
// =============================================================================

/**
 * Generate an invoice PDF for an order
 * Norwegian compliance: Must include all legal info and VAT breakdown
 */
export async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
    // Load PDF template configuration
    const template = await loadPdfTemplate('INVOICE')
    
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595, 842]) // A4
    
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const fonts = { regular: helvetica, bold: helveticaBold }
    
    const { width, height } = page.getSize()
    const platform = data.platform || DEFAULT_PLATFORM_INFO
    let y = height - 50

    // ==========================================================================
    // LOAD LOGOS
    // ==========================================================================
    
    const organizerLogoUrl = template?.logoUrl || data.seller.logoUrl
    const organizerLogo = organizerLogoUrl
        ? await loadImageFromUrl(pdfDoc, organizerLogoUrl) 
        : null
    const platformLogo = (template?.includePlatformInfo !== false) && platform.logoUrl 
        ? await loadImageFromUrl(pdfDoc, platform.logoUrl) 
        : null

    // ==========================================================================
    // HEADER
    // ==========================================================================
    
    const headerTitle = template?.headerText || 'FAKTURA'
    y = template?.showHeader !== false
        ? drawHeaderWithLogo(page, headerTitle, null, y, fonts, organizerLogo)
        : y

    // ==========================================================================
    // INVOICE NUMBER, DATE & STATUS
    // ==========================================================================
    
    const gray = { r: 0.3, g: 0.3, b: 0.3 }
    const statusColors = {
        PAID: { r: 0.13, g: 0.77, b: 0.25 },     // Green
        PENDING: { r: 0.96, g: 0.58, b: 0.13 },  // Orange
        OVERDUE: { r: 0.93, g: 0.26, b: 0.26 },  // Red
        CANCELLED: { r: 0.5, g: 0.5, b: 0.5 }    // Gray
    }
    const statusLabels = {
        PAID: 'BETALT',
        PENDING: 'VENTER',
        OVERDUE: 'FORFALT',
        CANCELLED: 'KANSELLERT'
    }
    
    // Left column: Invoice number
    drawText({ page, text: `Faktura nr: ${data.invoiceNumber}`, x: 50, y, font: helveticaBold, size: 11 })
    
    // Right column: Date
    const rightColX = 350
    drawText({ 
        page, 
        text: `Dato: ${formatDateNO(data.invoiceDate)}`, 
        x: rightColX, 
        y, 
        font: fonts.regular, 
        size: 10, 
        color: gray 
    })
    y -= 18
    
    // Left column: Order reference (if available)
    if (data.orderNumber) {
        drawText({ 
            page, 
            text: `Ordrenr: ${data.orderNumber}`, 
            x: 50, 
            y, 
            font: fonts.regular, 
            size: 10, 
            color: gray 
        })
        y -= 18
    }
    
    // Left column: Due date
    drawText({ 
        page, 
        text: `Forfallsdato: ${formatDateNO(data.dueDate)}`, 
        x: 50, 
        y, 
        font: fonts.regular, 
        size: 10, 
        color: gray 
    })
    y -= 18
    
    y -= 10

    // ==========================================================================
    // SELLER & PLATFORM INFO (side by side)
    // ==========================================================================
    
    if (template?.includeSellerInfo !== false || template?.includePlatformInfo !== false) {
        const infoStartY = y
        if (template?.includeSellerInfo !== false) {
            drawSellerInfo(page, data.seller, y, fonts)
        }
        if (template?.includePlatformInfo !== false && platform) {
            drawPlatformInfo(page, platform, infoStartY, fonts, platformLogo)
        }
        y -= 110
    }

    // ==========================================================================
    // BUYER INFO
    // ==========================================================================
    
    if (template?.includeBuyerInfo !== false) {
        y = drawBuyerInfo(page, data.buyer, y, fonts)
    }

    // ==========================================================================
    // LINE ITEMS
    // ==========================================================================
    
    y -= 10
    
    const boxX = 50
    const boxWidth = width - 100
    const boxHeight = 40 + (data.lineItems.length * 18) + 10
    const boxY = y
    
    // Draw box background
    page.drawRectangle({
        x: boxX,
        y: boxY - boxHeight,
        width: boxWidth,
        height: boxHeight,
        borderColor: rgb(0.85, 0.85, 0.85),
        borderWidth: 1,
        color: rgb(0.98, 0.98, 0.98)
    })
    
    let textY = y - 20
    
    // Header row
    drawText({ page, text: 'Beskrivelse', x: boxX + 15, y: textY, font: helveticaBold, size: 10 })
    drawText({ page, text: 'Antall', x: boxX + 320, y: textY, font: helveticaBold, size: 10 })
    drawText({ page, text: 'Pris', x: boxX + 395, y: textY, font: helveticaBold, size: 10 })
    drawText({ page, text: 'Sum', x: boxX + 460, y: textY, font: helveticaBold, size: 10 })
    textY -= 18
    
    // Draw line under header
    page.drawLine({
        start: { x: boxX + 10, y: textY + 5 },
        end: { x: boxX + boxWidth - 10, y: textY + 5 },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7)
    })
    textY -= 5
    
    // Line items
    for (const item of data.lineItems) {
        drawText({ 
            page, 
            text: item.description, 
            x: boxX + 15, 
            y: textY, 
            font: helvetica, 
            size: 9,
            maxWidth: 280
        })
        
        // Center-align quantity
        const qtyText = item.quantity.toString()
        const qtyWidth = helvetica.widthOfTextAtSize(qtyText, 9)
        drawText({ 
            page, 
            text: qtyText, 
            x: boxX + 335 - (qtyWidth / 2), 
            y: textY, 
            font: helvetica, 
            size: 9 
        })
        
        // Right-align unit price
        const priceText = formatNOK(item.unitPriceCents)
        const priceWidth = helvetica.widthOfTextAtSize(priceText, 9)
        drawText({ 
            page, 
            text: priceText, 
            x: boxX + 445 - priceWidth, 
            y: textY, 
            font: helvetica, 
            size: 9 
        })
        
        // Right-align total price
        const totalText = formatNOK(item.totalPriceCents)
        const totalWidth = helvetica.widthOfTextAtSize(totalText, 9)
        drawText({ 
            page, 
            text: totalText, 
            x: boxX + boxWidth - 15 - totalWidth, 
            y: textY, 
            font: helvetica, 
            size: 9 
        })
        textY -= 18
    }
    
    y = boxY - boxHeight - 20

    // ==========================================================================
    // TOTALS
    // ==========================================================================
    
    const totalsX = width - 180
    
    drawText({ 
        page, 
        text: 'Subtotal:', 
        x: totalsX, 
        y, 
        font: helvetica, 
        size: 10 
    })
    drawText({ 
        page, 
        text: formatNOK(data.subtotalCents), 
        x: totalsX + 80, 
        y, 
        font: helvetica, 
        size: 10 
    })
    y -= 16
    
    if (data.mvaCents > 0) {
        drawText({ 
            page, 
            text: `MVA (${data.mvaRate}%):`, 
            x: totalsX, 
            y, 
            font: helvetica, 
            size: 10 
        })
        drawText({ 
            page, 
            text: formatNOK(data.mvaCents), 
            x: totalsX + 80, 
            y, 
            font: helvetica, 
            size: 10 
        })
        y -= 16
    }
    
    // Draw line above total
    page.drawLine({
        start: { x: totalsX, y: y + 8 },
        end: { x: totalsX + 120, y: y + 8 },
        thickness: 1,
        color: rgb(0.2, 0.2, 0.2)
    })
    
    y -= 6
    
    drawText({ 
        page, 
        text: 'TOTALT:', 
        x: totalsX, 
        y, 
        font: helveticaBold, 
        size: 12 
    })
    drawText({ 
        page, 
        text: formatNOK(data.totalCents), 
        x: totalsX + 80, 
        y, 
        font: helveticaBold, 
        size: 12 
    })
    
    y -= 20

    // ==========================================================================
    // VAT BREAKDOWN (if applicable and template allows)
    // ==========================================================================
    
    if ((template?.includeVatBreakdown !== false) && data.vat && data.seller.vatRegistered) {
        y = drawVatBreakdown(page, data.vat, y, fonts)
    }
    
    y -= 30

    // ==========================================================================
    // PAYMENT STATUS AND DATE (below totals)
    // ==========================================================================
    
    if (template?.includePaymentInfo !== false) {
        // Status badge
        const statusText = statusLabels[data.status]
        const statusColor = statusColors[data.status]
        const statusWidth = fonts.bold.widthOfTextAtSize(statusText, 9)
        
        page.drawRectangle({
            x: 50,
            y: y - 2,
            width: statusWidth + 16,
            height: 16,
            color: rgb(statusColor.r, statusColor.g, statusColor.b)
        })
        drawText({ 
            page, 
            text: statusText, 
            x: 58, 
            y: y + 2, 
            font: fonts.bold, 
            size: 9, 
            color: { r: 1, g: 1, b: 1 } 
        })
        
        // Payment date (if paid)
        if (data.status === 'PAID' && data.paidAt) {
            const paymentText = `Betalt: ${formatDateNO(data.paidAt)}`
            drawText({ 
                page, 
                text: paymentText, 
                x: 50 + statusWidth + 32, 
                y: y + 2, 
                font: helvetica, 
                size: 9,
                color: statusColors.PAID
            })
        }
        
        y -= 30
    }

    // ==========================================================================
    // FOOTER
    // ==========================================================================
    
    const footerText = template?.footerText || data.footerText || 'Takk for ditt kjøp!'
    if (template?.showFooter !== false) {
        drawFooter(page, fonts, footerText)
    }

    const pdfBytes = await pdfDoc.save()
    return Buffer.from(pdfBytes)
}

// =============================================================================
// MULTI-TICKET PDF GENERATOR (for orders with multiple event tickets)
// =============================================================================

export interface MultiTicketOrderData {
    tickets: Array<{
        qrToken: string
        ticketNumber: number
    }>
    eventTitle: string
    eventDate: Date
    eventVenue?: string
    seller: SellerInfo
    buyer: BuyerInfo
    transaction: TransactionInfo
    vat?: VatBreakdown
    unitPriceCents: number
    platform?: PlatformInfo
}

/**
 * Generate a multi-page PDF with one ticket per page
 * Each ticket has its own unique QR code for scanning
 */
export async function generateMultiTicketPDF(data: MultiTicketOrderData): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create()
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const fonts = { regular: helvetica, bold: helveticaBold }
    const platform = data.platform || DEFAULT_PLATFORM_INFO
    const totalTickets = data.tickets.length

    // Load logos once (reused across all pages)
    const organizerLogo = data.seller.logoUrl 
        ? await loadImageFromUrl(pdfDoc, data.seller.logoUrl) 
        : null
    const platformLogo = platform.logoUrl 
        ? await loadImageFromUrl(pdfDoc, platform.logoUrl) 
        : null

    for (const ticket of data.tickets) {
        const page = pdfDoc.addPage([595, 842]) // A4
        const { height } = page.getSize()
        let y = height - 50

        // Header with logo
        const subtitle = `Billett ${ticket.ticketNumber} av ${totalTickets}`
        y = drawHeaderWithLogo(page, 'BILLETT', subtitle, y, fonts, organizerLogo)

        // Seller & Platform info
        const infoStartY = y
        drawSellerInfo(page, data.seller, y, fonts)
        drawPlatformInfo(page, platform, infoStartY, fonts, platformLogo)
        y -= 110  // Increased spacing to accommodate logo and more line height
        
        // Buyer & Transaction info
        const buyerStartY = y
        drawBuyerInfo(page, data.buyer, y, fonts)
        drawTransactionInfo(page, data.transaction, ticket.ticketNumber, totalTickets, buyerStartY, fonts)
        y -= 75  // Increased spacing for more line height

        // Event Details Box
        const boxX = 50
        const boxWidth = 595 - 100  // A4 width - margins
        const boxHeight = 100
        const boxY = y - boxHeight
        
        page.drawRectangle({
            x: boxX,
            y: boxY,
            width: boxWidth,
            height: boxHeight,
            borderColor: rgb(0.2, 0.5, 0.8),
            borderWidth: 2,
            color: rgb(0.95, 0.97, 1)
        })
        
        let textY = y - 20
        
        drawText({ 
            page, 
            text: data.eventTitle, 
            x: boxX + 15, 
            y: textY, 
            font: helveticaBold, 
            size: 16,
            maxWidth: boxWidth - 30
        })
        textY -= 25
        
        const dateStr = formatDateNO(data.eventDate)
        const timeStr = data.eventDate.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })
        
        drawText({ 
            page, 
            text: `Dato: ${dateStr} kl. ${timeStr}`, 
            x: boxX + 15, 
            y: textY, 
            font: helvetica, 
            size: 11,
            color: { r: 0.2, g: 0.2, b: 0.2 }
        })
        textY -= 16
        
        if (data.eventVenue) {
            drawText({ 
                page, 
                text: `Sted: ${data.eventVenue}`, 
                x: boxX + 15, 
                y: textY, 
                font: helvetica, 
                size: 11,
                color: { r: 0.2, g: 0.2, b: 0.2 }
            })
        }
        
        y = boxY - 20

        // VAT info (only on first ticket to avoid repetition)
        if (ticket.ticketNumber === 1 && data.vat && data.seller.vatRegistered) {
            y = drawVatBreakdown(page, data.vat, y, fonts)
        }
        
        y -= 20

        // QR Code (unique per ticket)
        y = await drawQRCode(pdfDoc, page, ticket.qrToken, y, fonts)

        // Footer
        drawFooter(page, fonts)
    }

    const pdfBytes = await pdfDoc.save()
    return Buffer.from(pdfBytes)
}
