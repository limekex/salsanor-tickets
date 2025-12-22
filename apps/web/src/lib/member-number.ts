import { prisma } from '@/lib/db'

/**
 * Generates a unique member number for an organization
 * Format: PREFIX-YYYY-NNNN
 * - IMPORT: IMP-2025-0001
 * - PURCHASE: MBR-2025-0001
 */
export async function generateMemberNumber(
  organizerId: string,
  source: 'IMPORT' | 'PURCHASE' | 'MANUAL'
): Promise<string> {
  const prefix = source === 'IMPORT' ? 'IMP' : 'MBR'
  const year = new Date().getFullYear()

  // Atomically increment and get next number
  const org = await prisma.organizer.update({
    where: { id: organizerId },
    data: { nextMemberNumber: { increment: 1 } },
    select: { nextMemberNumber: true }
  })

  const memberNumber = `${prefix}-${year}-${String(org.nextMemberNumber).padStart(4, '0')}`
  
  return memberNumber
}
