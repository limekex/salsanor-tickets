import { prisma } from '@/lib/db'
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { generateCreditNotePDF } from '@/lib/tickets/pdf-generator'
import { DEFAULT_PLATFORM_INFO } from '@/lib/tickets/legal-requirements'

/**
 * Download credit note PDF by credit note ID
 * Accessible by org admins for their organization's credit notes AND by order owners
 */
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: creditNoteId } = await params
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

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

        // Get user account to check permissions
        const userAccount = await prisma.userAccount.findUnique({
            where: { supabaseUid: user.id },
            include: { 
                PersonProfile: true,
                UserAccountRole: true 
            }
        })

        if (!userAccount) {
            return NextResponse.json({ error: 'User account not found' }, { status: 404 })
        }

        // Check if user is the order owner OR has org admin access
        const isOrderOwner = order.purchaserPersonId === userAccount.PersonProfile?.id
        const hasOrgAccess = userAccount.UserAccountRole.some(
            role => role.organizerId === org.id
        )
        
        if (!isOrderOwner && !hasOrgAccess) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        // Build credit note data
        const buyerName = `${order.PersonProfile.firstName || ''} ${order.PersonProfile.lastName || ''}`.trim() || 'N/A'
        
        const lineItems: { description: string; quantity: number; unitPriceCents: number; totalPriceCents: number; vatRate: number }[] = []

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
            refundPercentage: 0,
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
