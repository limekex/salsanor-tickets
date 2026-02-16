'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { createClient } from '@/utils/supabase/server'
import Stripe from 'stripe'
import { emailService } from '@/lib/email/email-service'
import { generateCreditNotePDF, CreditNoteData } from '@/lib/tickets/pdf-generator'
import { SellerInfo, BuyerInfo, TicketLineItem, DEFAULT_PLATFORM_INFO } from '@/lib/tickets/legal-requirements'

// Get Stripe client - will be configured per-request for Connect refunds
async function getStripeClient(connectedAccountId?: string | null) {
  const config = await prisma.paymentConfig.findUnique({ where: { provider: 'STRIPE' } })
  const apiKey = config?.secretKey || process.env.STRIPE_SECRET_KEY
  
  if (!apiKey) {
    throw new Error('Stripe API key not configured')
  }
  
  const stripeConfig: Stripe.StripeConfig = { apiVersion: '2025-11-17.clover' as any }
  
  // If connected account, configure Stripe to act on behalf of that account
  if (connectedAccountId) {
    stripeConfig.stripeAccount = connectedAccountId
  }
  
  return new Stripe(apiKey, stripeConfig)
}

export async function cancelRegistration(params: {
  registrationId: string
  refundPercentage: number // 0-100
  reason?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Not authenticated')
  }

  // Get registration with related data
  const registration = await prisma.registration.findUnique({
    where: { id: params.registrationId },
    include: {
      PersonProfile: true,
      CourseTrack: true,
      CoursePeriod: {
        include: {
          Organizer: true
        }
      },
      Order: {
        include: {
          Payment: true,
          Organizer: true,
          Registration: {
            select: { id: true, trackId: true }
          }
        }
      }
    }
  })

  if (!registration) {
    throw new Error('Registration not found')
  }

  // Check authorization - either own registration or org admin
  const userAccount = await prisma.userAccount.findUnique({
    where: { supabaseUid: user.id },
    include: {
      UserAccountRole: {
        where: {
          OR: [
            { role: 'ADMIN' },
            { role: 'ORG_ADMIN', organizerId: registration.CoursePeriod.organizerId },
            { role: 'ORG_FINANCE', organizerId: registration.CoursePeriod.organizerId }
          ]
        }
      },
      PersonProfile: true
    }
  })

  const isOwnRegistration = userAccount?.PersonProfile?.id === registration.personId
  const hasAdminAccess = userAccount && userAccount.UserAccountRole.length > 0

  if (!isOwnRegistration && !hasAdminAccess) {
    throw new Error('Unauthorized')
  }

  // Check if already cancelled
  if (registration.status === 'CANCELLED') {
    throw new Error('Registration already cancelled')
  }

  // Calculate refund amount based on the specific registration's track, not entire order
  // First, try to get per-item price from pricingSnapshot
  let itemAmount = 0
  const order = registration.Order
  
  if (order) {
    // Parse pricing snapshot to find this track's price
    try {
      let pricingSnapshot: any = order.pricingSnapshot
      if (typeof pricingSnapshot === 'string') {
        pricingSnapshot = JSON.parse(pricingSnapshot)
      }
      
      // Check if pricingSnapshot has lineItems with per-track pricing
      if (pricingSnapshot?.lineItems && Array.isArray(pricingSnapshot.lineItems)) {
        const lineItem = pricingSnapshot.lineItems.find(
          (li: any) => li.trackId === registration.trackId
        )
        if (lineItem) {
          itemAmount = lineItem.finalPriceCents || lineItem.basePriceCents || 0
        }
      }
      
      // Fallback: if single track in order, use order total
      if (itemAmount === 0) {
        const orderRegistrationCount = order.Registration?.length || 1
        if (orderRegistrationCount === 1) {
          // Single registration - use full order amount
          itemAmount = Number(order.totalCents || 0)
        } else {
          // Multiple registrations but no lineItems - divide evenly (best effort)
          itemAmount = Math.round(Number(order.totalCents || 0) / orderRegistrationCount)
        }
      }
    } catch (e) {
      console.error('Failed to parse pricingSnapshot:', e)
      // Fallback to dividing order total by number of registrations
      const orderRegistrationCount = order.Registration?.length || 1
      itemAmount = Math.round(Number(order.totalCents || 0) / orderRegistrationCount)
    }
  }
  
  const originalAmount = itemAmount
  const refundAmount = Math.round((originalAmount * params.refundPercentage) / 100)

  let refundMessage = 'Ingen refusjon'
  let stripeRefundId = null

  // Get the payment intent ID from either Order or Payment record
  const paymentIntentId = registration.Order?.stripePaymentIntentId 
    || registration.Order?.Payment?.[0]?.stripePaymentIntentId
    || null
  
  // Get the connected account ID for Stripe Connect refunds
  const connectedAccountId = registration.Order?.Organizer?.stripeConnectAccountId || null

  // Process refund if percentage > 0 and there's a payment intent
  if (params.refundPercentage > 0 && paymentIntentId) {
    try {
      console.log(`Processing refund: ${refundAmount} cents for payment_intent ${paymentIntentId}`)
      console.log(`Connected account: ${connectedAccountId || 'none (platform account)'}`)
      
      // Get Stripe client configured for the connected account
      const stripe = await getStripeClient(connectedAccountId)
      
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: refundAmount, // Stripe uses cents/øre
        reason: 'requested_by_customer',
        metadata: {
          registrationId: registration.id,
          refundPercentage: params.refundPercentage.toString(),
          reason: params.reason || 'Cancellation'
        }
      })
      
      stripeRefundId = refund.id
      console.log(`Refund created: ${refund.id}`)
      
      if (params.refundPercentage === 100) {
        refundMessage = 'Full refusjon vil bli behandlet innen 5-10 virkedager'
      } else {
        refundMessage = `${params.refundPercentage}% refusjon (${(refundAmount / 100).toFixed(2)} kr) vil bli behandlet innen 5-10 virkedager`
      }
    } catch (error: any) {
      console.error('Stripe refund error:', error)
      console.error('Error type:', error.type)
      console.error('Error code:', error.code)
      console.error('Error message:', error.message)
      
      // Provide more specific error message based on Stripe error
      if (error.code === 'charge_already_refunded') {
        throw new Error('Denne betalingen er allerede refundert.')
      } else if (error.code === 'amount_too_large') {
        throw new Error('Refusjonsbeløpet er større enn det som kan refunderes.')
      } else if (error.type === 'StripeInvalidRequestError') {
        throw new Error(`Stripe-feil: ${error.message}`)
      }
      
      throw new Error('Kunne ikke behandle refusjonen. Kontakt support.')
    }
  } else if (params.refundPercentage > 0) {
    refundMessage = 'Refusjon krever manuell behandling'
  }

  // Update registration status
  await prisma.registration.update({
    where: { id: registration.id },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancellationReason: params.reason,
      refundAmount: refundAmount,
      refundPercentage: params.refundPercentage,
      stripeRefundId: stripeRefundId
    }
  })

  // Create credit note if there's a refund
  let creditNote = null
  let creditNotePdfBuffer: Buffer | null = null
  
  if (params.refundPercentage > 0 && refundAmount > 0) {
    const organizer = registration.CoursePeriod.Organizer
    
    // Generate credit note number
    const year = new Date().getFullYear()
    const creditNoteCount = await prisma.creditNote.count({
      where: { organizerId: organizer.id }
    })
    const creditNumber = `CN-${year}-${String(creditNoteCount + 1).padStart(5, '0')}`
    
    // Calculate MVA
    const mvaRate = Number(organizer.mvaRate || 0) / 100
    const mvaCents = organizer.vatRegistered 
      ? Math.round(refundAmount * mvaRate / (1 + mvaRate))
      : 0
    
    // Create credit note record
    creditNote = await prisma.creditNote.create({
      data: {
        creditNumber,
        organizerId: organizer.id,
        reason: params.reason || 'Kansellering av registrering',
        refundType: params.refundPercentage === 100 ? 'FULL' : 'PARTIAL',
        originalAmountCents: originalAmount,
        refundAmountCents: refundAmount,
        mvaCents,
        totalCents: refundAmount,
        stripeRefundId,
        status: 'ISSUED',
        orderId: registration.orderId || undefined,
        registrationId: registration.id
      }
    })
    
    // Generate credit note PDF
    try {
      const sellerInfo: SellerInfo = {
        legalName: organizer.legalName || organizer.name,
        organizationNumber: organizer.organizationNumber || undefined,
        address: organizer.invoiceAddress as SellerInfo['address'],
        contactEmail: organizer.contactEmail || undefined,
        vatRegistered: organizer.vatRegistered,
        vatNumber: organizer.vatRegistered ? organizer.organizationNumber || undefined : undefined,
        logoUrl: organizer.logoUrl || undefined
      }
      
      const buyerInfo: BuyerInfo = {
        name: `${registration.PersonProfile.firstName} ${registration.PersonProfile.lastName}`,
        email: registration.PersonProfile.email
      }
      
      // Build line items from the order/registration
      // Include both track name and period name for clarity
      const trackName = registration.CourseTrack?.title
      const periodName = registration.CoursePeriod.name
      const description = trackName 
        ? `${trackName} (${periodName})`
        : `Kurs: ${periodName}`
      
      const lineItems: TicketLineItem[] = [{
        description,
        quantity: 1,
        unitPriceCents: originalAmount,
        totalPriceCents: originalAmount
      }]
      
      const creditNoteData: CreditNoteData = {
        creditNumber,
        issueDate: new Date(),
        originalOrderNumber: registration.Order?.orderNumber || undefined,
        originalTransactionDate: registration.Order?.createdAt,
        refundType: params.refundPercentage === 100 ? 'FULL' : params.refundPercentage > 0 ? 'PARTIAL' : 'NONE',
        refundPercentage: params.refundPercentage,
        reason: params.reason || 'Kansellering av registrering',
        originalAmountCents: originalAmount,
        refundAmountCents: refundAmount,
        mvaCents,
        totalCents: refundAmount,
        lineItems,
        seller: sellerInfo,
        buyer: buyerInfo,
        platform: DEFAULT_PLATFORM_INFO
      }
      
      creditNotePdfBuffer = await generateCreditNotePDF(creditNoteData)
      
      // Update credit note with PDF generation timestamp
      await prisma.creditNote.update({
        where: { id: creditNote.id },
        data: { pdfGeneratedAt: new Date() }
      })
    } catch (pdfError) {
      console.error('Failed to generate credit note PDF:', pdfError)
      // Continue without PDF - credit note record still exists
    }
  }

  // Update order if all registrations are cancelled
  if (registration.orderId) {
    const orderRegistrations = await prisma.registration.findMany({
      where: { orderId: registration.orderId }
    })
    
    const allCancelled = orderRegistrations.every(r => 
      r.id === registration.id || r.status === 'CANCELLED'
    )
    
    if (allCancelled) {
      await prisma.order.update({
        where: { id: registration.orderId },
        data: { 
          status: 'REFUNDED' // Mark as refunded regardless of percentage
        }
      })
    }
  }

  // Send cancellation email with credit note PDF attachment
  try {
    const userEmail = registration.PersonProfile.email
    const preferredLanguage = registration.PersonProfile.preferredLanguage || 'no'
    
    // Prepare attachments
    const attachments = creditNotePdfBuffer && creditNote ? [
      {
        filename: `kreditnota-${creditNote.creditNumber}.pdf`,
        content: creditNotePdfBuffer
      }
    ] : undefined
    
    await emailService.sendTransactional({
      templateSlug: 'registration-cancelled',
      recipientEmail: userEmail || '',
      recipientName: registration.PersonProfile.firstName,
      language: preferredLanguage,
      variables: {
        recipientName: registration.PersonProfile.firstName,
        courseName: registration.CoursePeriod.name,
        orderNumber: registration.Order?.orderNumber || 'N/A',
        orderTotal: `${(originalAmount / 100).toFixed(2)} kr`,
        refundAmount: params.refundPercentage > 0 ? `${(refundAmount / 100).toFixed(2)} kr` : '0 kr',
        refundMessage,
        cancelledDate: new Date().toLocaleDateString('no-NO'),
        organizerName: registration.CoursePeriod.Organizer.name,
        organizerUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/org/${registration.CoursePeriod.Organizer.slug}`,
        currentYear: new Date().getFullYear().toString(),
        creditNoteNumber: creditNote?.creditNumber || '',
        hasCreditNote: !!creditNote
      },
      attachments
    })
    
    // Update credit note as sent
    if (creditNote) {
      await prisma.creditNote.update({
        where: { id: creditNote.id },
        data: { 
          status: 'SENT',
          sentAt: new Date()
        }
      })
    }
  } catch (emailError) {
    console.error('Failed to send cancellation email:', emailError)
    // Don't throw - cancellation was successful even if email failed
  }

  revalidatePath('/profile')
  revalidatePath(`/org/${registration.CoursePeriod.Organizer.slug}`)
  
  return {
    success: true,
    refundAmount,
    refundMessage,
    creditNoteNumber: creditNote?.creditNumber
  }
}
