import { prisma } from '@/lib/db'
import { requireAdmin } from '@/utils/auth-admin'
import { NextResponse } from 'next/server'
import { generateInvoicePDF, type InvoiceData } from '@/lib/tickets/pdf-generator'

/**
 * Generate and download invoice PDF for an order
 */
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requireAdmin()
        const { id: orderId } = await params

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                Invoice: true,
                PersonProfile: true,
                Organizer: true,
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
                CoursePeriod: true
            }
        })

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        if (!order.Invoice) {
            return NextResponse.json({ error: 'No invoice for this order' }, { status: 404 })
        }

        // Build invoice data for PDF generator
        const invoice = order.Invoice
        const org = order.Organizer

        // Build line items from order
        const lineItems = []
        
        if (order.EventRegistration.length > 0) {
            // Calculate total quantity
            const totalQty = order.EventRegistration.reduce((sum, reg) => sum + reg.quantity, 0)
            
            for (const reg of order.EventRegistration) {
                // If unitPriceCents is 0, calculate from order total
                let unitPrice = reg.unitPriceCents
                if (unitPrice === 0 && totalQty > 0) {
                    // Distribute order total across all items proportionally
                    unitPrice = Math.floor(order.subtotalAfterDiscountCents / totalQty)
                }
                
                lineItems.push({
                    description: reg.Event?.title || 'Event',
                    quantity: reg.quantity,
                    unitPriceCents: unitPrice,
                    totalPriceCents: unitPrice * reg.quantity,
                    vatRate: 0 // Events are typically VAT-exempt in Norway
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
            }
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
