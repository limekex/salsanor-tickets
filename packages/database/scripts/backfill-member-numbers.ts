import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function generateMemberNumber(
  organizerId: string,
  source: string,
  year: number
): Promise<string> {
  const prefix = source === 'IMPORT' ? 'IMP' : 'MBR'

  // Atomically increment and get next number
  const org = await prisma.organizer.update({
    where: { id: organizerId },
    data: { nextMemberNumber: { increment: 1 } },
    select: { nextMemberNumber: true }
  })

  const memberNumber = `${prefix}-${year}-${String(org.nextMemberNumber).padStart(4, '0')}`
  
  return memberNumber
}

async function backfillMemberNumbers() {
  console.log('Starting member number backfill...')

  // Find all memberships without member numbers
  const membershipsWithoutNumbers = await prisma.membership.findMany({
    where: {
      memberNumber: null
    },
    select: {
      id: true,
      organizerId: true,
      source: true,
      validFrom: true,
      person: {
        select: {
          firstName: true,
          lastName: true
        }
      }
    },
    orderBy: {
      validFrom: 'asc' // Process oldest first
    }
  })

  console.log(`Found ${membershipsWithoutNumbers.length} memberships without member numbers`)

  // Group by organization to maintain sequence
  const byOrganization = new Map<string, typeof membershipsWithoutNumbers>()
  
  for (const membership of membershipsWithoutNumbers) {
    if (!byOrganization.has(membership.organizerId)) {
      byOrganization.set(membership.organizerId, [])
    }
    byOrganization.get(membership.organizerId)!.push(membership)
  }

  let updated = 0
  
  // Process each organization separately
  for (const [organizerId, memberships] of byOrganization) {
    console.log(`\nProcessing ${memberships.length} memberships for organization ${organizerId.slice(0, 8)}...`)
    
    for (const membership of memberships) {
      try {
        const year = new Date(membership.validFrom).getFullYear()
        const memberNumber = await generateMemberNumber(
          organizerId,
          membership.source,
          year
        )
        
        await prisma.membership.update({
          where: { id: membership.id },
          data: { memberNumber }
        })
        
        updated++
        console.log(`✓ Assigned ${memberNumber} to ${membership.person.firstName} ${membership.person.lastName}`)
      } catch (error) {
        console.error(`✗ Failed to update membership ${membership.id}:`, error)
      }
    }
  }

  console.log(`\nBackfill complete: ${updated}/${membershipsWithoutNumbers.length} member numbers assigned`)
}

backfillMemberNumbers()
  .catch((e) => {
    console.error('Error during backfill:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
