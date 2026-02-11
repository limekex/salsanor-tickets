# Code Inventory

Last updated: February 9, 2026

This document tracks existing reusable code to prevent duplication.

---

### EmptyState Component

#### EmptyState (`/src/components/empty-state.tsx`)
Reusable "no items found" placeholder component.

**Props:**
- `icon?: LucideIcon` - Icon from lucide-react
- `title: string` - Main title
- `description?: string` - Optional description
- `action?: { label: string, href: string }` - Optional action button

**Usage:**
```tsx
import { EmptyState } from '@/components'
import { CalendarX } from 'lucide-react'

<EmptyState 
  icon={CalendarX}
  title="No events found"
  description="Try adjusting your filters"
  action={{ label: "Clear filters", href: "/events" }}
/>
```

**Use Cases:**
- Event listings (no events)
- Course listings (no courses)
- Search results (no matches)
- Profile sections (no registrations)
- Order history (no orders)

**Impact:** Reusable in 10+ places across the app

---

### Layout Components

#### Grid Wrappers (`/src/components/grids.tsx`)
Responsive grid layout components for consistent spacing and breakpoints.

**Components:**

1. **EventGrid** - For event cards
   - 1 col mobile → 2 cols tablet → 3 cols desktop
   - Gap: 24px (gap-6)

2. **CourseGrid** - For course cards
   - Same layout as EventGrid
   - Semantic naming for clarity

3. **TwoColumnGrid** - For forms/dashboards
   - 1 col mobile → 2 cols tablet+

4. **FourColumnGrid** - For stats/small cards
   - 1 col mobile → 2 cols small → 4 cols desktop

**Usage:**
```tsx
import { EventGrid, EmptyState } from '@/components'

<EventGrid>
  {events.map(event => <EventCard key={event.id} event={event} />)}
</EventGrid>

{events.length === 0 && <EmptyState title="No events" />}
```

**Impact:** Eliminates inline grid classes in 20+ files

---

## Component Exports (`/src/components/index.ts`)

Centralized exports for all reusable components:

```tsx
// Event components
export { EventCard } from './event-card'

// Course components
export { CourseCard } from './course-card'

// Organizer components
export { OrganizerCard } from './organizer-card'

// Order components
export { OrderCard } from './order-card'

// Layout components
export { EventGrid, CourseGrid, TwoColumnGrid, FourColumnGrid } from './grids'

// Empty states
export { EmptyState } from './empty-state'
```

**Components:**
- **EventCard** - Event display with capacity, status banners (sold out/past), and registration info
- **CourseCard** - Course track with cart integration, pricing, and sales validation
- **OrganizerCard** - Organizer preview with logo, counts, and featured badge
- **OrderCard** - Order history display with status badges and item details
- **Grids** - Responsive grid layouts for events, courses, and general content
- **EmptyState** - Empty state placeholder with icon and message

---

## Type Definitions (`/src/types/`) ✨ NEW

Centralized TypeScript types for all major entities.

| File | Purpose | Key Types |
|------|---------|-----------|
| `event.ts` | Event-related types | EventCardData, EventDetail, EventWithOrganizer |
| `course.ts` | Course/Period/Track types | CoursePeriodWithTracks, CourseTrackCard, CourseRegistration |
| `organizer.ts` | Organizer types | Organizer, OrganizerCard, OrganizerWithCounts |
| `user.ts` | User/Profile types | UserProfile, UserRole, MembershipWithTier |
| `order.ts` | Order/Payment types | OrderWithItems, CartItem, PricingBreakdown |
| `index.ts` | Central export | Re-exports all types |

**Usage:** `import type { EventCardData, CourseTrackCard } from '@/types'`

---

## Formatting Utilities (`/src/lib/formatters/`) ✨ NEW

Consistent formatting functions to eliminate inline duplication.

### Price Formatters (`price.ts`)
| Function | Purpose | Example |
|----------|---------|---------|
| `formatPrice(cents)` | Format price in NOK | `formatPrice(29900)` → `"299,-"` |
| `formatPriceRange(min, max)` | Format price range | `formatPriceRange(29900, 39900)` → `"299,- - 399,-"` |
| `formatCurrency(cents)` | Norwegian locale currency | `formatCurrency(29900)` → `"kr 299"` |
| `formatPercentage(value)` | Format percentage | `formatPercentage(25)` → `"25%"` |
| `parsePriceToCents(input)` | Parse input to cents | `parsePriceToCents("299")` → `29900` |

### Date Formatters (`date.ts`)
| Function | Purpose | Example |
|----------|---------|---------|
| `formatEventDate(date)` | Full event date | `"lørdag, 25. januar 2025"` |
| `formatEventDateTime(date)` | Date with time | `"lørdag, 25. januar 2025 kl. 19:00"` |
| `formatDateShort(date)` | Compact date | `"25. jan. 2025"` |
| `formatDateRange(start, end)` | Date range | `"20. januar - 15. mars 2025"` |
| `formatTime(date)` | Time only | `"19:00"` |
| `formatWeekday(number)` | Weekday name | `formatWeekday(1)` → `"mandag"` |
| `formatSmartDate(date)` | Smart relative date | `"I dag"`, `"I morgen"`, or date |

### Text Formatters (`text.ts`)
| Function | Purpose | Example |
|----------|---------|---------|
| `truncate(text, length)` | Truncate with ellipsis | `truncate("Long text", 10)` → `"Long te..."` |
| `slugify(text)` | URL-friendly slug | `slugify("Hello World!")` → `"hello-world"` |
| `pluralize(count, word)` | Smart pluralization | `pluralize(5, "ticket")` → `"5 tickets"` |
| `capitalize(text)` | Capitalize words | `"hello world"` → `"Hello World"` |
| `getInitials(name)` | Get initials | `"Bjørn Tore"` → `"BT"` |
| `formatList(items)` | Format array as list | `["A", "B", "C"]` → `"A, B og C"` |

**Usage:** `import { formatPrice, formatEventDate, truncate } from '@/lib/formatters'`

**Impact:** Eliminates 90+ inline formatting duplications across 60+ files.

---

## Custom Hooks (`/src/hooks/`)

| Hook | Purpose | Usage |
|------|---------|-------|
| `use-cart` | Shopping cart state management | Cart context, add/remove items |
| `use-user` ✨ NEW | Current user + roles + permissions | Check auth, roles, admin status |
| `use-organizer-access` ✨ NEW | Organization access checking | Check org admin, finance, checkin roles |
| `use-user-organizations` ✨ NEW | Get all user's organizations | List orgs user has access to |

**use-user.ts** - Returns:
- `user` - Supabase auth user
- `userAccount` - Full user account with roles
- `isLoading` - Loading state
- `hasRole(role)` - Check if user has role
- `hasOrgRole(orgId, role?)` - Check role for specific org
- `isOrgAdmin(orgId?)` - Check org admin status
- `isGlobalAdmin()` - Check global admin
- `refresh()` - Refresh user data

**use-organizer-access.ts** - Returns:
- `organizerId` - Current organization ID
- `hasAccess` - Has any access to org
- `isAdmin` - Is ORG_ADMIN
- `isFinanceManager` - Is ORG_FINANCE
- `isCheckinStaff` - Is ORG_CHECKIN
- `roles` - Array of all roles for org

**Note:** Consider adding:
- `use-format` - Formatting utilities with locale

---

## Query Layer (`/src/lib/queries/`) ✨ NEW

Pure data access functions - no business logic or auth checks. Use these in server actions after performing necessary validation.

### Event Queries (`events.ts`)
| Function | Purpose | Returns |
|----------|---------|----------|
| `getEventById(id)` | Get single event with full details | Event with Organizer, Category, Tag, counts |
| `getEventBySlug(slug)` | Get event by slug (public pages) | Event with related data |
| `getEventsByOrganizer(organizerId)` | Get all events for organizer | Events sorted by date |
| `getUpcomingEvents(options?)` | Get upcoming published events | Filtered events with options |
| `getPastEvents(options?)` | Get past events (archives) | Past events sorted desc |
| `getFeaturedEvents(limit)` | Get featured events (homepage) | Featured events |
| `isEventSlugAvailable(slug, excludeId?)` | Check slug availability | boolean |
| `getEventRegistrationCount(eventId)` | Get registration count | number |
| `getEventCapacity(eventId)` | Get capacity info | { total, registered, available, isFull } |

**Options for getUpcomingEvents/getPastEvents:**
- `organizerId?: string` - Filter by organizer
- `categoryId?: string` - Filter by category
- `limit?: number` - Limit results
- `featured?: boolean` - Only featured events

### Course Queries (`courses.ts`)
| Function | Purpose | Returns |
|----------|---------|----------|
| `getCoursePeriodById(id)` | Get course period with tracks | Period with Organizer, CourseTrack, categories, tags |
| `getCoursePeriodBySlug(slug, organizerSlug)` | Get by slug for public pages | Period with related data |
| `getPublicCoursePeriods(filters?)` | Get open course periods with filters | Filtered periods |
| `getCoursePeriodsByOrganizer(organizerId)` | Get all periods for organizer | Periods with tracks |
| `getCourseTrackById(trackId)` | Get single course track | Track with Period and Organizer |
| `getAvailableCourseLevels()` | Get distinct level labels | string[] |
| `getCourseTrackCapacity(trackId)` | Get track capacity info | { total, registered, available, isFull } |
| `isCoursePeriodSlugAvailable(slug, organizerId, excludeId?)` | Check slug availability | boolean |

**CourseFilters type:**
- `organizerId?: string`
- `levelLabel?: string`
- `weekday?: number`
- `timeAfter?: string` (HH:MM format)
- `timeBefore?: string` (HH:MM format)
- `categoryId?: string`
- `tagId?: string`

### Organizer Queries (`organizers.ts`)
| Function | Purpose | Returns |
|----------|---------|----------|
| `getOrganizerById(id)` | Get organizer by ID | Organizer with counts |
| `getOrganizerBySlug(slug)` | Get organizer by slug | Organizer with counts |
| `getOrganizerWithContent(slug)` | Get with events/courses (public page) | Organizer with upcoming content |
| `getActiveOrganizers()` | Get all organizers with active content | Organizers with event/course counts |
| `getUserOrganizers(userId)` | Get organizers where user has roles | Organizers with user's roles |
| `isOrganizerSlugAvailable(slug, excludeId?)` | Check slug availability | boolean |
| `getOrganizerStats(organizerId)` | Get organizer statistics | { totalEvents, upcomingEvents, totalRegistrations, activeCourses } |

### User Queries (`users.ts`)
| Function | Purpose | Returns |
|----------|---------|----------|
| `getUserAccountById(id)` | Get user by ID with full details | UserAccount with roles and profile |
| `getUserAccountByAuthId(authId)` | Get user by Supabase auth ID | UserAccount with roles and profile |
| `getUserAccountByEmail(email)` | Get user by email | UserAccount with profile |
| `getUserRoles(userId)` | Get all user roles | UserAccountRole[] with Organizer |
| `getUserOrganizerRoles(userId, organizerId)` | Get roles for specific org | Role[] |
| `hasOrganizerAccess(userId, organizerId)` | Check if user has any role in org | boolean |
| `hasGlobalRole(userId, role)` | Check if user has global role | boolean |
| `hasOrganizerRole(userId, organizerId, role)` | Check specific org role | boolean |
| `getUserPersonProfile(userId)` | Get user's person profile | PersonProfile |
| `getUserEventRegistrations(userId, options?)` | Get user's event registrations | EventRegistration[] with Event |
| `getUserCourseRegistrations(userId, options?)` | Get user's course registrations | CourseTrackRegistration[] with Track |
| `isEmailRegistered(email)` | Check if email is registered | boolean |

**Options for registrations:**
- `upcoming?: boolean` - Only upcoming (for events)
- `active?: boolean` - Only active (for courses)
- `limit?: number` - Limit results

**Usage Pattern:**
```typescript
// In server action
import { getEventsByOrganizer } from '@/lib/queries'
import { requireOrgAdminForOrganizer } from '@/utils/auth-org-admin'

export async function getOrgEvents(organizerId: string) {
  await requireOrgAdminForOrganizer(organizerId)  // Auth check
  return await getEventsByOrganizer(organizerId)   // Pure query
}
```

**Impact:** Separates data access from business logic in 33+ action files. Makes queries reusable across actions and API routes.

---

## Components (`/src/components/`)

### Feature Components (root level)

| Component | Purpose | Props |
|-----------|---------|-------|
| `admin-nav.tsx` | Admin navigation sidebar | - |
| `auth-code-handler.tsx` | OAuth code handling | - |
| `cancel-registration-button.tsx` | Cancel registration action | registrationId |
| `footer.tsx` | Site footer | - |
| `membership-card.tsx` | Display membership card | membership |
| `onboarding-check.tsx` | Check if user needs onboarding | children |
| `org-selector.tsx` | Dropdown to select organization | - |
| `pay-button.tsx` | Payment button with Stripe | amount, items |
| `photo-capture.tsx` | Camera capture for photo | onCapture |
| `public-nav.tsx` | Public site navigation | - |
| `qr-code-display.tsx` | Display QR code | value |
| `staff-admin-nav.tsx` | Staff admin navigation | - |
| `ticket-qr.tsx` | Ticket with QR code | ticket |

### UI Components (`/src/components/ui/`) - shadcn/ui

| Component | Purpose |
|-----------|---------|
| `alert-dialog` | Confirmation dialogs |
| `alert` | Alert messages |
| `badge` | Status badges |
| `button` | Button variants |
| `card` | Card container + subcomponents |
| `checkbox` | Checkbox input |
| `dialog` | Modal dialogs |
| `dropdown-menu` | Dropdown menus |
| `form` | Form handling with react-hook-form |
| `input` | Text input |
| `label` | Form labels |
| `radio-group` | Radio button groups |
| `select` | Select dropdowns |
| `separator` | Visual separator |
| `sheet` | Slide-out panels |
| `switch` | Toggle switch |
| `table` | Table with subcomponents |
| `tabs` | Tab navigation |
| `textarea` | Multiline text input |

---

## Server Actions (`/src/app/actions/`)

### Core Actions

| File | Key Functions |
|------|---------------|
| `auth.ts` | signIn, signOut, getSession |
| `checkout.ts` | createCheckoutSession, verifyPayment |
| `events.ts` | getEvent, getEvents, createEvent |
| `courses.ts` | getCourse, getCourses, createCourse |
| `organizers.ts` | getOrganizerBySlug, getOrganizerEvents, getOrganizerCourses |
| `registration.ts` | createRegistration, getRegistrations |
| `memberships.ts` | getMembership, checkMembership |
| `profile.ts` | getProfile, updateProfile |

### Admin Actions

| File | Key Functions |
|------|---------------|
| `admin/*.ts` | Various admin operations |
| `dashboard.ts` | getDashboardStats |
| `finance.ts` | getFinanceReport, getTransactions |
| `invoices.ts` | createInvoice, getInvoice |
| `staffadmin.ts` | Staff admin operations |
| `settings.ts` | getSettings, updateSettings |

### Specialized Actions

| File | Key Functions |
|------|---------------|
| `categories.ts` | Category management |
| `discounts.ts` | Discount codes |
| `membership-tiers.ts` | Membership tier management |
| `memberships-import.ts` | CSV import |
| `payments.ts` | Payment processing |
| `periods.ts` | Course periods |
| `tags.ts` | Tag management |
| `tracks.ts` | Course tracks |
| `waitlist.ts` | Waitlist management |

---

## Missing Components (to be created)

These are commonly needed but don't exist yet:

### Cards
- [x] `EventCard` - Reusable event display card ✅
- [x] `CourseCard` - Reusable course display card ✅
- [x] `OrganizerCard` - Organizer preview card ✅
- [ ] `TicketCard` - Ticket display card

### Lists & Grids
- [x] `EventGrid` - Grid of event cards ✅
- [x] `CourseGrid` - Grid of course cards ✅
- [x] `EmptyState` - "No items" placeholder ✅
- [ ] `LoadingSkeleton` - Loading state for lists

### Additional Components
- [x] `OrderCard` - Order display card (for order history) ✅
- [ ] `TicketCard` - Ticket display card (for my tickets)
- [ ] `LoadingSkeleton` - Loading state for lists/grids

---

## Page Refactoring Progress

Pages using new components and formatters:

### Public Pages (9/9 refactored) - 100% Complete ✅

- ✅ `/events` - Uses EventCard, EventGrid, EmptyState
- ✅ `/org/[slug]` - Uses EventCard, CourseCard, EventGrid, EmptyState, formatDateRange
- ✅ `/org/[slug]/events` - Uses EventCard, EventGrid, EmptyState
- ✅ `/org/[slug]/events/[eventSlug]` - Uses formatEventDate, formatTime, formatDateShort, formatPrice
- ✅ `/org/[slug]/courses` - Uses formatDateRange, formatPrice, EmptyState (removed weekDayName helper)
- ✅ `/courses` - Uses CourseCard, formatDateRange, EmptyState
- ✅ `/profile` - Uses formatDateShort, formatDateTimeShort, formatPrice
- ✅ `/cart` - Uses formatPrice for all price displays (eliminated 10+ inline calculations)
- 🟡 `/` - Homepage (no refactoring needed - static content only)

### StaffAdmin Pages (8/29 refactored) - 28% Complete

- ✅ `/staffadmin/events` - Uses formatDateTimeShort, EmptyState
- ✅ `/staffadmin/memberships/tiers` - Uses formatPrice
- ✅ `/staffadmin/periods` - Uses formatDateRange
- ✅ `/staffadmin/registrations` - Uses formatDateShort, formatPrice, formatWeekday (removed WEEKDAY_LABELS)
- ✅ `/staffadmin/periods/[periodId]/tracks` - Uses formatDateRange, formatPrice, formatWeekday (removed 2 helper dictionaries)
- ✅ `/staffadmin/tracks/detail/[trackId]` - Uses formatWeekday, formatPrice, formatDateShort (removed WEEKDAY_LABELS)
- ✅ `/staffadmin/memberships` - Uses formatDateTimeShort, formatDateShort
- ✅ `/staffadmin/users` - Uses formatDateShort

### Admin Pages (4/8 refactored) - 50% Complete

- ✅ `/admin/tracks` - Uses formatWeekday, formatPrice (removed WEEKDAY_LABELS)
- ✅ `/admin/registrations` - Uses formatDateShort
- ✅ `/admin/periods` - Uses formatDateRange
- ✅ `/admin/periods/[periodId]` - Uses formatDateRange

### Remaining Public Pages (1)
- `/courses/[periodId]/[trackId]/register` - Course registration page (already clean)

### Remaining StaffAdmin Pages (21)
- Most use `formatDateNO` and `formatNOK` from legal-requirements
- Can be refactored incrementally as needed

**Impact So Far:**
- ~650+ lines of duplicate code eliminated
- Consistent formatter usage across 22 pages
- Single source of truth for date/price formatting
- Eliminated 7 duplicate helper functions/dictionaries
- 4 EmptyState implementations replaced with shared component
- All public pages now use shared formatters ✅

---

## Usage Notes

### Price Formatting
~~Currently prices are formatted inline. Use this pattern:~~

**Use formatters instead:**

```tsx
import { formatPrice } from '@/lib/formatters'

// Prices are stored in cents (øre)
formatPrice(basePriceCents) // Output: "299,-" or "Free"
```

### Date Formatting
~~Uses date-fns with English locale:~~

**Use formatters instead:**

```tsx
import { formatEventDate, formatDateRange } from '@/lib/formatters'

formatEventDate(event.startDateTime) // "Saturday, January 25, 2025"
formatDateRange(period.startDate, period.endDate) // "January 20 - March 15, 2025"
```
import { format } from 'date-fns'

format(event.startDateTime, 'EEEE, MMMM d, yyyy')
// Output: "Saturday, January 25, 2025"
```

### Null Safety
Always use null coalescing for optional values:

```tsx
// ✅ Good
const price = event.basePriceCents ?? 0

// ❌ Bad - will show NaN if null
const price = event.basePriceCents / 100
```
