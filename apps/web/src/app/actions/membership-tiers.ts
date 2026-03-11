'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireOrganizerAccess } from '@/utils/auth-admin'
import { getSelectedOrganizerForAdmin } from '@/utils/auth-org-admin'

const membershipTierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens'),
  description: z.string().optional(),
  priceCents: z.number().int().min(0),
  benefits: z.array(z.string()).optional(),
  priority: z.number().int().default(0),
  enabled: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  validationRequired: z.boolean().default(false),
  mvaEnabled: z.boolean().default(true),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),
})

export async function createMembershipTier(data: z.infer<typeof membershipTierSchema>) {
  const { userAccount } = await requireOrganizerAccess()
  const organizerId = userAccount.UserAccountRole.find(r => r.organizerId)?.organizerId
  
  if (!organizerId) {
    throw new Error('No organization access')
  }
  
  const validated = membershipTierSchema.parse(data)

  // If this tier is being set as default, unset any other defaults for this org
  if (validated.isDefault) {
    await prisma.membershipTier.updateMany({
      where: { organizerId, isDefault: true },
      data: { isDefault: false },
    })
  }

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
    priority: tier.priority,
    enabled: tier.enabled,
    isDefault: tier.isDefault,
    validationRequired: tier.validationRequired,
    mvaEnabled: tier.mvaEnabled,
    accentColor: tier.accentColor,
    createdAt: tier.createdAt,
    updatedAt: tier.updatedAt,
  }
}

export async function updateMembershipTier(tierId: string, data: z.infer<typeof membershipTierSchema>) {
  const { userAccount } = await requireOrganizerAccess()
  const organizerId = userAccount.UserAccountRole.find(r => r.organizerId)?.organizerId
  
  if (!organizerId) {
    throw new Error('No organization access')
  }
  
  console.log('[Update Tier] Received data:', {
    tierId,
    validationRequired: data.validationRequired,
    enabled: data.enabled,
    mvaEnabled: data.mvaEnabled,
    isDefault: data.isDefault
  })
  
  const validated = membershipTierSchema.parse(data)
  
  // If this tier is being set as default, unset any other defaults for this org
  if (validated.isDefault) {
    await prisma.membershipTier.updateMany({
      where: { organizerId, isDefault: true, id: { not: tierId } },
      data: { isDefault: false },
    })
  }
  
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
    priority: tier.priority,
    enabled: tier.enabled,
    isDefault: tier.isDefault,
    validationRequired: tier.validationRequired,
    mvaEnabled: tier.mvaEnabled,
    createdAt: tier.createdAt,
    updatedAt: tier.updatedAt,
  }
}

export async function deleteMembershipTier(tierId: string) {
  const { userAccount } = await requireOrganizerAccess()
  const organizerId = userAccount.UserAccountRole.find(r => r.organizerId)?.organizerId
  
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
  // Use selected organization from context
  const organizerId = await getSelectedOrganizerForAdmin()

  const tiers = await prisma.membershipTier.findMany({
    where: { organizerId },
    orderBy: [{ priority: 'asc' }, { name: 'asc' }],
    include: {
      Organizer: {
        select: {
          vatRegistered: true,
        },
      },
      _count: {
        select: { Membership: true },
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
    priority: tier.priority,
    enabled: tier.enabled,
    isDefault: tier.isDefault,
    validationRequired: tier.validationRequired,
    mvaEnabled: tier.mvaEnabled,
    accentColor: tier.accentColor,
    createdAt: tier.createdAt,
    updatedAt: tier.updatedAt,
    memberCount: tier._count.Membership,
    organizerVatRegistered: tier.Organizer.vatRegistered,
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
      priority: t.priority,
      validationRequired: t.validationRequired,
      mvaEnabled: t.mvaEnabled,
    }))
  }
}
