'use server'

import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

/**
 * POC: Test RLS session-based context
 * 
 * This demonstrates how to set session variables in Prisma transactions
 * for RLS enforcement without JWT in database connections.
 */

interface RLSTestResult {
  success: boolean
  organizerId: string | null
  isAdmin: boolean
  orderCount: number
  orders: Array<{
    id: string
    status: string
    organizerId: string
    totalCents: number
  }>
  error?: string
}

/**
 * Get user's organization context from auth
 */
async function getUserContext() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { organizerId: null, isAdmin: false, userId: null }
  }

  // Get user's roles from database
  const userAccount = await prisma.userAccount.findUnique({
    where: { supabaseUid: user.id },
    include: {
      UserAccountRole: {
        include: {
          Organizer: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
      }
    }
  })

  if (!userAccount) {
    return { organizerId: null, isAdmin: false, userId: null }
  }

  // Check if user is global admin
  const isAdmin = userAccount.UserAccountRole.some(r => r.role === 'ADMIN')

  // Get first organizerId from roles (prefer non-null)
  const orgRole = userAccount.UserAccountRole.find(r => r.organizerId !== null)
  const organizerId = orgRole?.organizerId || null

  return {
    organizerId,
    isAdmin,
    userId: userAccount.id,
    orgName: orgRole?.Organizer?.name || 'No organization'
  }
}

/**
 * Test RLS with session context (WITHOUT RLS enabled yet)
 * This tests the pattern - actual RLS enforcement happens when policies are enabled
 */
export async function testRLSSessionContext(): Promise<RLSTestResult> {
  try {
    // 1. Get user context from auth
    const context = await getUserContext()
    
    if (!context.organizerId && !context.isAdmin) {
      return {
        success: false,
        organizerId: null,
        isAdmin: false,
        orderCount: 0,
        orders: [],
        error: 'User has no organization context'
      }
    }

    // 2. Run query in transaction with session variables set
    const result = await prisma.$transaction(async (tx) => {
      // Set session variables that RLS policies will use
      if (context.organizerId) {
        await tx.$executeRawUnsafe(
          `SELECT set_config('app.organizer_id', $1, true)`,
          context.organizerId
        )
      }

      await tx.$executeRawUnsafe(
        `SELECT set_config('app.is_global_admin', $1, true)`,
        context.isAdmin.toString()
      )

      if (context.userId) {
        await tx.$executeRawUnsafe(
          `SELECT set_config('app.user_id', $1, true)`,
          context.userId
        )
      }

      // 3. Now run queries - RLS will enforce (when enabled)
      // For now, manually filter to test pattern
      const orders = await tx.order.findMany({
        where: context.isAdmin ? {} : {
          organizerId: context.organizerId || undefined
        },
        select: {
          id: true,
          status: true,
          organizerId: true,
          totalCents: true,
          Organizer: {
            select: {
              name: true,
              slug: true
            }
          }
        },
        take: 10,
        orderBy: {
          createdAt: 'desc'
        }
      })

      return {
        orders: orders.map(o => ({
          id: o.id,
          status: o.status,
          organizerId: o.organizerId,
          totalCents: o.totalCents,
          organizerName: o.Organizer.name
        })),
        count: orders.length
      }
    })

    return {
      success: true,
      organizerId: context.organizerId,
      isAdmin: context.isAdmin,
      orderCount: result.count,
      orders: result.orders as any
    }

  } catch (error) {
    console.error('RLS test error:', error)
    return {
      success: false,
      organizerId: null,
      isAdmin: false,
      orderCount: 0,
      orders: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Verify session variables are set correctly
 */
export async function verifySessionContext(organizerId: string): Promise<{
  success: boolean
  settings: Record<string, string | null>
  error?: string
}> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Set variables
      await tx.$executeRawUnsafe(
        `SELECT set_config('app.organizer_id', $1, true)`,
        organizerId
      )
      await tx.$executeRawUnsafe(
        `SELECT set_config('app.is_global_admin', $1, true)`,
        'false'
      )

      // Read them back
      const orgId = await tx.$queryRawUnsafe<[{ current_setting: string }]>(
        `SELECT current_setting('app.organizer_id', true) as current_setting`
      )
      
      const isAdmin = await tx.$queryRawUnsafe<[{ current_setting: string }]>(
        `SELECT current_setting('app.is_global_admin', true) as current_setting`
      )

      return {
        organizerId: orgId[0]?.current_setting || null,
        isAdmin: isAdmin[0]?.current_setting || null
      }
    })

    return {
      success: true,
      settings: result
    }
  } catch (error) {
    return {
      success: false,
      settings: {},
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
