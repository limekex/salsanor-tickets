'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { createClient } from '@/utils/supabase/server'
import Stripe from 'stripe'
import { emailService } from '@/lib/email/email-service'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

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
      person: {
        include: {
          user: true
        }
      },
      period: {
        include: {
          organizer: true
        }
      },
      order: true
    }
  })

  if (!registration) {
    throw new Error('Registration not found')
  }

  // Check authorization - either own registration or org admin
  const userAccount = await prisma.userAccount.findUnique({
    where: { supabaseUid: user.id },
    include: {
      roles: {
        where: {
          OR: [
            { role: 'ADMIN' },
            { role: 'ORG_ADMIN', organizerId: registration.period.organizerId },
            { role: 'ORG_FINANCE', organizerId: registration.period.organizerId }
          ]
        }
      },
      personProfile: true
    }
  })

  const isOwnRegistration = userAccount?.personProfile?.id === registration.personId
  const hasAdminAccess = userAccount && userAccount.roles.length > 0

  if (!isOwnRegistration && !hasAdminAccess) {
    throw new Error('Unauthorized')
  }

  // Check if already cancelled
  if (registration.status === 'CANCELLED') {
    throw new Error('Registration already cancelled')
  }

  // Calculate refund amount
  const originalAmount = Number(registration.order?.totalCents || 0)
  const refundAmount = Math.round((originalAmount * params.refundPercentage) / 100)

  let refundMessage = 'Ingen refusjon'
  let stripeRefundId = null

  // Process refund if percentage > 0 and there's a payment intent
  if (params.refundPercentage > 0 && registration.order?.stripePaymentIntentId) {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: registration.order.stripePaymentIntentId,
        amount: refundAmount, // Stripe uses cents/øre
        reason: params.reason ? 'requested_by_customer' : 'requested_by_customer',
        metadata: {
          registrationId: registration.id,
          refundPercentage: params.refundPercentage.toString(),
          reason: params.reason || 'Cancellation'
        }
      })
      
      stripeRefundId = refund.id
      
      if (params.refundPercentage === 100) {
        refundMessage = 'Full refusjon vil bli behandlet innen 5-10 virkedager'
      } else {
        refundMessage = `${params.refundPercentage}% refusjon (${(refundAmount / 100).toFixed(2)} kr) vil bli behandlet innen 5-10 virkedager`
      }
    } catch (error) {
      console.error('Stripe refund error:', error)
      throw new Error('Failed to process refund. Please contact support.')
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

  // Send cancellation email
  try {
    const userEmail = registration.person.user?.email || registration.person.email
    const preferredLanguage = registration.person.preferredLanguage || 'no'
    
    await emailService.sendTransactional({
      templateSlug: 'registration-cancelled',
      recipientEmail: userEmail,
      recipientName: registration.person.firstName,
      language: preferredLanguage,
      variables: {
        recipientName: registration.person.firstName,
        courseName: registration.period.name,
        orderNumber: registration.order?.orderNumber || 'N/A',
        orderTotal: `${(originalAmount / 100).toFixed(2)} kr`,
        refundAmount: params.refundPercentage > 0 ? `${(refundAmount / 100).toFixed(2)} kr` : '0 kr',
        refundMessage,
        cancelledDate: new Date().toLocaleDateString('no-NO'),
        organizerName: registration.period.organizer.name,
        organizerUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/org/${registration.period.organizer.slug}`,
        currentYear: new Date().getFullYear().toString()
      }
    })
  } catch (emailError) {
    console.error('Failed to send cancellation email:', emailError)
    // Don't throw - cancellation was successful even if email failed
  }

  revalidatePath('/profile')
  revalidatePath(`/org/${registration.period.organizer.slug}`)
  
  return {
    success: true,
    refundAmount,
    refundMessage
  }
}
