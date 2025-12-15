import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkDatabase() {
    console.log('=== Checking all UserAccounts ===')
    const allUsers = await prisma.userAccount.findMany({
        include: {
            roles: true,
            personProfile: true
        }
    })

    console.log(`Total users: ${allUsers.length}\n`)

    allUsers.forEach(user => {
        console.log(`Email: ${user.email}`)
        console.log(`  Supabase UID: ${user.supabaseUid}`)
        console.log(`  Roles: ${user.roles.map(r => r.role).join(', ') || 'none'}`)
        console.log(`  Has profile: ${!!user.personProfile}`)
        if (user.personProfile) {
            console.log(`  Profile name: ${user.personProfile.firstName} ${user.personProfile.lastName}`)
        }
        console.log('')
    })

    console.log('=== Checking PersonProfiles without UserAccount ===')
    const orphanProfiles = await prisma.personProfile.findMany({
        where: { userId: null },
        select: {
            email: true,
            firstName: true,
            lastName: true
        }
    })

    if (orphanProfiles.length > 0) {
        console.log(`Found ${orphanProfiles.length} profiles without UserAccount:`)
        orphanProfiles.forEach(p => {
            console.log(`  - ${p.email} (${p.firstName} ${p.lastName})`)
        })
    } else {
        console.log('No orphan profiles found.')
    }
}

checkDatabase()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
