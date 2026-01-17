import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

async function fixAdminRole() {
    const targetEmail = 'bjorn-tore@hosalmaas.no'

    console.log('=== Finding all accounts for', targetEmail, '===')

    const allAccounts = await prisma.userAccount.findMany({
        where: { email: targetEmail },
        include: { UserAccountRole: true, PersonProfile: true }
    })

    console.log(`Found ${allAccounts.length} account(s):`)
    allAccounts.forEach(acc => {
        console.log(`- UID: ${acc.supabaseUid}`)
        console.log(`  Roles: ${acc.UserAccountRole.map(r => r.role).join(', ') || 'none'}`)
        console.log(`  Has profile: ${!!acc.PersonProfile}`)
    })

    // Find the real account (not placeholder)
    const realAccount = allAccounts.find(acc => !acc.supabaseUid.startsWith('placeholder-'))
    const placeholderAccount = allAccounts.find(acc => acc.supabaseUid.startsWith('placeholder-'))

    if (!realAccount) {
        console.error('❌ No real account found. Please log in first.')
        return
    }

    console.log('\n=== Granting ADMIN to real account ===')

    // Check if real account already has ADMIN
    const hasAdmin = realAccount.UserAccountRole.some(r => r.role === 'ADMIN')
    if (hasAdmin) {
        console.log('✅ Real account already has ADMIN role')
    } else {
        // Grant ADMIN role to real account
        await prisma.userAccountRole.create({
            data: {
                id: randomUUID(),
                userId: realAccount.id,
                role: 'ADMIN',
                organizerId: null
            }
        })
        console.log('✅ ADMIN role granted to real account')
    }

    // Clean up placeholder account if it exists
    if (placeholderAccount) {
        console.log('\n=== Cleaning up placeholder account ===')
        await prisma.userAccountRole.deleteMany({
            where: { userId: placeholderAccount.id }
        })
        await prisma.userAccount.delete({
            where: { id: placeholderAccount.id }
        })
        console.log('✅ Placeholder account deleted')
    }

    console.log('\n✅ Done! You should now have admin access.')
}

fixAdminRole()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
