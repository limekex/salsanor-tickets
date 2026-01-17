# Code Organization Refactor: Reusable Components, Hooks & Actions

## Overview

Our codebase has grown organically and currently has inconsistent patterns for data fetching, UI components, and business logic. This issue tracks a systematic refactoring effort to:

1. Create reusable UI components (cards, lists, grids)
2. Expand custom hooks for common client-side logic
3. Organize server actions and data queries consistently
4. Document patterns for future development

## Current State Analysis

### What we have:
- ✅ **Server Actions** (`/app/actions/`) - 33+ files, well-organized
- ✅ **UI Components** (`/components/ui/`) - shadcn/ui primitives
- ✅ **Lib Services** (`/lib/`) - Business logic for email, payments, fulfillment
- ⚠️ **Custom Hooks** (`/hooks/`) - Only 1 file (`use-cart.ts`)
- ❌ **Reusable Feature Components** - Missing (cards, lists hardcoded per page)
- ❌ **Query/Data Layer** - No consistent pattern for data fetching

### Problems:
1. Event cards duplicated in `/events`, `/org/[slug]`, `/org/[slug]/events`
2. Course cards duplicated in `/courses`, `/org/[slug]`, `/org/[slug]/courses`
3. User access checks duplicated across many pages
4. Date/price formatting logic duplicated everywhere
5. No TypeScript types exported for common entities

---

## Implementation Plan

### Phase 1: Types & Utilities

#### 1.1 Create shared types
```
src/types/
├── index.ts              # Re-exports
├── event.ts              # Event-related types
├── course.ts             # Course/Period/Track types
├── organizer.ts          # Organizer types
├── user.ts               # User/Profile types
└── order.ts              # Order/Payment types
```

#### 1.2 Create formatting utilities
```
src/lib/formatters/
├── index.ts
├── date.ts               # formatEventDate, formatPeriodRange
├── price.ts              # formatPrice, formatPriceRange
└── text.ts               # truncate, slugify
```

### Phase 2: Reusable Components

#### 2.1 Card Components
```
src/components/cards/
├── index.ts
├── event-card.tsx        # For events
├── course-card.tsx       # For course tracks
├── organizer-card.tsx    # For organizer listings
├── order-card.tsx        # For order history
└── membership-card.tsx   # Already exists, move here
```

#### 2.2 List/Grid Components
```
src/components/lists/
├── index.ts
├── event-grid.tsx        # Grid of EventCards
├── course-grid.tsx       # Grid of CourseCards
├── empty-state.tsx       # "No items found" component
└── loading-grid.tsx      # Skeleton loading states
```

#### 2.3 Section Components
```
src/components/sections/
├── index.ts
├── upcoming-events.tsx   # Events section with "View all" link
├── upcoming-courses.tsx  # Courses section with "View all" link
└── organizer-header.tsx  # Organizer info header
```

### Phase 3: Custom Hooks

```
src/hooks/
├── index.ts
├── use-cart.ts           # Existing
├── use-user.ts           # Current user info + roles
├── use-organizer-access.ts  # Check org admin access
├── use-format.ts         # Formatting helpers with locale
├── use-pagination.ts     # Pagination state
└── use-search.ts         # Search/filter state
```

### Phase 4: Data Layer

#### 4.1 Query functions
```
src/lib/queries/
├── index.ts
├── events.ts             # getUpcomingEvents, getEventById
├── courses.ts            # getCoursePeriods, getCourseTrack
├── organizers.ts         # getOrganizer, getOrganizerWithContent
└── users.ts              # getUserProfile, getUserRoles
```

#### 4.2 Server Actions consolidation
Review and consolidate `/app/actions/` to reduce duplication.

---

## Page-by-Page Refactoring Checklist

### Frontend Pages (Public)

- [ ] `/` - Homepage
  - [ ] Use `<UpcomingEvents />` section
  - [ ] Use `<EventGrid />` component
  
- [ ] `/events` - Events listing
  - [ ] Use `<EventGrid />` with `<EventCard />`
  - [ ] Use `<EmptyState />` for no results
  
- [ ] `/events/[id]` - Event detail
  - [ ] Extract `<EventHeader />` component
  - [ ] Use shared price formatting
  
- [ ] `/org/[slug]` - Organizer page
  - [ ] Use `<OrganizerHeader />`
  - [ ] Use `<UpcomingEvents limit={3} />`
  - [ ] Use `<UpcomingCourses limit={3} />`
  
- [ ] `/org/[slug]/events` - Organizer events
  - [ ] Use `<EventGrid />`
  
- [ ] `/org/[slug]/courses` - Organizer courses
  - [ ] Use `<CourseGrid />`
  
- [ ] `/courses` - Courses listing
  - [ ] Use `<CourseGrid />` with `<CourseCard />`
  
- [ ] `/courses/[periodId]/[trackId]` - Course detail
  - [ ] Extract reusable components

### Frontend Pages (Authenticated)

- [ ] `/my/tickets` - User tickets
  - [ ] Use card components
  
- [ ] `/my/orders` - Order history
  - [ ] Use `<OrderCard />` component
  
- [ ] `/my/profile` - User profile
  - [ ] Review for reusable components

### Admin Pages (`/admin`)

- [ ] `/admin/events` - Event management
- [ ] `/admin/orders` - Order management
- [ ] `/admin/users` - User management
- [ ] `/admin/organizers` - Organizer management

### Staff Admin Pages (`/staffadmin`)

- [ ] `/staffadmin/events` - Event management
- [ ] `/staffadmin/orders` - Order management
- [ ] `/staffadmin/periods` - Course periods
- [ ] `/staffadmin/members` - Member management

---

## Backend/API Refactoring

### Server Actions Review

- [ ] `/app/actions/events.ts` - Consolidate event queries
- [ ] `/app/actions/courses.ts` - Consolidate course queries
- [ ] `/app/actions/organizers.ts` - Add reusable query functions
- [ ] `/app/actions/auth.ts` - Add user access helpers

### API Routes Review

- [ ] `/api/webhooks/stripe` - Uses proper services ✅
- [ ] `/api/admin/*` - Review for consistency
- [ ] `/api/staffadmin/*` - Review for consistency

---

## Definition of Done

- [ ] All card components created and documented
- [ ] All hooks created with JSDoc comments
- [ ] Types exported from `/types`
- [ ] At least 5 pages refactored to use new components
- [ ] Agent instructions document created
- [ ] Component inventory document created

---

## Labels

`refactor`, `tech-debt`, `documentation`, `good-first-issue`

## Estimated Effort

- Phase 1 (Types & Utilities): 2-3 hours
- Phase 2 (Components): 4-6 hours
- Phase 3 (Hooks): 2-3 hours
- Phase 4 (Data Layer): 3-4 hours
- Page refactoring: 1-2 hours per page

**Total: ~20-30 hours**

## Priority

Medium - This is technical debt that will pay off in faster development and fewer bugs, but doesn't block any features.
