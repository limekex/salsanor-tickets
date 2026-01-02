# User Management System

## Overview
The user management system allows administrators to assign and manage roles for users across the platform, both at a global level and within specific organizations.

## Access Levels

### Global Admin (ADMIN role)
- Can view and manage all users across all organizations
- Can assign any role to any user
- Access to complete user management system
- No organization filtering restrictions

### Organization Admin (ORG_ADMIN role)
- Can only manage users within their own organization
- Can assign organization-specific roles
- Views are automatically filtered to their organization
- Cannot assign global roles (ADMIN, CHECKIN, PARTICIPANT)

## User Management Pages

### 1. User List (`/admin/users`)
**Purpose**: Overview of all users with their roles

**Features**:
- Lists all users with profile information (name, email, phone)
- Displays all roles assigned to each user
- Role badges with color coding
- Organization context displayed for org-scoped roles
- "Add User Role" button for quick role assignment
- "Manage Roles" button on each user card linking to detail page

**Context-Aware Behavior**:
- Global admin with no org selected: Shows ALL users
- Global admin with org selected: Shows users with roles in that org
- Org admin: Automatically shows only users in their org

### 2. User Detail Page (`/admin/users/[userId]`)
**Purpose**: Detailed view of a single user with role management

**Features**:
- User profile information (email, phone, Supabase UID)
- Complete list of all assigned roles
- Role descriptions explaining what each role grants
- Remove role button with confirmation dialog
- Add role button for quick additional role assignment
- Back button to user list

**Role Information Displayed**:
- Role name with color-coded badge
- Organization name for org-scoped roles
- Role description explaining permissions
- Easy removal with confirmation

### 3. Add User Role Dialog
**Purpose**: Search for users and assign roles

**Workflow**:
1. Enter user email address
2. Click search to find user
3. View user's current roles
4. Select new role to assign
5. For org-scoped roles, select organization
6. Confirm and add role

**Validation**:
- Checks if user exists
- Prevents duplicate role assignments
- Requires organization for org-scoped roles
- Auto-selects organization when admin has context selected

## Role Types

### Global Roles (No Organization Required)
- **ADMIN**: Full system access, can manage all organizations
- **CHECKIN**: Check-in access across all organizations  
- **PARTICIPANT**: Basic participant access

### Organization-Scoped Roles (Requires Organization)
- **ORG_ADMIN**: Full administrative access within organization
- **ORG_FINANCE**: Financial and payment management access
- **ORG_CHECKIN**: Check-in and attendance management for organization
- **INSTRUCTOR**: Teaching and course management access
- **STAFF**: General staff access within organization
- **ORGANIZER**: Deprecated, use ORG_ADMIN instead

## Role Assignment Rules

### Who Can Assign Roles:
- **Global Admin (ADMIN)**: Can assign any role to any user
- **Org Admin (ORG_ADMIN)**: Can only assign org-scoped roles for their organization

### Validation:
- Org-scoped roles MUST have an organizerId
- Global roles CANNOT have an organizerId
- Users cannot have duplicate role+organization combinations
- Role removal requires admin permissions

## Server Actions

### `getUsers(organizerId?: string)`
Fetches list of users with optional organization filtering.
- No parameter: Returns all users (global admin only)
- With organizerId: Returns users with roles in that organization

### `getUserById(userId: string)`
Fetches detailed information for a single user including:
- Basic profile (email, name, phone)
- All assigned roles with organization information
- Supabase authentication linkage

### `addUserRole(userId: string, role: string, organizerId?: string)`
Assigns a role to a user with validation:
- Checks role requires organization
- Prevents duplicate assignments
- Validates admin permissions
- Revalidates user list page

### `removeUserRole(roleId: string)`
Removes a role assignment:
- Requires admin permissions
- Deletes the role record
- Revalidates affected pages

### `searchUserByEmail(email: string)`
Searches for a user by email address:
- Returns user with profile and roles
- Used in Add Role dialog
- Returns null if not found

### `getOrganizersForUserManagement()`
Fetches list of all organizers for dropdown selections:
- Used in role assignment dialogs
- Returns id, name, and slug for each organizer

## UI Components

### User Cards
- Display user profile information
- Show all assigned roles with badges
- Color-coded role badges
- Organization tags for org-scoped roles

### Role Badges
Each role has a distinct color:
- ADMIN: Red (most critical)
- ORG_ADMIN: Blue
- ORG_FINANCE: Green
- ORG_CHECKIN: Purple
- INSTRUCTOR: Yellow
- CHECKIN: Purple
- STAFF: Gray
- PARTICIPANT: Slate

### Dialogs
- **Add Role Dialog**: Multi-step user search and role assignment
- **Remove Role Dialog**: Confirmation dialog with destructive action styling

## Organization Context Integration

The user management system respects the organization context set via the org selector:

### Global Admin Experience:
1. No org selected: Sees all users globally
2. Org selected: Sees users with roles in selected organization
3. Can add roles for any organization
4. Can remove any role

### Org Admin Experience:
1. Always filtered to their organization
2. Cannot see users from other organizations
3. Can only add org-scoped roles for their organization
4. Can only remove roles within their organization

## Security

### Authorization:
- All actions require `requireAdmin()` check
- Org admins get automatic organizerId filtering
- Global admins can access all data

### Role Validation:
- Org-scoped roles must have organizerId
- Global roles must NOT have organizerId
- Duplicate role prevention
- Type-safe role enum from Prisma

### Data Access:
- Row-level security via Prisma queries
- Server-side validation of all operations
- Client components only handle UI, no direct DB access

## Navigation

User Management appears in admin navigation:
- Always visible to all admins
- Icon: UserCog (Lucide React icon)
- Order: After Organizers, before Periods
- Active state tracking based on pathname

## Future Enhancements

Potential improvements:
1. Bulk role assignment/removal
2. Role request system (users request, admins approve)
3. Audit log of role changes
4. Role expiration dates
5. Email notifications when roles are assigned/removed
6. User invite system (send invite, user creates account, roles pre-assigned)
7. Advanced filtering (by role type, organization, date added)
8. Export user list with roles to CSV
9. Role templates (assign multiple roles at once)
10. Permission preview (show what user can access with current roles)
