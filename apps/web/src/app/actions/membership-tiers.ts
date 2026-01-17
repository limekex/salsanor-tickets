'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireOrganizerAccess } from '@/utils/auth-admin'

const membershipTierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens'),
  description: z.string().optional(),
  priceCents: z.number().int().min(0),
  benefits: z.array(z.string()).optional(),
  discountPercent: z.number().min(0).max(100),
  priority: z.number().int().default(0),
  enabled: z.boolean().default(true),
  validationRequired: z.boolean().default(false),
  mvaEnabled: z.boolean().default(true),
})

export async function createMembershipTier(data: z.infer<typeof membershipTierSchema>) {
  const user = await requireOrganizerAccess()
  const organizerId = user.userAccount.roles[0]?.organizerId
  
  if (!organizerId) {
    throw new Error('No organization access')
  }
  
  const validated = membershipTierSchema.parse(data)

  const tier = await prisma.membershipTier.create({
    data: {
      organizerId,
      ...validated,
      benefits: validated.benefits || [],
    },
  })

  revalidatePath('/staffadmin/memberships/tiers')
  
  return {
    id: tier.id,
    organizerId: tier.organizerId,
    name: tier.name,
    slug: tier.slug,
    description: tier.description,
    priceCents: Number(tier.priceCents),
    benefits: tier.benefits as string[] || [],
    discountPercent: Number(tier.discountPercent),
    priority: tier.priority,
    enabled: tier.enabled,
    validationRequired: tier.validationRequired,
    mvaEnabled: tier.mvaEnabled,
    createdAt: tier.createdAt,
    updatedAt: tier.updatedAt,
  }
}

export async function updateMembershipTier(tierId: string, data: z.infer<typeof membershipTierSchema>) {
  const user = await requireOrganizerAccess()
  const organizerId = user.userAccount.roles[0]?.organizerId
  
  if (!organizerId) {
    throw new Error('No organization access')
  }
  
  console.log('[Update Tier] Received data:', {
    tierId,
    validationRequired: data.validationRequired,
    enabled: data.enabled,
    mvaEnabled: data.mvaEnabled
  })
  
  const validated = membershipTierSchema.parse(data)
  
  console.log('[Update Tier] After validation:', {
    tierId,
    validationRequired: validated.validationRequired,
    enabled: validated.enabled,
    mvaEnabled: validated.mvaEnabled
  })

  // Verify ownership
  const existing = await prisma.membershipTier.findFirst({
    where: { id: tierId, organizerId },
  })

  if (!existing) {
    throw new Error('Tier not found')
  }

  const tier = await prisma.membershipTier.update({
    where: { id: tierId },
    data: {
      ...validated,
      benefits: validated.benefits || [],
    },
  })
  
  console.log('[Update Tier] After save:', {
    tierId: tier.id,
    validationRequired: tier.validationRequired,
    enabled: tier.enabled,
    mvaEnabled: tier.mvaEnabled
  })

  revalidatePath('/staffadmin/memberships/tiers')
  
  return {
    id: tier.id,
    organizerId: tier.organizerId,
    name: tier.name,
    slug: tier.slug,
    description: tier.description,
    priceCents: Number(tier.priceCents),
    benefits: tier.benefits as string[] || [],
    discountPercent: Number(tier.discountPercent),
    priority: tier.priority,
    enabled: tier.enabled,
    validationRequired: tier.validationRequired,
    mvaEnabled: tier.mvaEnabled,
    createdAt: tier.createdAt,
    updatedAt: tier.updatedAt,
  }
}

export async function deleteMembershipTier(tierId: string) {
  const user = await requireOrganizerAccess()
  const organizerId = user.userAccount.roles[0]?.organizerId
  
  if (!organizerId) {
    throw new Error('No organization access')
  }

  // Check if tier has memberships
  const membershipCount = await prisma.membership.count({
    where: { tierId },
  })

  if (membershipCount > 0) {
    throw new Error('Cannot delete tier with active memberships')
  }

  await prisma.membershipTier.delete({
    where: {
      id: tierId,
      organizerId,
    },
  })

  revalidatePath('/staffadmin/memberships/tiers')
}

export async function listMembershipTiers() {
  const user = await requireOrganizerAccess()
  const organizerId = user.userAccount.roles[0]?.organizerId
  
  if (!organizerId) {
    throw new Error('No organization access')
  }

  const tiers = await prisma.membershipTier.findMany({
    where: { organizerId },
    orderBy: [{ priority: 'asc' }, { name: 'asc' }],
    include: {
      organizer: {
        select: {
          vatRegistered: true,
        },
      },
      _count: {
        select: { memberships: true },
      },
    },
  })

  return tiers.map(tier => ({
    id: tier.id,
    organizerId: tier.organizerId,
    name: tier.name,
    slug: tier.slug,
    description: tier.description,
    priceCents: Number(tier.priceCents),
    benefits: tier.benefits as string[] || [],
    discountPercent: Number(tier.discountPercent),
    priority: tier.priority,
    enabled: tier.enabled,
    validationRequired: tier.validationRequired,
    mvaEnabled: tier.mvaEnabled,
    createdAt: tier.createdAt,
    updatedAt: tier.updatedAt,
    memberCount: tier._count.memberships,
    organizerVatRegistered: tier.organizer.vatRegistered,
  }))
}

export async function getPublicMembershipTiers(organizerSlug: string) {
  const organizer = await prisma.organizer.findUnique({
    where: { slug: organizerSlug },
    select: { 
      id: true,
      name: true,
      membershipEnabled: true,
      membershipSalesOpen: true,
      membershipDescription: true,
      mvaRate: true,
      vatRegistered: true,
    }
  })

  if (!organizer) {
    return null
  }

  if (!organizer.membershipEnabled || !organizer.membershipSalesOpen) {
    return {
      organizer: {
        name: organizer.name,
        membershipEnabled: organizer.membershipEnabled,
        membershipSalesOpen: organizer.membershipSalesOpen,
        membershipDescription: organizer.membershipDescription,
        mvaRate: Number(organizer.mvaRate),
        vatRegistered: organizer.vatRegistered,
      },
      tiers: []
    }
  }

  const tiers = await prisma.membershipTier.findMany({
    where: {
      organizerId: organizer.id,
      enabled: true,
    },
    orderBy: [
      { priority: 'desc' },
      { priceCents: 'asc' }
    ]
  })

  return {
    organizer: {
      name: organizer.name,
      membershipEnabled: organizer.membershipEnabled,
      membershipSalesOpen: organizer.membershipSalesOpen,
      membershipDescription: organizer.membershipDescription,
      mvaRate: Number(organizer.mvaRate),
      vatRegistered: organizer.vatRegistered,
    },
    tiers: tiers.map(t => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      description: t.description,
      priceCents: Number(t.priceCents),
      benefits: t.benefits as string[] || [],
      discountPercent: Number(t.discountPercent),
      priority: t.priority,
      validationRequired: t.validationRequired,
      mvaEnabled: t.mvaEnabled,
    }))
  }
}
