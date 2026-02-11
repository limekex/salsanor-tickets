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
        if (!order) {
            return NextResponse.json({ error: 'Order not found for credit note' }, { status: 404 })
        }
        const org = order.Organizer

        // Build credit note data
        const buyerName = `${order.PersonProfile.firstName || ''} ${order.PersonProfile.lastName || ''}`.trim() || 'N/A'
        
        // Line items are derived from the credit note details - no lineItems field exists on CreditNote
        const lineItems: any[] = []

        const sellerInfo = {
            name: org.name,
            legalName: org.legalName || org.name,
            organizationNumber: org.organizationNumber || undefined,
            address: org.legalAddress ? { street: org.legalAddress } : undefined,
            contactEmail: org.legalEmail || org.contactEmail || undefined,
            vatRegistered: org.vatRegistered || org.mvaReportingRequired,
            vatNumber: org.vatRegistered && org.organizationNumber ? org.organizationNumber : undefined,
            logoUrl: org.logoUrl || undefined
        }

        const creditNoteData = {
            creditNumber: creditNote.creditNumber,
            issueDate: creditNote.issueDate,
            originalInvoiceNumber: undefined as string | undefined,
            originalOrderNumber: order.orderNumber || undefined,
            originalTransactionDate: order.createdAt,
            refundType: creditNote.refundType as 'FULL' | 'PARTIAL' | 'NONE',
            refundPercentage: 0, // Not stored on credit note - computed if needed
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

        return new Response(new Uint8Array(pdfBuffer), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="kreditnota-${creditNote.creditNumber}.pdf"`,
            },
        })
    } catch (error) {
        console.error('Error generating credit note PDF:', error)
        return NextResponse.json({ error: 'Failed to generate credit note PDF' }, { status: 500 })
    }
}
