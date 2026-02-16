import { NextRequest, NextResponse } from 'next/server'
import { requireOrgFinanceForOrganizer } from '@/utils/auth-org-finance'
import { getOrgInvoice, markInvoiceSent } from '@/app/actions/staffadmin-finance'
import { generateInvoicePDF } from '@/lib/tickets/pdf-generator'
import { DEFAULT_PLATFORM_INFO, SellerInfo, BuyerInfo } from '@/lib/tickets/legal-requirements'
import { emailService } from '@/lib/email/email-service'

interface RouteContext {
    params: Promise<{ id: string }>
}

export async function POST(
    request: NextRequest,
    context: RouteContext
) {
    try {
        const { id } = await context.params
        const body = await request.json()
        const { organizerId } = body
        
        if (!organizerId) {
            return NextResponse.json({ error: 'Missing organizerId' }, { status: 400 })
        }

        // Validate access
        await requireOrgFinanceForOrganizer(organizerId)

        // Get invoice with all details
        const invoice = await getOrgInvoice(organizerId, id)
        
        if (!invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
        }

        // Build line items from order
        const lineItems: Array<{
            description: string
            quantity: number
            unitPriceCents: number
            totalPriceCents: number
        }> = []

        const order = invoice.Order

        // Course registrations
        if (order.Registration && order.Registration.length > 0) {
            const pricePerReg = Math.floor(order.subtotalAfterDiscountCents / order.Registration.length)
            for (const reg of order.Registration) {
                lineItems.push({
                    description: reg.CourseTrack?.title || 'Kursregistrering',
                    quantity: 1,
                    unitPriceCents: pricePerReg,
                    totalPriceCents: pricePerReg
                })
            }
        }

        // Event registrations
        if (order.EventRegistration && order.EventRegistration.length > 0) {
            const pricePerReg = Math.floor(order.subtotalAfterDiscountCents / order.EventRegistration.length)
            for (const reg of order.EventRegistration) {
                lineItems.push({
                    description: reg.Event?.title || 'Arrangement',
                    quantity: 1,
                    unitPriceCents: pricePerReg,
                    totalPriceCents: pricePerReg
                })
            }
        }

        // Memberships
        if (order.Membership && order.Membership.length > 0) {
            const pricePerMem = Math.floor(order.subtotalAfterDiscountCents / order.Membership.length)
            for (const mem of order.Membership) {
                lineItems.push({
                    description: `Medlemskap: ${mem.MembershipTier?.name || 'Standard'}`,
                    quantity: 1,
                    unitPriceCents: pricePerMem,
                    totalPriceCents: pricePerMem
                })
            }
        }

        // Fallback if no line items
        if (lineItems.length === 0) {
            lineItems.push({
                description: 'Ordre',
                quantity: 1,
                unitPriceCents: order.subtotalAfterDiscountCents,
                totalPriceCents: order.subtotalAfterDiscountCents
            })
        }

        // Build seller info (SellerInfo type)
        const seller: SellerInfo = {
            legalName: invoice.Organizer.name,
            organizationNumber: invoice.Organizer.organizationNumber || undefined,
            address: {
                city: invoice.Organizer.city || undefined,
                country: invoice.Organizer.country || 'Norway'
            },
            contactEmail: invoice.Organizer.contactEmail || undefined,
            vatRegistered: invoice.Organizer.vatRegistered,
            vatNumber: invoice.Organizer.organizationNumber ? `NO ${invoice.Organizer.organizationNumber} MVA` : undefined,
            logoUrl: invoice.Organizer.logoUrl || undefined
        }

        // Build buyer info (BuyerInfo type)
        const buyer: BuyerInfo = {
            name: invoice.customerName,
            email: invoice.customerEmail
        }

        // Generate PDF
        const pdfBuffer = await generateInvoicePDF({
            invoiceNumber: invoice.invoiceNumber,
            orderNumber: order.orderNumber || undefined,
            invoiceDate: invoice.invoiceDate,
            dueDate: invoice.dueDate,
            status: invoice.status as 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED',
            seller,
            buyer,
            lineItems,
            subtotalCents: invoice.subtotalCents,
            mvaRate: Number(invoice.mvaRate),
            mvaCents: invoice.mvaCents,
            totalCents: invoice.totalCents,
            platform: DEFAULT_PLATFORM_INFO
        })

        // Send email with PDF attachment
        await emailService.sendTransactional({
            organizerId,
            templateSlug: 'invoice',
            recipientEmail: invoice.customerEmail,
            recipientName: invoice.customerName,
            variables: {
                recipientName: invoice.customerName,
                invoiceNumber: invoice.invoiceNumber,
                invoiceDate: invoice.invoiceDate.toLocaleDateString('nb-NO'),
                dueDate: invoice.dueDate.toLocaleDateString('nb-NO'),
                totalAmount: `NOK ${(invoice.totalCents / 100).toFixed(2)}`,
                organizerName: invoice.Organizer.name,
                currentYear: new Date().getFullYear().toString()
            },
            language: 'no',
            attachments: [
                {
                    filename: `faktura-${invoice.invoiceNumber}.pdf`,
                    content: pdfBuffer
                }
            ]
        })

        // Mark invoice as sent
        await markInvoiceSent(organizerId, id)

        return NextResponse.json({ success: true, message: 'Invoice sent successfully' })
    } catch (error) {
        console.error('Error sending invoice:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to send invoice' },
            { status: 500 }
        )
    }
}
