#!/usr/bin/env ts-node
/**
 * Test Supabase connection
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('Testing Supabase connection...')
console.log('URL:', SUPABASE_URL)
console.log('Key starts with:', SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20))

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function test() {
  try {
    // Try to list users
    console.log('\nTrying auth.admin.listUsers()...')
    const { data, error } = await supabase.auth.admin.listUsers()
    
    if (error) {
      console.error('❌ Error:', error)
      return
    }
    
    console.log('✅ Success! Found', data.users.length, 'users')
    data.users.slice(0, 3).forEach(u => {
      console.log('  -', u.email, '(', u.id, ')')
    })
  } catch (err) {
    console.error('❌ Exception:', err)
  }
}

test()
