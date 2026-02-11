'use client'

import { useUser } from './use-user'

export interface OrganizerAccess {
  organizerId: string | null
  hasAccess: boolean
  isAdmin: boolean
  isFinanceManager: boolean
  isCheckinStaff: boolean
  roles: string[]
}

/**
 * Hook to check organization access for current user
 * 
 * @param organizerId - Optional organization ID to check. If not provided, returns first organization with access.
 * 
 * @example
 * ```tsx
 * const { hasAccess, isAdmin, organizerId } = useOrganizerAccess(params.organizerId)
 * 
 * if (!hasAccess) {
 *   return <Unauthorized />
 * }
 * 
 * if (isAdmin) {
 *   return <AdminTools />
 * }
 * ```
 */
export function useOrganizerAccess(organizerId?: string): OrganizerAccess {
  const { userAccount, isLoading } = useUser()

  // If loading, return no access
  if (isLoading || !userAccount) {
    return {
      organizerId: null,
      hasAccess: false,
      isAdmin: false,
      isFinanceManager: false,
      isCheckinStaff: false,
      roles: [],
    }
  }

  // If organizerId provided, check access for that specific org
  if (organizerId) {
    const orgRoles = userAccount.UserAccountRole.filter(r => r.organizerId === organizerId)
    
    if (orgRoles.length === 0) {
      return {
        organizerId,
        hasAccess: false,
        isAdmin: false,
        isFinanceManager: false,
        isCheckinStaff: false,
        roles: [],
      }
    }

    const roles = orgRoles.map(r => r.role)
    
    return {
      organizerId,
      hasAccess: true,
      isAdmin: roles.includes('ORG_ADMIN'),
      isFinanceManager: roles.includes('ORG_FINANCE'),
      isCheckinStaff: roles.includes('ORG_CHECKIN'),
      roles,
    }
  }

  // If no organizerId provided, return first organization with access
  const firstOrgRole = userAccount.UserAccountRole[0]
  
  if (!firstOrgRole || !firstOrgRole.organizerId) {
    return {
      organizerId: null,
      hasAccess: false,
      isAdmin: false,
      isFinanceManager: false,
      isCheckinStaff: false,
      roles: [],
    }
  }

  const orgRoles = userAccount.UserAccountRole.filter(r => r.organizerId === firstOrgRole.organizerId)
  const roles = orgRoles.map(r => r.role)

  return {
    organizerId: firstOrgRole.organizerId,
    hasAccess: true,
    isAdmin: roles.includes('ORG_ADMIN'),
    isFinanceManager: roles.includes('ORG_FINANCE'),
    isCheckinStaff: roles.includes('ORG_CHECKIN'),
    roles,
  }
}

/**
 * Hook to get all organizations user has access to
 * 
 * @example
 * ```tsx
 * const organizations = useUserOrganizations()
 * 
 * return (
 *   <Select>
 *     {organizations.map(org => (
 *       <option key={org.id} value={org.id}>{org.name}</option>
 *     ))}
 *   </Select>
 * )
 * ```
 */
export function useUserOrganizations() {
  const { userAccount, isLoading } = useUser()

  if (isLoading || !userAccount) {
    return []
  }

  // Get unique organizations
  const orgsMap = new Map()
  
  userAccount.UserAccountRole.forEach(role => {
    if (role.Organizer && !orgsMap.has(role.organizerId)) {
      orgsMap.set(role.organizerId, {
        id: role.Organizer.id,
        name: role.Organizer.name,
        slug: role.Organizer.slug,
        roles: [role.role],
      })
    } else if (role.Organizer && orgsMap.has(role.organizerId)) {
      const org = orgsMap.get(role.organizerId)
      org.roles.push(role.role)
    }
  })

  return Array.from(orgsMap.values())
}
