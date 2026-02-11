'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import type { User } from '@supabase/supabase-js'

export interface UserRole {
  id: string
  role: string
  organizerId: string | null
  Organizer?: {
    id: string
    name: string
    slug: string
  } | null
}

export interface UserAccount {
  id: string
  email: string
  supabaseUid: string
  UserAccountRole: UserRole[]
  PersonProfile?: {
    id: string
    firstName: string
    lastName: string
    phone: string | null
  } | null
}

export interface UseUserReturn {
  user: User | null
  userAccount: UserAccount | null
  isLoading: boolean
  error: Error | null
  hasRole: (role: string) => boolean
  hasOrgRole: (organizerId: string, role?: string) => boolean
  isOrgAdmin: (organizerId?: string) => boolean
  isGlobalAdmin: () => boolean
  refresh: () => Promise<void>
}

/**
 * Hook to get current user, their account, and role checking utilities
 * 
 * @example
 * ```tsx
 * const { user, userAccount, isOrgAdmin, hasRole } = useUser()
 * 
 * if (isOrgAdmin(organizerId)) {
 *   return <AdminPanel />
 * }
 * 
 * if (hasRole('STAFF')) {
 *   return <StaffTools />
 * }
 * ```
 */
export function useUser(): UseUserReturn {
  const [user, setUser] = useState<User | null>(null)
  const [userAccount, setUserAccount] = useState<UserAccount | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchUser = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const supabase = createClient()
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

      // If there's no user or session, that's fine - just set to null
      if (authError) {
        if (authError.message?.includes('session_not_found') || authError.message?.includes('Auth session missing')) {
          // Not logged in - this is expected, not an error
          setUser(null)
          setUserAccount(null)
          setIsLoading(false)
          return
        }
        console.error('Auth error:', authError)
        throw authError
      }

      setUser(authUser)

      if (authUser) {
        // Fetch user account with roles
        const response = await fetch('/api/user/account')
        if (!response.ok) {
          const errorText = await response.text()
          console.error('Failed to fetch user account:', response.status, errorText)
          throw new Error(`Failed to fetch user account: ${response.status}`)
        }
        const account = await response.json()
        setUserAccount(account)
      } else {
        setUserAccount(null)
      }
    } catch (err) {
      console.error('useUser error:', err)
      setError(err instanceof Error ? err : new Error('Unknown error'))
      // Don't reset user on account fetch error, only on auth error
      if (err instanceof Error && !err.message.includes('user account')) {
        setUser(null)
        setUserAccount(null)
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()

    // Subscribe to auth changes
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUser()
      } else {
        setUser(null)
        setUserAccount(null)
        setIsLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  /**
   * Check if user has a specific role (any organization)
   */
  const hasRole = (role: string): boolean => {
    return userAccount?.UserAccountRole.some(r => r.role === role) ?? false
  }

  /**
   * Check if user has a role for a specific organization
   */
  const hasOrgRole = (organizerId: string, role?: string): boolean => {
    if (!userAccount) return false
    return userAccount.UserAccountRole.some(r => {
      const matchesOrg = r.organizerId === organizerId
      const matchesRole = role ? r.role === role : true
      return matchesOrg && matchesRole
    })
  }

  /**
   * Check if user is admin for a specific organization (or any if no orgId provided)
   */
  const isOrgAdmin = (organizerId?: string): boolean => {
    if (!userAccount) return false
    if (organizerId) {
      return hasOrgRole(organizerId, 'ORG_ADMIN')
    }
    return hasRole('ORG_ADMIN')
  }

  /**
   * Check if user is global admin (ADMIN role)
   */
  const isGlobalAdmin = (): boolean => {
    return hasRole('ADMIN')
  }

  return {
    user,
    userAccount,
    isLoading,
    error,
    hasRole,
    hasOrgRole,
    isOrgAdmin,
    isGlobalAdmin,
    refresh: fetchUser,
  }
}
