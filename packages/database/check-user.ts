import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.userAccount.findMany({
    include: { personProfile: true },
    orderBy: { createdAt: 'desc' },
    take: 5
  })
  
  console.log('Recent users:')
  users.forEach(user => {
    console.log(`\nEmail: ${user.email}`)
    console.log(`SupabaseUid: ${user.supabaseUid}`)
    console.log(`Has profile: ${!!user.personProfile}`)
    if (user.personProfile) {
      console.log(`Profile: ${user.personProfile.firstName} ${user.personProfile.lastName}`)
    }
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
