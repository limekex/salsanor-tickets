'use server'

import { prisma } from '@/lib/db'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import Papa from 'papaparse'
import { requireOrganizerAccess } from '@/utils/auth-admin'
import { generateMemberNumber } from '@/lib/member-number'

interface MembershipRow {
  Email: string
  Phone?: string
  FirstName: string
  LastName: string
  MemberNumber?: string
  ValidFrom: string
  ValidTo: string
  Status?: string
}

interface ImportSummary {
  total: number
  created: number
  updated: number
  skipped: number
  errors: string[]
}

export async function importMemberships(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Get user's organization
  const userAccount = await prisma.userAccount.findUnique({
    where: { supabaseUid: user.id },
    include: {
      UserAccountRole: {
        where: {
          OR: [
            { role: 'ADMIN' },
            { role: 'ORG_ADMIN' }
          ]
        },
        include: { Organizer: true }
      }
    }
  })

  if (!userAccount?.UserAccountRole?.[0]?.Organizer) {
    return { error: 'No organization access' }
  }

  const organizerId = userAccount.UserAccountRole[0].Organizer.id
  const file = formData.get('file') as File
  
  if (!file) {
    return { error: 'No file provided' }
  }

  // Get default tier for this organization (or first available tier)
  const defaultTier = await prisma.membershipTier.findFirst({
    where: { organizerId },
    orderBy: { createdAt: 'asc' }
  })

  if (!defaultTier) {
    return { error: 'No membership tiers found for this organization. Please create a membership tier first.' }
  }

  try {
    const text = await file.text()
    
    const result = Papa.parse<MembershipRow>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim()
    })

    const summary: ImportSummary = {
      total: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: []
    }

    for (let i = 0; i < result.data.length; i++) {
      const row = result.data[i]
      summary.total++
      const rowNum = i + 2 // +2 because header is row 1, and array is 0-indexed

      try {
        // Validate required fields
        if (!row.Email?.trim()) {
          summary.errors.push(`Row ${rowNum}: Missing email`)
          summary.skipped++
          continue
        }

        if (!row.FirstName?.trim() || !row.LastName?.trim()) {
          summary.errors.push(`Row ${rowNum}: Missing first or last name`)
          summary.skipped++
          continue
        }

        if (!row.ValidFrom || !row.ValidTo) {
          summary.errors.push(`Row ${rowNum}: Missing validity dates`)
          summary.skipped++
          continue
        }

        // Parse dates
        const validFrom = new Date(row.ValidFrom)
        const validTo = new Date(row.ValidTo)

        if (isNaN(validFrom.getTime()) || isNaN(validTo.getTime())) {
          summary.errors.push(`Row ${rowNum}: Invalid date format`)
          summary.skipped++
          continue
        }

        if (validFrom >= validTo) {
          summary.errors.push(`Row ${rowNum}: ValidFrom must be before ValidTo`)
          summary.skipped++
          continue
        }

        // Find or create person
        let person = await prisma.personProfile.findFirst({
          where: { email: row.Email.trim().toLowerCase() }
        })

        if (!person) {
          person = await prisma.personProfile.create({
            data: {
              email: row.Email.trim().toLowerCase(),
              phone: row.Phone?.trim() || null,
              firstName: row.FirstName.trim(),
              lastName: row.LastName.trim()
            }
          })
        }

        // Check for existing membership
        const existing = await prisma.membership.findFirst({
          where: {
            personId: person.id,
            organizerId: organizerId,
            validFrom: validFrom
          }
        })

        if (existing) {
          // Update existing - keep existing member number if present
          const memberNumber = existing.memberNumber || 
            row.MemberNumber?.trim() || 
            await generateMemberNumber(organizerId, 'IMPORT')
            
          await prisma.membership.update({
            where: { id: existing.id },
            data: {
              memberNumber,
              validTo: validTo,
              status: (row.Status?.toUpperCase() as any) || 'ACTIVE',
              verificationToken: existing.verificationToken || crypto.randomUUID(),
            }
          })
          summary.updated++
        } else {
          // Create new - generate member number if not provided
          const memberNumber = row.MemberNumber?.trim() || 
            await generateMemberNumber(organizerId, 'IMPORT')
            
          await prisma.membership.create({
            data: {
              personId: person.id,
              organizerId: organizerId,
              tierId: defaultTier.id,
              memberNumber,
              validFrom: validFrom,
              validTo: validTo,
              status: (row.Status?.toUpperCase() as any) || 'ACTIVE',
              source: 'IMPORT',
              verificationToken: crypto.randomUUID(),
            }
          })
          summary.created++
        }
      } catch (error: any) {
        summary.errors.push(`Row ${rowNum}: ${error.message}`)
        summary.skipped++
      }
    }

    revalidatePath('/staffadmin/memberships')
    return { success: true, summary }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function listMemberships(organizerId: string, filters?: {
  status?: string
  search?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Not authenticated' }
  }

  try {
    const where: any = { organizerId }

    if (filters?.status && filters.status !== 'ALL') {
      where.status = filters.status
    }

    if (filters?.search) {
      where.OR = [
        { memberNumber: { contains: filters.search, mode: 'insensitive' } },
        { PersonProfile: { firstName: { contains: filters.search, mode: 'insensitive' } } },
        { PersonProfile: { lastName: { contains: filters.search, mode: 'insensitive' } } },
        { PersonProfile: { email: { contains: filters.search, mode: 'insensitive' } } },
      ]
    }

    const memberships = await prisma.membership.findMany({
      where,
      include: {
        PersonProfile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: [
        { validTo: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return { memberships }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function lookupMembership(email: string, organizerId: string, phone?: string) {
  try {
    const now = new Date()

    // Try email first
    let person = await prisma.personProfile.findFirst({
      where: { email: email.toLowerCase() },
      include: {
        Membership: {
          where: {
            organizerId,
            status: 'ACTIVE',
            validFrom: { lte: now },
            validTo: { gte: now }
          }
        }
      }
    })

    // Fallback to phone
    if (!person && phone) {
      person = await prisma.personProfile.findFirst({
        where: { phone },
        include: {
          Membership: {
            where: {
              organizerId,
              status: 'ACTIVE',
              validFrom: { lte: now },
              validTo: { gte: now }
            }
          }
        }
      })
    }

    const activeMembership = person?.Membership?.[0]

    if (activeMembership) {
      return {
        isActive: true,
        memberNumber: activeMembership.memberNumber,
        validTo: activeMembership.validTo,
        personId: person!.id
      }
    }

    return { isActive: false }
  } catch (error: any) {
    console.error('Membership lookup error:', error)
    return { isActive: false }
  }
}

export async function updateMembership(id: string, data: {
  memberNumber?: string
  validFrom?: Date
  validTo?: Date
  status?: string
  autoRenew?: boolean
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Not authenticated' }
  }

  try {
    await prisma.membership.update({
      where: { id },
      data: {
        ...data,
        status: data.status as any
      }
    })

    revalidatePath('/staffadmin/memberships')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function deleteMembership(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Not authenticated' }
  }

  try {
    await prisma.membership.delete({
      where: { id }
    })

    revalidatePath('/staffadmin/memberships')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function updateMembershipProduct(data: {
  enabled: boolean
  salesOpen: boolean
  description: string | null
}) {
  const user = await requireOrganizerAccess()
  const organizerId = user.userAccount.UserAccountRole[0]?.organizerId
  
  if (!organizerId) {
    throw new Error('No organization access')
  }

  await prisma.organizer.update({
    where: { id: organizerId },
    data: {
      membershipEnabled: data.enabled,
      membershipSalesOpen: data.salesOpen,
      membershipDescription: data.description,
    }
  })

  revalidatePath('/staffadmin/memberships/product')
  revalidatePath('/staffadmin/memberships')
}

export async function createMembershipOrder(data: {
  tierId: string
  email: string
  phone?: string
  firstName: string
  lastName: string
  photoDataUrl?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Must be logged in' }
  }

  // Get user account and person profile
  const userAccount = await prisma.userAccount.findUnique({
    where: { supabaseUid: user.id },
    include: { PersonProfile: true }
  })

  if (!userAccount) {
    return { error: 'User account not found' }
  }

  // Get tier and validate
  const tier = await prisma.membershipTier.findUnique({
    where: { id: data.tierId },
    include: { Organizer: true }
  })

  if (!tier || !tier.enabled) {
    return { error: 'Membership tier not available' }
  }

  if (!tier.Organizer.membershipEnabled || !tier.Organizer.membershipSalesOpen) {
    return { error: 'Membership sales are currently closed' }
  }

  // Check if user already has an active membership for this organization
  if (userAccount.PersonProfile) {
    const existingMembership = await prisma.membership.findFirst({
      where: {
        personId: userAccount.PersonProfile.id,
        organizerId: tier.organizerId,
        validTo: { gte: new Date() }
      }
    })

    if (existingMembership) {
      return { error: 'You already have an active membership' }
    }
  }

  // If no person profile, create one
  let personId = userAccount.PersonProfile?.id
  if (!personId) {
    const person = await prisma.personProfile.create({
      data: {
        email: data.email,
        phone: data.phone,
        firstName: data.firstName,
        lastName: data.lastName,
        photoUrl: data.photoDataUrl || null,
      }
    })
    
    await prisma.userAccount.update({
      where: { id: userAccount.id },
      data: { 
        PersonProfile: {
          connect: { id: person.id }
        }
      }
    })
    
    personId = person.id
  } else {
    // Update existing person profile with photo if provided
    if (data.photoDataUrl && userAccount.PersonProfile) {
      await prisma.personProfile.update({
        where: { id: userAccount.PersonProfile.id },
        data: { photoUrl: data.photoDataUrl }
      })
    }
  }

  // Create order for membership
  const validFrom = new Date()
  const validTo = new Date()
  validTo.setFullYear(validTo.getFullYear() + 1) // 1 year membership

  const priceCentsIncludingMva = Number(tier.priceCents)
  const isFree = priceCentsIncludingMva === 0
  const requiresValidation = tier.validationRequired

  console.log('[Membership Registration]', {
    tierId: tier.id,
    tierName: tier.name,
    validationRequired: tier.validationRequired,
    requiresValidation,
    isFree,
    priceCentsIncludingMva
  })

  // Calculate MVA based on tier configuration
  let subtotalCents = priceCentsIncludingMva
  let mvaCents = 0
  let mvaRate = 0
  let totalCents = priceCentsIncludingMva

  // Only calculate MVA if: tier has it enabled, org is VAT registered, and org has a rate set
  if (tier.mvaEnabled && tier.Organizer.vatRegistered && Number(tier.Organizer.mvaRate) > 0) {
    // MVA should be calculated - add it to the base price
    mvaRate = Number(tier.Organizer.mvaRate)
    subtotalCents = priceCentsIncludingMva
    mvaCents = Math.round(subtotalCents * (mvaRate / 100))
    totalCents = subtotalCents + mvaCents
  } else {
    // MVA-free product - no tax calculation
    subtotalCents = priceCentsIncludingMva
    mvaCents = 0
    mvaRate = 0
    totalCents = priceCentsIncludingMva
  }

  // Determine membership status based on validation requirement and payment
  let membershipStatus: 'ACTIVE' | 'PENDING_PAYMENT'
  let orderStatus: 'PAID' | 'PENDING'
  
  if (requiresValidation) {
    // If validation is required, membership stays PENDING_PAYMENT even if free
    // This allows admin review before activation
    membershipStatus = 'PENDING_PAYMENT'
    orderStatus = isFree ? 'PAID' : 'PENDING'
  } else {
    // No validation required, standard flow
    membershipStatus = isFree ? 'ACTIVE' : 'PENDING_PAYMENT'
    orderStatus = isFree ? 'PAID' : 'PENDING'
  }

  const order = await prisma.order.create({
    data: {
      purchaserPersonId: personId,
      organizerId: tier.organizerId,
      periodId: null,
      orderType: 'MEMBERSHIP',
      status: orderStatus,
      subtotalCents,
      discountCents: 0,
      subtotalAfterDiscountCents: subtotalCents,
      mvaRate: mvaRate,
      mvaCents,
      totalCents: totalCents,
      pricingSnapshot: {
        tier: {
          id: tier.id,
          name: tier.name,
          priceCents: tier.priceCents,
          mvaEnabled: tier.mvaEnabled,
          validationRequired: tier.validationRequired,
        }
      }
    }
  })

  // Generate member number after order creation
  const memberNumber = await generateMemberNumber(tier.organizerId, 'PURCHASE')

  // Create membership with generated member number
  await prisma.membership.create({
    data: {
      personId,
      organizerId: tier.organizerId,
      tierId: tier.id,
      memberNumber,
      validFrom,
      validTo,
      autoRenew: false,
      status: membershipStatus,
      verificationToken: crypto.randomUUID(),
      source: 'PURCHASE',
      orderId: order.id
    }
  })

  // For free memberships that don't require validation, redirect to success page directly
  if (isFree && !requiresValidation) {
    revalidatePath('/staffadmin/memberships')
    return { 
      success: true,
      orderId: order.id,
      skipPayment: true 
    }
  }

  // For memberships requiring validation (free or paid), redirect to pending page
  if (requiresValidation) {
    revalidatePath('/staffadmin/memberships')
    return { 
      success: true,
      orderId: order.id,
      skipPayment: isFree,
      requiresApproval: true
    }
  }

  return { 
    success: true,
    orderId: order.id 
  }
}
