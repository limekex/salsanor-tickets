#!/usr/bin/env ts-node
/**
 * Create test users in Supabase Auth
 * 
 * This script creates the test users defined in seed.ts in Supabase Auth
 * so they can actually log in to the application.
 * 
 * Usage:
 *   pnpm tsx scripts/create-test-users.ts                  # Create new users only
 *   pnpm tsx scripts/create-test-users.ts --update-passwords # Update passwords for existing users
 * 
 * Requirements:
 *   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables
 */

import { createClient } from '@supabase/supabase-js'

// Try to load from multiple possible locations
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

console.log('🔍 Debug info:')
console.log('   URL:', SUPABASE_URL?.substring(0, 40))
console.log('   Key type:', SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20))
console.log('')

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:')
  console.error('   SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)')
  console.error('   SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY)')
  console.error('')
  console.error('💡 Load them from your .env.local file:')
  console.error('   cd ../../apps/web')
  console.error('   source <(grep -E "SUPABASE" .env.local | sed "s/^/export /")')
  console.error('   cd ../../packages/database')
  console.error('   npx tsx scripts/create-test-users.ts --update-passwords')
  process.exit(1)
}

// Test users with their passwords
const TEST_USERS = [
  // Regular participants
  {
    email: 'alice@test.com',
    password: 'Test123!',
    firstName: 'Alice',
    lastName: 'Anderson',
    supabaseUid: 'test-user-1',
  },
  {
    email: 'bob@test.com',
    password: 'Test123!',
    firstName: 'Bob',
    lastName: 'Builder',
    supabaseUid: 'test-user-2',
  },
  {
    email: 'charlie@test.com',
    password: 'Test123!',
    firstName: 'Charlie',
    lastName: 'Chaplin',
    supabaseUid: 'test-user-3',
  },
  {
    email: 'diana@test.com',
    password: 'Test123!',
    firstName: 'Diana',
    lastName: 'Dancer',
    supabaseUid: 'test-user-4',
  },
  {
    email: 'eve@test.com',
    password: 'Test123!',
    firstName: 'Eve',
    lastName: 'Evans',
    supabaseUid: 'test-user-5',
  },
  {
    email: 'frank@test.com',
    password: 'Test123!',
    firstName: 'Frank',
    lastName: 'Franklin',
    supabaseUid: 'test-user-6',
  },
  
  // Staff users with roles
  {
    email: 'admin@salsanor.no',
    password: 'Admin123!',
    firstName: 'Super',
    lastName: 'Admin',
    supabaseUid: 'test-admin',
  },
  {
    email: 'orgadmin@salsanor.no',
    password: 'Admin123!',
    firstName: 'Org',
    lastName: 'Admin',
    supabaseUid: 'test-org-admin',
  },
  {
    email: 'finance@salsanor.no',
    password: 'Admin123!',
    firstName: 'Finance',
    lastName: 'Manager',
    supabaseUid: 'test-finance',
  },
  {
    email: 'checkin@salsanor.no',
    password: 'Admin123!',
    firstName: 'Checkin',
    lastName: 'Staff',
    supabaseUid: 'test-checkin',
  },
  {
    email: 'instructor@salsanor.no',
    password: 'Admin123!',
    firstName: 'Dance',
    lastName: 'Instructor',
    supabaseUid: 'test-instructor',
  },
  {
    email: 'admin@bergensalsa.no',
    password: 'Admin123!',
    firstName: 'Bergen',
    lastName: 'Admin',
    supabaseUid: 'test-bergen-admin',
  },
]

async function createTestUsers() {
  console.log('🔐 Creating/updating test users in Supabase Auth...\n')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // Check if --update-passwords flag is provided
  const updatePasswords = process.argv.includes('--update-passwords')

  // Get all existing users first
  const { data: allUsers, error: listError } = await supabase.auth.admin.listUsers()
  
  if (listError) {
    console.error('❌ Failed to list users:', listError.message)
    return
  }
  
  console.log(`Found ${allUsers?.users.length || 0} existing users in Supabase Auth\n`)

  for (const user of TEST_USERS) {
    try {
      // Check if user already exists
      const exists = allUsers?.users.find((u) => u.email === user.email)

      if (exists) {
        console.log(`⏭️  ${user.email} already exists (ID: ${exists.id})`)
        
        // Update password if --update-passwords flag is provided
        if (updatePasswords) {
          const { error: updateError } = await supabase.auth.admin.updateUserById(
            exists.id,
            { password: user.password }
          )
          
          if (updateError) {
            console.log(`   ❌ Failed to update password: ${updateError.message}`)
          } else {
            console.log(`   ✅ Password updated to: ${user.password}`)
          }
        }
        
        // Check if the UUID doesn't match
        if (exists.id !== user.supabaseUid) {
          console.log(`   ⚠️  Warning: Supabase UID mismatch!`)
          console.log(`      Expected: ${user.supabaseUid}`)
          console.log(`      Actual:   ${exists.id}`)
          console.log(`      You may need to update seed.ts or delete this user first.`)
        }
        continue
      }

      // Create new user with specific UUID
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          first_name: user.firstName,
          last_name: user.lastName,
        },
      })

      if (error) {
        console.error(`❌ Failed to create ${user.email}:`, error.message)
        continue
      }

      console.log(`✅ Created ${user.email}`)
      console.log(`   ID: ${data.user?.id}`)
      console.log(`   Password: ${user.password}`)
      
      // Warning if UUID doesn't match
      if (data.user?.id !== user.supabaseUid) {
        console.log(`   ⚠️  Note: Supabase generated a different UUID`)
        console.log(`      Expected: ${user.supabaseUid}`)
        console.log(`      Actual:   ${data.user?.id}`)
        console.log(`      Update seed.ts with the actual ID or delete and recreate`)
      }
    } catch (err) {
      console.error(`❌ Error creating ${user.email}:`, err)
    }
  }

  console.log('\n✨ Done!')
  console.log('\n📝 Test User Credentials:')
  console.log('\n   Participants:')
  console.log('   Email: alice@test.com, bob@test.com, charlie@test.com, etc.')
  console.log('   Password: Test123!')
  console.log('\n   Staff/Admin:')
  console.log('   Email: admin@salsanor.no, orgadmin@salsanor.no, finance@salsanor.no, etc.')
  console.log('   Password: Admin123!')
  
  if (!updatePasswords) {
    console.log('\n💡 Tip: To update passwords for existing users, run:')
    console.log('   pnpm tsx scripts/create-test-users.ts --update-passwords')
  }
}

createTestUsers().catch(console.error)
