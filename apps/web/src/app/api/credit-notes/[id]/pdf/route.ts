import { prisma } from '@/lib/db'
import { requireOrgAdmin } from '@/utils/auth-org-admin'
import { NextResponse } from 'next/server'
import { generateCreditNotePDF } from '@/lib/tickets/pdf-generator'
import { DEFAULT_PLATFORM_INFO, TicketLineItem } from '@/lib/tickets/legal-requirements'

/**
 * Download credit note PDF by credit note ID
 * Accessible by org admins for their organization's credit notes
 */
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userAccount = await requireOrgAdmin()
        const { id: creditNoteId } = await params

        const creditNote = await prisma.creditNote.findUnique({
            where: { id: creditNoteId },
            include: {
                Registration: {
                    include: {
                        CourseTrack: true,
                        CoursePeriod: true,
                        PersonProfile: true
                    }
                },
                Order: {
                    include: {
                        PersonProfile: true,
                        Organizer: true,
                        Registration: {
                            include: {
                                CourseTrack: true,
                                CoursePeriod: true
                            }
                        }
                    }
                },
                Organizer: true
            }
        })

        if (!creditNote) {
            return NextResponse.json({ error: 'Credit note not found' }, { status: 404 })
        }

        // Get organizer - either from direct relation or from order
        const org = creditNote.Organizer || creditNote.Order?.Organizer
        if (!org) {
            return NextResponse.json({ error: 'Organizer not found for credit note' }, { status: 404 })
        }

        // Get buyer profile - from registration or order
        const buyerProfile = creditNote.Registration?.PersonProfile || creditNote.Order?.PersonProfile
        if (!buyerProfile) {
            return NextResponse.json({ error: 'Buyer profile not found' }, { status: 404 })
        }

        // Verify user has access to this organization
        const hasAccess = userAccount.UserAccountRole.some(
            role => role.organizerId === org.id
        )
        
        if (!hasAccess) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        // Build credit note data
        const buyerName = `${buyerProfile.firstName || ''} ${buyerProfile.lastName || ''}`.trim() || 'N/A'
        
        // Build line items from registration or order
        const lineItems: TicketLineItem[] = []
        
        // If credit note is linked to a specific registration, use that
        if (creditNote.Registration) {
            const reg = creditNote.Registration
            const trackName = reg.CourseTrack?.title || ''
            const periodName = reg.CoursePeriod?.name || ''
            const description = trackName 
                ? `${trackName} (${periodName})`
                : periodName || 'Kursregistrering'
            
            lineItems.push({
                description,
                quantity: 1,
                unitPriceCents: creditNote.originalAmountCents,
                totalPriceCents: creditNote.originalAmountCents
            })
        } 
        // Otherwise, build from order registrations
        else if (creditNote.Order?.Registration && creditNote.Order.Registration.length > 0) {
            for (const reg of creditNote.Order.Registration) {
                const trackName = reg.CourseTrack?.title || ''
                const periodName = reg.CoursePeriod?.name || ''
                const description = trackName 
                    ? `${trackName} (${periodName})`
                    : periodName || 'Kursregistrering'
                
                // For full order credit note, distribute amount across registrations
                const itemAmount = Math.round(creditNote.originalAmountCents / creditNote.Order.Registration.length)
                
                lineItems.push({
                    description,
                    quantity: 1,
                    unitPriceCents: itemAmount,
                    totalPriceCents: itemAmount
                })
            }
        }
        // Fallback: generic line item
        else {
            lineItems.push({
                description: creditNote.reason || 'Kansellering',
                quantity: 1,
                unitPriceCents: creditNote.originalAmountCents,
                totalPriceCents: creditNote.originalAmountCents
            })
        }

        // Calculate refund percentage
        const refundPercentage = creditNote.originalAmountCents > 0 
            ? Math.round((creditNote.refundAmountCents / creditNote.originalAmountCents) * 100)
            : 0

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
            originalOrderNumber: creditNote.Order?.orderNumber || undefined,
            originalTransactionDate: creditNote.Order?.createdAt,
            refundType: creditNote.refundType as 'FULL' | 'PARTIAL' | 'NONE',
            refundPercentage,
            reason: creditNote.reason || 'Kansellering',
            originalAmountCents: creditNote.originalAmountCents,
            refundAmountCents: creditNote.refundAmountCents,
            mvaCents: creditNote.mvaCents,
            totalCents: creditNote.totalCents,
            lineItems,
            seller: sellerInfo,
            buyer: {
                name: buyerName,
                email: buyerProfile.email
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
