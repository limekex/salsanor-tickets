import { prisma } from '@/lib/db'
import { requireAdmin } from '@/utils/auth-admin'
import { NextResponse } from 'next/server'
import { generateCreditNotePDF } from '@/lib/tickets/pdf-generator'
import { DEFAULT_PLATFORM_INFO } from '@/lib/tickets/legal-requirements'

/**
 * Download credit note PDF
 */
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string; creditNoteId: string }> }
) {
    try {
        await requireAdmin()
        const { creditNoteId } = await params

        const creditNote = await prisma.creditNote.findUnique({
            where: { id: creditNoteId },
            include: {
                Order: {
                    include: {
                        PersonProfile: true,
                        Organizer: true
                    }
                }
            }
        })

        if (!creditNote) {
            return NextResponse.json({ error: 'Credit note not found' }, { status: 404 })
        }

        const order = creditNote.Order
        const org = order.Organizer

        // Build credit note data
        const buyerName = `${order.PersonProfile.firstName || ''} ${order.PersonProfile.lastName || ''}`.trim() || 'N/A'
        
        // Parse line items from JSON
        const lineItems = Array.isArray(creditNote.lineItems) 
            ? creditNote.lineItems as any[]
            : []

        const sellerInfo = {
            name: org.name,
            organizationNumber: org.organizationNumber || undefined,
            address: org.address ? (typeof org.address === 'string' ? JSON.parse(org.address) : org.address) : undefined,
            contactEmail: org.legalEmail || org.contactEmail || undefined,
            vatRegistered: org.vatRegistered || org.mvaReportingRequired,
            vatNumber: org.vatRegistered && org.organizationNumber ? org.organizationNumber : undefined,
            logoUrl: org.logoUrl || undefined
        }

        const creditNoteData = {
            creditNumber: creditNote.creditNoteNumber,
            issueDate: creditNote.createdAt,
            originalInvoiceNumber: creditNote.originalInvoiceNumber || undefined,
            originalOrderNumber: order.orderNumber || undefined,
            originalTransactionDate: order.createdAt,
            refundType: creditNote.refundType as 'FULL' | 'PARTIAL' | 'NONE',
            refundPercentage: Number(creditNote.refundPercentage || 0),
            reason: creditNote.reason || 'Kansellering',
            originalAmountCents: creditNote.originalAmountCents,
            refundAmountCents: creditNote.refundAmountCents,
            mvaCents: creditNote.mvaCents,
            totalCents: creditNote.totalCents,
            lineItems,
            seller: sellerInfo,
            buyer: {
                name: buyerName,
                email: order.PersonProfile.email
            },
            platform: DEFAULT_PLATFORM_INFO
        }

        const pdfBuffer = await generateCreditNotePDF(creditNoteData)

        return new Response(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="kreditnota-${creditNote.creditNoteNumber}.pdf"`,
            },
        })
    } catch (error) {
        console.error('Error generating credit note PDF:', error)
        return NextResponse.json({ error: 'Failed to generate credit note PDF' }, { status: 500 })
    }
}
