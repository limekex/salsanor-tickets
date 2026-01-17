import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/utils/auth-admin'
import { prisma } from '@/lib/db'
import { emailService } from '@/lib/email/email-service'

export async function POST(request: NextRequest) {
    try {
        await requireAdmin()

        const body = await request.json()
        const { orderId, emailType } = body

        if (!orderId || !emailType) {
            return NextResponse.json(
                { error: 'orderId and emailType are required' },
                { status: 400 }
            )
        }

        // Fetch order with all necessary relations
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                PersonProfile: {
                    include: {
                        UserAccount: {
                            select: {
                                email: true
                            }
                        }
                    }
                },
                Organizer: true,
                CoursePeriod: {
                    include: {
                        Organizer: true
                    }
                },
                Registration: {
                    include: {
                        CourseTrack: {
                            select: {
                                title: true
                            }
                        }
                    }
                },
                EventRegistration: {
                    include: {
                        Event: {
                            select: {
                                title: true,
                                startDateTime: true,
                                locationName: true
                            }
                        }
                    }
                },
                Invoice: true,
                CreditNote: {
                    include: {
                        Invoice: true
                    },
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 1
                }
            }
        })

        if (!order) {
            return NextResponse.json(
                { error: 'Order not found' },
                { status: 404 }
            )
        }

        const purchaserEmail = (order.PersonProfile.UserAccount as unknown as { email: string }[])?.[0]?.email || order.PersonProfile.email

        if (!purchaserEmail) {
            return NextResponse.json(
                { error: 'No email address found for purchaser' },
                { status: 400 }
            )
        }

        let result

        switch (emailType) {
            case 'ticket': {
                const attachments: Array<{ filename: string; content: Buffer }> = []
                
                // Send course tickets with PDF
                if (order.Registration.length > 0 && order.CoursePeriod) {
                    const { generateCourseTicketPDF } = await import('@/lib/tickets/pdf-generator')
                    const { DEFAULT_PLATFORM_INFO } = await import('@/lib/tickets/legal-requirements')
                    
                    const trackNames = order.Registration.map(r => r.CourseTrack.title)
                    const period = order.CoursePeriod
                    
                    // Get the course ticket with QR code
                    const courseTicket = await prisma.ticket.findUnique({
                        where: {
                            periodId_personId: {
                                periodId: period.id,
                                personId: order.purchaserPersonId
                            }
                        }
                    })
                    
                    if (courseTicket) {
                        // Build seller info from organizer's legal information
                        // Parse legalAddress: "Street 123, 0123 Oslo, Norway" format
                        let addressInfo: { street?: string; postalCode?: string; city?: string; country: string } | undefined
                        if (period.Organizer.legalAddress) {
                            const parts = period.Organizer.legalAddress.split(',')
                            const street = parts[0]?.trim()
                            const cityPart = parts[1]?.trim() // "0123 Oslo"
                            const postalCodeMatch = cityPart?.match(/^(\d{4})\s+(.+)$/)
                            
                            addressInfo = {
                                street,
                                postalCode: postalCodeMatch?.[1],
                                city: postalCodeMatch?.[2] || cityPart || period.Organizer.city || undefined,
                                country: period.Organizer.country
                            }
                        }
                        
                        const seller = {
                            legalName: period.Organizer.legalName || period.Organizer.name,
                            organizationNumber: period.Organizer.organizationNumber || undefined,
                            address: addressInfo,
                            contactEmail: period.Organizer.legalEmail || period.Organizer.contactEmail || undefined,
                            vatRegistered: period.Organizer.vatRegistered || period.Organizer.mvaReportingRequired,
                            vatNumber: period.Organizer.vatRegistered && period.Organizer.organizationNumber ? period.Organizer.organizationNumber : undefined,
                            logoUrl: period.Organizer.logoUrl || undefined
                        }
                        
                        const buyerInfo = {
                            name: `${order.PersonProfile.firstName || ''} ${order.PersonProfile.lastName || ''}`.trim() || 'Guest',
                            email: order.PersonProfile.email
                        }
                        
                        if (!order.orderNumber) {
                            throw new Error('Ordrenummer mangler - ordren må fullføres før dokumenter kan sendes')
                        }
                        
                        const transactionInfo = {
                            orderNumber: order.orderNumber,
                            transactionDate: order.createdAt,
                            paymentMethod: 'Kort (Stripe)'
                        }
                        
                        let vatBreakdown = undefined
                        if (seller.vatRegistered && order.mvaCents > 0) {
                            const mvaRate = Number(period.Organizer.mvaRate || 25)
                            vatBreakdown = {
                                netAmountCents: order.totalCents - order.mvaCents,
                                vatRate: mvaRate,
                                vatAmountCents: order.mvaCents,
                                grossAmountCents: order.totalCents,
                                pricesIncludeVat: true
                            }
                        }
                        
                        // Build line items from registrations
                        // Since individual registration prices aren't stored, divide total by count
                        const pricePerRegistration = Math.floor(order.subtotalAfterDiscountCents / order.Registration.length)
                        const lineItems = order.Registration.map(reg => ({
                            description: reg.CourseTrack?.title || 'Kurs',
                            quantity: 1,
                            unitPriceCents: pricePerRegistration,
                            totalPriceCents: pricePerRegistration
                        }))
                        
                        const pdfBuffer = await generateCourseTicketPDF({
                            periodName: period.name,
                            trackNames: trackNames,
                            startDate: period.startDate || new Date(),
                            endDate: period.endDate || new Date(),
                            qrToken: courseTicket.qrTokenHash,
                            seller,
                            buyer: buyerInfo,
                            transaction: transactionInfo,
                            vat: vatBreakdown,
                            lineItems,
                            platform: DEFAULT_PLATFORM_INFO
                        })
                        
                        attachments.push({
                            filename: `kursbekreftelse-${order.orderNumber}.pdf`,
                            content: pdfBuffer
                        })

                        // Generate and attach order receipt
                        const { generateOrderReceiptPDF } = await import('@/lib/tickets/pdf-generator')
                        const receiptPdf = await generateOrderReceiptPDF({
                            seller,
                            buyer: buyerInfo,
                            transaction: transactionInfo,
                            lineItems,
                            vat: vatBreakdown,
                            platform: DEFAULT_PLATFORM_INFO
                        })

                        attachments.push({
                            filename: `kvittering-${order.orderNumber}.pdf`,
                            content: receiptPdf
                        })
                    }
                    
                    result = await emailService.sendTransactional({
                        organizerId: order.organizerId,
                        templateSlug: 'course-ticket',
                        recipientEmail: purchaserEmail,
                        recipientName: `${order.PersonProfile.firstName} ${order.PersonProfile.lastName}`,
                        variables: {
                            recipientName: `${order.PersonProfile.firstName} ${order.PersonProfile.lastName}`,
                            courseName: trackNames.join(', '),
                            coursePeriod: period.name || 'N/A',
                            courseTime: 'Se detaljert timeplan',
                            courseLocation: order.Organizer.city || 'Se detaljert informasjon',
                            ticketNumber: order.orderNumber,
                            ticketUrl: `${process.env.NEXT_PUBLIC_APP_URL}/my/tickets`,
                            organizerName: order.Organizer.name,
                            currentYear: new Date().getFullYear().toString()
                        },
                        language: 'no',
                        attachments
                    })
                }

                if (order.EventRegistration.length > 0) {
                    const { generateEventTicketPDF, generateOrderReceiptPDF } = await import('@/lib/tickets/pdf-generator')
                    const { DEFAULT_PLATFORM_INFO } = await import('@/lib/tickets/legal-requirements')
                    
                    // Build seller info
                    let addressInfo: { street?: string; postalCode?: string; city?: string; country: string } | undefined
                    if (order.Organizer.legalAddress) {
                        const parts = order.Organizer.legalAddress.split(',')
                        const street = parts[0]?.trim()
                        const cityPart = parts[1]?.trim()
                        const postalCodeMatch = cityPart?.match(/^(\d{4})\s+(.+)$/)
                        
                        addressInfo = {
                            street,
                            postalCode: postalCodeMatch?.[1],
                            city: postalCodeMatch?.[2] || cityPart || order.Organizer.city || undefined,
                            country: order.Organizer.country
                        }
                    }
                    
                    const seller = {
                        legalName: order.Organizer.legalName || order.Organizer.name,
                        organizationNumber: order.Organizer.organizationNumber || undefined,
                        address: addressInfo,
                        contactEmail: order.Organizer.legalEmail || order.Organizer.contactEmail || undefined,
                        vatRegistered: order.Organizer.vatRegistered || order.Organizer.mvaReportingRequired,
                        vatNumber: order.Organizer.vatRegistered && order.Organizer.organizationNumber ? order.Organizer.organizationNumber : undefined,
                        logoUrl: order.Organizer.logoUrl || undefined
                    }
                    
                    const buyerInfo = {
                        name: `${order.PersonProfile.firstName || ''} ${order.PersonProfile.lastName || ''}`.trim() || 'Guest',
                        email: order.PersonProfile.email
                    }
                    
                    if (!order.orderNumber) {
                        throw new Error('Ordrenummer mangler - ordren må fullføres før dokumenter kan sendes')
                    }
                    
                    const transactionInfo = {
                        orderNumber: order.orderNumber,
                        transactionDate: order.createdAt,
                        paymentMethod: 'Kort (Stripe)'
                    }
                    
                    let vatBreakdown = undefined
                    if (seller.vatRegistered && order.mvaCents > 0) {
                        const mvaRate = Number(order.Organizer.mvaRate || 25)
                        vatBreakdown = {
                            netAmountCents: order.totalCents - order.mvaCents,
                            vatRate: mvaRate,
                            vatAmountCents: order.mvaCents,
                            grossAmountCents: order.totalCents,
                            pricesIncludeVat: true
                        }
                    }

                    const eventAttachments: Array<{ filename: string; content: Buffer }> = []

                    // Calculate price per registration if unitPriceCents is 0
                    const totalEventRegs = order.EventRegistration.reduce((sum, reg) => sum + reg.quantity, 0)
                    const pricePerTicket = totalEventRegs > 0 ? Math.floor(order.subtotalAfterDiscountCents / totalEventRegs) : 0

                    // Generate event ticket PDFs - one per ticket
                    let ticketCounter = 0
                    for (const eventReg of order.EventRegistration) {
                        const unitPrice = eventReg.unitPriceCents || pricePerTicket
                        
                        // Generate separate PDF for each ticket in the quantity
                        for (let i = 1; i <= eventReg.quantity; i++) {
                            ticketCounter++
                            
                            const lineItem = {
                                description: eventReg.Event.title,
                                quantity: 1,
                                unitPriceCents: unitPrice,
                                totalPriceCents: unitPrice
                            }

                            const pdfBuffer = await generateEventTicketPDF({
                                ticketNumber: ticketCounter,
                                totalTickets: totalEventRegs,
                                eventTitle: eventReg.Event.title,
                                eventDate: eventReg.Event.startDateTime,
                                eventVenue: eventReg.Event.locationName || undefined,
                                qrToken: `ORDER-${order.id}-TICKET-${ticketCounter}`,
                                seller,
                                buyer: buyerInfo,
                                transaction: transactionInfo,
                                vat: vatBreakdown,
                                lineItem,
                                platform: DEFAULT_PLATFORM_INFO
                            })

                            eventAttachments.push({
                                filename: `billett-${ticketCounter}-${eventReg.Event.title.replace(/\s+/g, '-')}-${order.orderNumber}.pdf`,
                                content: pdfBuffer
                            })
                        }
                    }

                    // Generate order receipt with correct prices
                    const orderItems = order.EventRegistration.map(reg => {
                        const unitPrice = reg.unitPriceCents || pricePerTicket
                        return {
                            description: reg.Event.title,
                            quantity: reg.quantity,
                            unitPriceCents: unitPrice,
                            totalPriceCents: unitPrice * reg.quantity
                        }
                    })

                    const receiptPdf = await generateOrderReceiptPDF({
                        seller,
                        buyer: buyerInfo,
                        transaction: transactionInfo,
                        lineItems: orderItems,
                        vat: vatBreakdown,
                        platform: DEFAULT_PLATFORM_INFO
                    })

                    eventAttachments.push({
                        filename: `kvittering-${order.orderNumber}.pdf`,
                        content: receiptPdf
                    })

                    // Send event ticket email with all attachments
                    result = await emailService.sendTransactional({
                        organizerId: order.organizerId,
                        templateSlug: 'event-ticket',
                        recipientEmail: purchaserEmail,
                        recipientName: `${order.PersonProfile.firstName} ${order.PersonProfile.lastName}`,
                        variables: {
                            recipientName: `${order.PersonProfile.firstName} ${order.PersonProfile.lastName}`,
                            eventName: order.EventRegistration.map(r => r.Event.title).join(', '),
                            eventDate: new Date(order.EventRegistration[0].Event.startDateTime).toLocaleDateString('no-NO'),
                            eventTime: new Date(order.EventRegistration[0].Event.startDateTime).toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
                            eventLocation: order.EventRegistration[0].Event.locationName || 'Ikke oppgitt',
                            ticketNumber: order.orderNumber,
                            ticketUrl: `${process.env.NEXT_PUBLIC_APP_URL}/my/tickets`,
                            organizerName: order.Organizer.name,
                            currentYear: new Date().getFullYear().toString()
                        },
                        language: 'no',
                        attachments: eventAttachments
                    })
                }

                break
            }

            case 'invoice': {
                if (!order.Invoice) {
                    return NextResponse.json(
                        { error: 'No invoice found for this order' },
                        { status: 400 }
                    )
                }

                const { generateOrderReceiptPDF } = await import('@/lib/tickets/pdf-generator')
                const { DEFAULT_PLATFORM_INFO } = await import('@/lib/tickets/legal-requirements')

                // Build seller info
                let addressInfo: { street?: string; postalCode?: string; city?: string; country: string } | undefined
                if (order.Organizer.legalAddress) {
                    const parts = order.Organizer.legalAddress.split(',')
                    const street = parts[0]?.trim()
                    const cityPart = parts[1]?.trim()
                    const postalCodeMatch = cityPart?.match(/^(\d{4})\s+(.+)$/)
                    
                    addressInfo = {
                        street,
                        postalCode: postalCodeMatch?.[1],
                        city: postalCodeMatch?.[2] || cityPart || order.Organizer.city || undefined,
                        country: order.Organizer.country
                    }
                }
                
                const seller = {
                    legalName: order.Organizer.legalName || order.Organizer.name,
                    organizationNumber: order.Organizer.organizationNumber || undefined,
                    address: addressInfo,
                    contactEmail: order.Organizer.legalEmail || order.Organizer.contactEmail || undefined,
                    vatRegistered: order.Organizer.vatRegistered || order.Organizer.mvaReportingRequired,
                    vatNumber: order.Organizer.vatRegistered && order.Organizer.organizationNumber ? order.Organizer.organizationNumber : undefined,
                    logoUrl: order.Organizer.logoUrl || undefined
                }
                
                const buyerInfo = {
                    name: `${order.PersonProfile.firstName || ''} ${order.PersonProfile.lastName || ''}`.trim() || 'Guest',
                    email: order.PersonProfile.email
                }
                
                if (!order.orderNumber) {
                    throw new Error('Ordrenummer mangler - ordren må fullføres før dokumenter kan sendes')
                }
                
                const transactionInfo = {
                    orderNumber: order.orderNumber,
                    transactionDate: order.createdAt,
                    paymentMethod: 'Kort (Stripe)'
                }
                
                let vatBreakdown = undefined
                if (seller.vatRegistered && order.mvaCents > 0) {
                    const mvaRate = Number(order.Organizer.mvaRate || 25)
                    vatBreakdown = {
                        netAmountCents: order.totalCents - order.mvaCents,
                        vatRate: mvaRate,
                        vatAmountCents: order.mvaCents,
                        grossAmountCents: order.totalCents,
                        pricesIncludeVat: true
                    }
                }

                // Build line items based on order type
                let lineItems: Array<{
                    description: string
                    quantity: number
                    unitPriceCents: number
                    totalPriceCents: number
                }>

                if (order.Registration.length > 0) {
                    // Course registrations
                    const pricePerRegistration = Math.floor(order.subtotalAfterDiscountCents / order.Registration.length)
                    lineItems = order.Registration.map(reg => ({
                        description: reg.CourseTrack?.title || 'Kurs',
                        quantity: 1,
                        unitPriceCents: pricePerRegistration,
                        totalPriceCents: pricePerRegistration
                    }))
                } else {
                    // Event registrations
                    lineItems = order.EventRegistration.map(reg => ({
                        description: reg.Event.title,
                        quantity: reg.quantity,
                        unitPriceCents: reg.unitPriceCents,
                        totalPriceCents: reg.unitPriceCents * reg.quantity
                    }))
                }

                // Generate receipt PDF
                const receiptPdf = await generateOrderReceiptPDF({
                    seller,
                    buyer: buyerInfo,
                    transaction: transactionInfo,
                    lineItems,
                    vat: vatBreakdown,
                    platform: DEFAULT_PLATFORM_INFO
                })

                // Send order confirmation with receipt PDF
                result = await emailService.sendTransactional({
                    organizerId: order.organizerId,
                    templateSlug: 'order-confirmation',
                    recipientEmail: purchaserEmail,
                    recipientName: `${order.PersonProfile.firstName} ${order.PersonProfile.lastName}`,
                    variables: {
                        recipientName: `${order.PersonProfile.firstName} ${order.PersonProfile.lastName}`,
                        organizationName: order.Organizer.name,
                        eventName: order.Registration.length > 0 
                            ? order.Registration.map(r => r.CourseTrack.title).join(', ')
                            : order.EventRegistration[0]?.Event.title || 'Ordre',
                        eventDate: order.CoursePeriod?.startDate 
                            ? new Date(order.CoursePeriod.startDate).toLocaleDateString('no-NO')
                            : order.EventRegistration[0]?.Event.startDateTime
                                ? new Date(order.EventRegistration[0].Event.startDateTime).toLocaleDateString('no-NO')
                                : 'Ikke oppgitt',
                        orderTotal: `${(order.totalCents / 100).toFixed(2)} kr`,
                        orderNumber: order.orderNumber,
                        ticketUrl: `${process.env.NEXT_PUBLIC_APP_URL}/my/tickets`,
                        currentYear: new Date().getFullYear().toString()
                    },
                    language: 'no',
                    attachments: [{
                        filename: `kvittering-${order.orderNumber}.pdf`,
                        content: receiptPdf
                    }]
                })

                break
            }

            case 'credit-note': {
                const creditNote = order.CreditNote[0]

                if (!creditNote) {
                    return NextResponse.json(
                        { error: 'No credit note found for this order' },
                        { status: 400 }
                    )
                }

                // Send registration cancelled email
                result = await emailService.sendTransactional({
                    organizerId: order.organizerId,
                    templateSlug: 'registration-cancelled',
                    recipientEmail: purchaserEmail,
                    recipientName: `${order.PersonProfile.firstName} ${order.PersonProfile.lastName}`,
                    variables: {
                        recipientName: `${order.PersonProfile.firstName} ${order.PersonProfile.lastName}`,
                        courseName: order.Registration.length > 0 
                            ? order.Registration.map(r => r.CourseTrack.title).join(', ')
                            : order.EventRegistration[0]?.Event.title || 'Ordre',
                        orderNumber: order.orderNumber,
                        orderTotal: `${(order.totalCents / 100).toFixed(2)} kr`,
                        refundAmount: `${(creditNote.totalCents / 100).toFixed(2)} kr`,
                        refundMessage: order.status === 'REFUNDED' 
                            ? 'Refusjonen vil bli kreditert din konto innen 5-10 virkedager.'
                            : 'Refusjon behandles manuelt.',
                        cancelledDate: new Date(creditNote.createdAt).toLocaleDateString('no-NO'),
                        organizerName: order.Organizer.name,
                        organizerUrl: `${process.env.NEXT_PUBLIC_APP_URL}/organizer/${order.Organizer.slug}`,
                        currentYear: new Date().getFullYear().toString()
                    },
                    language: 'no'
                })

                break
            }

            default: {
                return NextResponse.json(
                    { error: 'Invalid email type' },
                    { status: 400 }
                )
            }
        }

        if (result && !result.success) {
            return NextResponse.json(
                { error: result.error || 'Failed to send email' },
                { status: 500 }
            )
        }

        return NextResponse.json({ 
            success: true, 
            messageId: result?.messageId 
        })

    } catch (error) {
        console.error('[send-order-email] Error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json(
            { error: `Failed to send order email: ${errorMessage}` },
            { status: 500 }
        )
    }
}
