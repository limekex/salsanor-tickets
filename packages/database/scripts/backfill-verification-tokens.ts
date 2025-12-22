import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

async function backfillVerificationTokens() {
  console.log('Starting verification token backfill...')

  // Find all memberships without verification tokens
  const membershipsWithoutTokens = await prisma.membership.findMany({
    where: {
      verificationToken: null
    },
    select: {
      id: true,
      person: {
        select: {
          firstName: true,
          lastName: true
        }
      }
    }
  })

  console.log(`Found ${membershipsWithoutTokens.length} memberships without verification tokens`)

  // Update each membership with a new token
  let updated = 0
  for (const membership of membershipsWithoutTokens) {
    try {
      await prisma.membership.update({
        where: { id: membership.id },
        data: { verificationToken: randomUUID() }
      })
      updated++
      console.log(`✓ Updated membership for ${membership.person.firstName} ${membership.person.lastName}`)
    } catch (error) {
      console.error(`✗ Failed to update membership ${membership.id}:`, error)
    }
  }

  console.log(`\nBackfill complete: ${updated}/${membershipsWithoutTokens.length} memberships updated`)
}

backfillVerificationTokens()
  .catch((e) => {
    console.error('Error during backfill:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
