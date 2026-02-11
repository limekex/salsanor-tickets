#!/usr/bin/env ts-node
/**
 * Check which test users exist in the database
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkUsers() {
  console.log('🔍 Checking for test users in database...\n')
  
  const testUsers = await prisma.userAccount.findMany({
    where: {
      OR: [
        { email: { contains: '@test.com' } },
        { email: { contains: '@salsanor.no' } },
        { email: { contains: '@bergensalsa.no' } }
      ]
    },
    select: {
      email: true,
      supabaseUid: true,
      createdAt: true,
      PersonProfile: {
        select: {
          firstName: true,
          lastName: true
        }
      },
      UserAccountRole: {
        select: {
          role: true,
          Organizer: {
            select: {
              name: true
            }
          }
        }
      }
    },
    orderBy: {
      email: 'asc'
    }
  })
  
  if (testUsers.length === 0) {
    console.log('❌ No test users found in database!')
    console.log('\n💡 Run the seed script first:')
    console.log('   npx prisma db seed')
    return
  }
  
  console.log(`✅ Found ${testUsers.length} test users:\n`)
  
  testUsers.forEach(user => {
    const profile = user.PersonProfile
    const roles = user.UserAccountRole.map(r => {
      const org = r.Organizer ? ` (${r.Organizer.name})` : ''
      return `${r.role}${org}`
    }).join(', ')
    
    console.log(`📧 ${user.email}`)
    console.log(`   Name: ${profile?.firstName} ${profile?.lastName}`)
    console.log(`   Supabase UID: ${user.supabaseUid}`)
    if (roles) console.log(`   Roles: ${roles}`)
    console.log('')
  })
  
  console.log('\n📝 Summary:')
  console.log(`   Participants: ${testUsers.filter(u => u.email.includes('@test.com')).length}`)
  console.log(`   Staff/Admin: ${testUsers.filter(u => !u.email.includes('@test.com')).length}`)
  console.log(`\n⚠️  Note: These users exist in PostgreSQL database, but they also need`)
  console.log(`   to exist in Supabase Auth to be able to log in.`)
}

checkUsers()
  .catch(e => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
