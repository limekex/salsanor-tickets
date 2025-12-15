/**
 * This script updates the placeholder account with your real Supabase UID
 * 
 * To get your Supabase UID:
 * 1. Log in to the app
 * 2. Open browser console
 * 3. Run: (await supabase.auth.getUser()).data.user.id
 * 4. Copy the UID and paste it below
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// PASTE YOUR SUPABASE UID HERE:
const SUPABASE_UID = 'e0b91bbb-4234-4621-95ea-d4019523a02c'

async function updateAccount() {
    if (SUPABASE_UID === 'YOUR_SUPABASE_UID_HERE') {
        console.error('❌ Please update the SUPABASE_UID in the script first!')
        console.log('\nTo get your Supabase UID:')
        console.log('1. Log in to the app')
        console.log('2. Open browser console (F12)')
        console.log('3. Go to the Console tab')
        console.log('4. Paste this and press Enter:')
        console.log('   (await supabase.auth.getUser()).data.user.id')
        console.log('5. Copy the UID and update this script')
        return
    }

    const targetEmail = 'bjorn-tore@hosalmaas.no'

    // Find placeholder account
    const placeholderAccount = await prisma.userAccount.findUnique({
        where: { email: targetEmail }
    })

    if (!placeholderAccount) {
        console.error('❌ Account not found')
        return
    }

    // Update with real Supabase UID
    await prisma.userAccount.update({
        where: { id: placeholderAccount.id },
        data: { supabaseUid: SUPABASE_UID }
    })

    console.log('✅ Account updated with real Supabase UID')
    console.log('✅ You should now have admin access!')
    console.log('\nTry refreshing the page or logging out and back in.')
}

updateAccount()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
