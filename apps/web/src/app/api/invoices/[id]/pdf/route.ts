import { prisma } from '@/lib/db'
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { generateInvoicePDF, type InvoiceData } from '@/lib/tickets/pdf-generator'

/**
 * Generate and download invoice PDF by invoice ID
 * Accessible by org admins for their organization's invoices AND by order owners
 */
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: invoiceId } = await params
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get the invoice with order and organization details
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: {
                Order: {
                    include: {
                        Organizer: true,
                        PersonProfile: true,
                        EventRegistration: {
                            include: {
                                Event: true
                            }
                        },
                        Registration: {
                            include: {
                                CourseTrack: true
                            }
                        },
                        CoursePeriod: true,
                        CreditNote: {
                            orderBy: {
                                issueDate: 'desc'
                            }
                        }
                    }
                }
            }
        })

        if (!invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
        }

        const order = invoice.Order
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

        // Build line items from order first (needed for refund calculation)
        const lineItems = []
        
        if (order.EventRegistration.length > 0) {
            const totalQty = order.EventRegistration.reduce((sum, reg) => sum + reg.quantity, 0)
            
            for (const reg of order.EventRegistration) {
                let unitPrice = reg.unitPriceCents
                if (unitPrice === 0 && totalQty > 0) {
                    unitPrice = Math.floor(order.subtotalAfterDiscountCents / totalQty)
                }
                
                lineItems.push({
                    description: reg.Event?.title || 'Event',
                    quantity: reg.quantity,
                    unitPriceCents: unitPrice,
                    totalPriceCents: unitPrice * reg.quantity,
                    vatRate: 0
                })
            }
        } else if (order.Registration.length > 0) {
            const pricePerReg = Math.floor(order.subtotalAfterDiscountCents / order.Registration.length)
            for (const reg of order.Registration) {
                lineItems.push({
                    description: reg.CourseTrack?.title || 'Kurs',
                    quantity: 1,
                    unitPriceCents: pricePerReg,
                    totalPriceCents: pricePerReg,
                    vatRate: 0
                })
            }
        }

        // Calculate order total from line items
        const orderTotalFromItems = lineItems.reduce((sum, item) => sum + item.totalPriceCents, 0)
        
        // Get total credit note refund amount from database to calculate percentage
        const totalCreditNoteRefundFromDB = order.CreditNote.reduce((sum, cn) => sum + cn.refundAmountCents, 0)
        
        // Calculate refund percentage from actual credit note amounts
        const refundPercentage = orderTotalFromItems > 0 
            ? (totalCreditNoteRefundFromDB / orderTotalFromItems) * 100 
            : 0
        
        // Calculate the actual refunded amount by applying the percentage to the order total from items
        // This ensures consistency with how credit notes calculate refunds
        const totalRefundedCents = Math.round(orderTotalFromItems * refundPercentage / 100)
        
        const isFullyRefunded = totalRefundedCents >= orderTotalFromItems
        const isPartiallyRefunded = totalRefundedCents > 0 && !isFullyRefunded

        const invoiceData: InvoiceData = {
            invoiceNumber: invoice.invoiceNumber,
            invoiceDate: invoice.invoiceDate,
            dueDate: invoice.dueDate,
            orderNumber: order.orderNumber || undefined,
            paidAt: invoice.paidAt || undefined,
            status: invoice.status as 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED',
            subtotalCents: invoice.subtotalCents,
            mvaCents: invoice.mvaCents,
            totalCents: invoice.totalCents,
            mvaRate: Number(invoice.mvaRate) || 0,
            lineItems,
            seller: {
                legalName: org.name,
                organizationNumber: org.organizationNumber || undefined,
                address: org.legalAddress ? { street: org.legalAddress } : undefined,
                contactEmail: org.contactEmail || undefined,
                vatRegistered: org.vatRegistered || org.mvaReportingRequired,
                vatNumber: org.organizationNumber || undefined,
                logoUrl: org.logoUrl || undefined
            },
            buyer: {
                name: invoice.customerName,
                email: invoice.customerEmail,
                address: undefined
            },
            // Add refund information
            refundStatus: isFullyRefunded ? 'FULLY_REFUNDED' : (isPartiallyRefunded ? 'PARTIALLY_REFUNDED' : undefined),
            refundedAmountCents: totalRefundedCents > 0 ? totalRefundedCents : undefined,
            refundPercentage: isPartiallyRefunded ? refundPercentage : undefined,
            creditNotes: order.CreditNote.length > 0 ? order.CreditNote.map(cn => ({
                creditNumber: cn.creditNumber,
                issueDate: cn.issueDate,
                refundAmountCents: cn.refundAmountCents
            })) : undefined
        }

        // Generate PDF
        const pdfBuffer = await generateInvoicePDF(invoiceData)

        // Return PDF
        return new Response(new Uint8Array(pdfBuffer), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="faktura-${invoice.invoiceNumber}.pdf"`,
            },
        })
    } catch (error) {
        console.error('Error generating invoice:', error)
        return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 })
    }
}
