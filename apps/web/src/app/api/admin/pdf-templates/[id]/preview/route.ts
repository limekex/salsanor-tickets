import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/utils/auth-admin'
import { generateEventTicketPDF, generateCourseTicketPDF, generateOrderReceiptPDF, generateCreditNotePDF, CreditNoteData } from '@/lib/tickets/pdf-generator'
import { 
    SellerInfo, 
    BuyerInfo, 
    TransactionInfo, 
    VatBreakdown,
    TicketLineItem,
    PlatformInfo,
    DEFAULT_PLATFORM_INFO 
} from '@/lib/tickets/legal-requirements'
import { PdfTemplateType } from '@prisma/client'

// Sample data for preview
const SAMPLE_SELLER: SellerInfo = {
    legalName: 'Eksempel Danseklubb AS',
    organizationNumber: '987654321',
    address: {
        street: 'Dansegaten 123',
        postalCode: '0123',
        city: 'Oslo',
        country: 'Norway'
    },
    contactEmail: 'post@eksempeldans.no',
    vatRegistered: true,
    vatNumber: '987654321',
    // Sample logo - use a placeholder or actual organizer logo
    logoUrl: undefined  // Will use no logo in preview unless organizer has one
}

const SAMPLE_BUYER: BuyerInfo = {
    name: 'Ola Nordmann',
    email: 'ola.nordmann@example.com'
}

const SAMPLE_TRANSACTION: TransactionInfo = {
    orderNumber: 'ABC12345',
    transactionDate: new Date(),
    paymentMethod: 'Kort (Stripe)'
}

const SAMPLE_VAT: VatBreakdown = {
    netAmountCents: 40000, // 400 NOK
    vatRate: 25,
    vatAmountCents: 10000, // 100 NOK
    grossAmountCents: 50000, // 500 NOK
    pricesIncludeVat: true
}

// Platform info - uses DEFAULT_PLATFORM_INFO from environment variables
// Override logoUrl with absolute URL for PDF generation
const SAMPLE_PLATFORM: PlatformInfo = {
    ...DEFAULT_PLATFORM_INFO,
    // Ensure logo URL is absolute for PDF generation
    logoUrl: DEFAULT_PLATFORM_INFO.logoUrl || (
        process.env.NEXT_PUBLIC_APP_URL 
            ? `${process.env.NEXT_PUBLIC_APP_URL}/logo-full-Black.png`
            : 'http://localhost:3000/logo-full-Black.png'
    )
}

interface RouteParams {
    params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        await requireAdmin()
        
        const { id } = await params

        const template = await prisma.pdfTemplate.findUnique({
            where: { id }
        })

        if (!template) {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 })
        }

        let pdfBuffer: Buffer

        switch (template.type) {
            case PdfTemplateType.EVENT_TICKET: {
                const lineItem: TicketLineItem = {
                    description: 'Salsa Social Night - Eksempel Event',
                    quantity: 1,
                    unitPriceCents: 50000,
                    totalPriceCents: 50000
                }

                pdfBuffer = await generateEventTicketPDF({
                    ticketNumber: 1,
                    totalTickets: 1,
                    eventTitle: 'Salsa Social Night - Eksempel Event',
                    eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
                    eventVenue: 'Dansehuset, Oslo',
                    qrToken: 'PREVIEW-QR-TOKEN-12345678',
                    seller: SAMPLE_SELLER,
                    buyer: SAMPLE_BUYER,
                    transaction: SAMPLE_TRANSACTION,
                    vat: template.includeVatBreakdown ? SAMPLE_VAT : undefined,
                    lineItem,
                    platform: template.includePlatformInfo ? SAMPLE_PLATFORM : undefined,
                    footerText: template.footerText || undefined
                })
                break
            }

            case PdfTemplateType.COURSE_TICKET: {
                const lineItems: TicketLineItem[] = [
                    {
                        description: 'Salsa Nybegynner',
                        quantity: 1,
                        unitPriceCents: 150000,
                        totalPriceCents: 150000
                    },
                    {
                        description: 'Bachata Nybegynner',
                        quantity: 1,
                        unitPriceCents: 150000,
                        totalPriceCents: 150000
                    }
                ]

                const courseVat: VatBreakdown = {
                    netAmountCents: 240000,
                    vatRate: 25,
                    vatAmountCents: 60000,
                    grossAmountCents: 300000,
                    pricesIncludeVat: true
                }

                pdfBuffer = await generateCourseTicketPDF({
                    periodName: 'Vår 2026 - Eksempel Periode',
                    trackNames: ['Salsa Nybegynner', 'Bachata Nybegynner'],
                    startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                    qrToken: 'PREVIEW-COURSE-TOKEN-87654321',
                    seller: SAMPLE_SELLER,
                    buyer: SAMPLE_BUYER,
                    transaction: SAMPLE_TRANSACTION,
                    vat: template.includeVatBreakdown ? courseVat : undefined,
                    lineItems,
                    platform: template.includePlatformInfo ? SAMPLE_PLATFORM : undefined,
                    footerText: template.footerText || undefined
                })
                break
            }

            case PdfTemplateType.ORDER_RECEIPT: {
                const receiptLineItems: TicketLineItem[] = [
                    {
                        description: 'Salsa Social Night - Eksempel Event',
                        quantity: 2,
                        unitPriceCents: 25000,
                        totalPriceCents: 50000
                    },
                    {
                        description: 'Kurs: Salsa Nybegynner Vår 2026',
                        quantity: 1,
                        unitPriceCents: 150000,
                        totalPriceCents: 150000
                    }
                ]

                const receiptVat: VatBreakdown = {
                    netAmountCents: 160000,
                    vatRate: 25,
                    vatAmountCents: 40000,
                    grossAmountCents: 200000,
                    pricesIncludeVat: true
                }

                pdfBuffer = await generateOrderReceiptPDF({
                    headerTitle: template.headerText || 'KVITTERING',
                    seller: SAMPLE_SELLER,
                    buyer: SAMPLE_BUYER,
                    transaction: SAMPLE_TRANSACTION,
                    vat: template.includeVatBreakdown ? receiptVat : undefined,
                    lineItems: receiptLineItems,
                    platform: template.includePlatformInfo ? SAMPLE_PLATFORM : undefined,
                    includeQrCode: false,  // Receipts typically don't need QR codes
                    footerText: template.footerText || undefined
                })
                break
            }

            case PdfTemplateType.CREDIT_NOTE: {
                const creditNoteLineItems: TicketLineItem[] = [
                    {
                        description: 'Kurs: Salsa Nybegynner Vår 2026',
                        quantity: 1,
                        unitPriceCents: 150000,
                        totalPriceCents: 150000
                    }
                ]

                const creditNoteData: CreditNoteData = {
                    creditNumber: 'CN-2026-00001',
                    issueDate: new Date(),
                    originalOrderNumber: 'ABC12345',
                    originalTransactionDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
                    refundType: 'FULL',
                    refundPercentage: 100,
                    reason: 'Kansellering av registrering',
                    originalAmountCents: 150000,
                    refundAmountCents: 150000,
                    mvaCents: 30000, // 25% MVA
                    totalCents: 150000,
                    lineItems: creditNoteLineItems,
                    seller: SAMPLE_SELLER,
                    buyer: SAMPLE_BUYER,
                    platform: template.includePlatformInfo ? SAMPLE_PLATFORM : undefined,
                    footerText: template.footerText || undefined
                }

                pdfBuffer = await generateCreditNotePDF(creditNoteData)
                break
            }

            case PdfTemplateType.MEMBERSHIP_CARD:
            default: {
                // For membership cards, use event ticket as fallback for now
                const lineItem: TicketLineItem = {
                    description: 'Medlemskap - ' + new Date().getFullYear(),
                    quantity: 1,
                    unitPriceCents: 50000,
                    totalPriceCents: 50000
                }

                pdfBuffer = await generateEventTicketPDF({
                    ticketNumber: 1,
                    totalTickets: 1,
                    eventTitle: 'Medlemskap',
                    eventDate: new Date(),
                    qrToken: 'MEMBERSHIP-TOKEN-00000000',
                    seller: SAMPLE_SELLER,
                    buyer: SAMPLE_BUYER,
                    transaction: SAMPLE_TRANSACTION,
                    vat: template.includeVatBreakdown ? SAMPLE_VAT : undefined,
                    lineItem,
                    platform: template.includePlatformInfo ? SAMPLE_PLATFORM : undefined,
                    footerText: template.footerText || undefined
                })
                break
            }
        }

        return new NextResponse(new Uint8Array(pdfBuffer), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="preview-${template.type.toLowerCase()}.pdf"`,
            }
        })
    } catch (error) {
        console.error('PDF preview error:', error)
        return NextResponse.json({ error: 'Failed to generate preview' }, { status: 500 })
    }
}
