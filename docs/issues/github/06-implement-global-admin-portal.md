# Implement Global Admin Portal

## Priority
**HIGH** - Needed for system management

## Description
Build the global admin portal at `/admin` for ADMIN role users to manage all organizations, users, periods, and system configuration across the entire platform.

## Current Status
- ✅ ADMIN role exists in database
- ✅ Dashboard shows ADMIN role
- ✅ AdminNav component exists
- ⚠️ `/admin` routes not implemented
- ⚠️ No global admin pages
- ⚠️ No cross-organization management
- ✅ `/staffadmin` works for ORG_ADMIN

## Requirements

### Core Admin Routes
- [ ] `/admin` - Main admin dashboard
- [ ] `/admin/organizations` - Organization management
- [ ] `/admin/organizations/new` - Create organization
- [ ] `/admin/organizations/[id]` - Edit organization
- [ ] `/admin/users` - Global user management
- [ ] `/admin/users/[userId]` - User details & roles
- [ ] `/admin/periods` - All periods (cross-org)
- [ ] `/admin/tracks` - All tracks (cross-org)
- [ ] `/admin/registrations` - All registrations
- [ ] `/admin/finance` - Global financial reports
- [ ] `/admin/settings` - System configuration

### Organization Management
- [ ] List all organizations
  - Show name, slug, city, contact info
  - Show registration count, period count
  - Search and filter
- [ ] Create new organization
  - Name, slug, description
  - Contact email, website, city
  - Generate unique slug
- [ ] Edit organization
  - Update all details
  - Cannot change slug (or warn about consequences)
- [ ] View organization statistics
  - Total registrations
  - Active periods
  - Revenue (if finance module ready)
- [ ] Archive/deactivate organizations (soft delete)

### User Management (Global)
- [ ] List all users across all organizations
  - Show email, name, roles
  - Filter by role type
  - Search by email/name
- [ ] View user details
  - All roles (global and org-scoped)
  - Registration history across orgs
  - Created date
- [ ] Assign any role to any user
  - ADMIN (global)
  - CHECKIN (global)
  - ORG_ADMIN (org-scoped, select org)
  - ORG_FINANCE (org-scoped, select org)
  - ORG_CHECKIN (org-scoped, select org)
  - INSTRUCTOR (org-scoped, select org)
  - STAFF (org-scoped, select org)
- [ ] Remove roles from users
- [ ] Search users globally

### Period Management (Cross-Organization)
- [ ] List all periods from all organizations
  - Group by organization
  - Filter by organization
  - Filter by date range
  - Show status (upcoming, active, past)
- [ ] View period details
  - Organization context shown
  - Track list
  - Registration summary
- [ ] Create periods for any organization
- [ ] Edit periods for any organization
- [ ] View period analytics
  - Total registrations
  - Revenue
  - Capacity utilization

### Track Management (Cross-Organization)
- [ ] List all tracks across organizations
  - Show period and organization
  - Filter by organization/period
  - Show capacity and enrollment
- [ ] Create tracks for any organization
- [ ] Edit tracks for any organization

### Registration Management (Global)
- [ ] View all registrations across all organizations
  - Filter by organization
  - Filter by period
  - Filter by status
  - Search by participant name/email
- [ ] View registration details
  - Participant info
  - Organization and period
  - Tracks enrolled
  - Payment status
- [ ] Export registration data

### Organization Context Switching
- [ ] Cookie-based "admin org context"
  - Admin can "work as" specific organization
  - Context persists across navigation
  - Banner shows current context
  - Quick switch dropdown
- [ ] When context set, admin sees org-specific views
- [ ] Clear context button to return to global view

### System Configuration
- [ ] Configure global settings
  - Site name and description
  - Support email
  - Default timezone
- [ ] Configure payment providers
  - Stripe API keys
  - Vipps configuration (future)
- [ ] View system logs (optional)
- [ ] Manage API keys (if applicable)

## Technical Implementation

### Authorization Middleware
```typescript
export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }
  
  const userAccount = await prisma.userAccount.findUnique({
    where: { supabaseUid: user.id },
    include: { roles: true }
  })
  
  const hasAdminRole = userAccount?.roles.some(r => r.role === 'ADMIN')
  
  if (!hasAdminRole) {
    redirect('/dashboard')
  }
  
  return userAccount
}
```

### Organization Context Cookie
```typescript
// Set context
cookies().set('admin-org-context', organizerId, {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 // 24 hours
})

// Get context
function getAdminOrgContext(): string | null {
  return cookies().get('admin-org-context')?.value || null
}

// Clear context
function clearAdminOrgContext() {
  cookies().delete('admin-org-context')
}
```

### Admin Layout
```tsx
export default async function AdminLayout({
  children
}: {
  children: React.ReactNode
}) {
  await requireAdmin()
  
  const orgContext = getAdminOrgContext()
  const currentOrg = orgContext 
    ? await prisma.organizer.findUnique({ where: { id: orgContext } })
    : null
  
  return (
    <div>
      <AdminNav />
      {currentOrg && (
        <div className="bg-blue-50 border-b px-4 py-2 flex items-center justify-between">
          <span className="text-sm">
            Working as: <strong>{currentOrg.name}</strong>
          </span>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => clearAdminOrgContext()}
          >
            Clear Context
          </Button>
        </div>
      )}
      {children}
    </div>
  )
}
```

## Server Actions

### admin/organizations.ts
```typescript
'use server'

export async function createOrganization(data: FormData) {
  await requireAdmin()
  
  const name = data.get('name') as string
  const slug = data.get('slug') as string
  // ... other fields
  
  const org = await prisma.organizer.create({
    data: { name, slug, /* ... */ }
  })
  
  revalidatePath('/admin/organizations')
  return { success: true, organizerId: org.id }
}

export async function updateOrganization(id: string, data: FormData) {
  await requireAdmin()
  
  await prisma.organizer.update({
    where: { id },
    data: { /* ... */ }
  })
  
  revalidatePath('/admin/organizations')
  return { success: true }
}
```

### admin/users.ts
```typescript
'use server'

export async function assignGlobalRole(userId: string, role: string) {
  await requireAdmin()
  
  await prisma.userAccountRole.create({
    data: {
      userId,
      role: role as UserRole
    }
  })
  
  revalidatePath(`/admin/users/${userId}`)
  return { success: true }
}

export async function assignOrgRole(
  userId: string, 
  role: string, 
  organizerId: string
) {
  await requireAdmin()
  
  await prisma.userAccountRole.create({
    data: {
      userId,
      role: role as UserRole,
      organizerId
    }
  })
  
  revalidatePath(`/admin/users/${userId}`)
  return { success: true }
}
```

## UI Components

### OrganizationList
- Table or card layout
- Columns: Name, Slug, City, Stats
- Actions: Edit, View, Delete (with confirmation)
- Search and filter

### GlobalUserSearch
- Search input
- Results table
- Click to view user details
- Role badges

### OrgContextSwitcher
- Dropdown in admin nav
- List all organizations
- Current context highlighted
- "Clear context" option

### AdminDashboard
- System-wide statistics
  - Total organizations
  - Total users
  - Total registrations
  - Total revenue
- Recent activity feed
- Quick actions

## Testing Checklist
- [ ] Test: ADMIN role can access /admin
- [ ] Test: Non-ADMIN cannot access /admin
- [ ] Test: Create organization
- [ ] Test: Edit organization
- [ ] Test: Search users globally
- [ ] Test: Assign global roles
- [ ] Test: Assign org-scoped roles
- [ ] Test: Organization context switching
- [ ] Test: View cross-org periods
- [ ] Test: View cross-org registrations

## Success Criteria
- [ ] ADMIN users can access /admin portal
- [ ] Can manage all organizations
- [ ] Can manage all users and roles
- [ ] Can view all periods/tracks/registrations
- [ ] Organization context switching works
- [ ] All actions are properly authorized
- [ ] UI is consistent with existing admin patterns

## Dependencies
- ADMIN role in database ✅
- AdminNav component ✅
- Organizer CRUD operations
- User role management

## Related Issues
- #[org-admin-portal] - ORG_ADMIN portal (exists ✅)
- #[role-management] - Role system

## References
- Specs: Phase 2 — Core data CRUD (Admin-first)
- `/apps/web/src/app/(site)/(admin)/admin/` - Current admin structure
- `/apps/web/src/components/admin-nav.tsx` - Admin navigation
- Issue docs: `01-ADMIN-global-admin.md`
