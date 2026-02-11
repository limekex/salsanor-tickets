# Agent Development Instructions

**Last Updated**: February 11, 2026  
**Status**: ✅ Current with Issue #10 refactor

## 🚨 MANDATORY: Read Before Coding

Before writing ANY code, you MUST:

1. **Read [CODE_INVENTORY.md](../docs/CODE_INVENTORY.md)** - Lists all reusable components, hooks, formatters, and queries
2. **Read [MIGRATION_GUIDE.md](../docs/MIGRATION_GUIDE.md)** - Patterns and anti-patterns for this codebase
3. **Check existing code** - Don't duplicate what already exists

---

## Quick Import Reference

```tsx
// 📦 Components - ALWAYS check these first
import { EventCard, CourseCard, OrganizerCard, OrderCard, EmptyState, EventGrid, CourseGrid } from '@/components'

// 💰 Formatters - NEVER use inline formatting
import { formatPrice, formatEventDate, formatDateRange, formatRelativeTime, formatWeekday, truncate } from '@/lib/formatters'

// 📝 Types - Use centralized types
import type { EventCardData, CourseTrackCard, UserProfile, OrderWithItems } from '@/types'

// 🔍 Queries - Use in server actions
import { getEventsByOrganizer, getUserEventRegistrations } from '@/lib/queries'

// 🪝 Hooks - Client-side logic
import { useUser, useOrganizerAccess, useCart } from '@/hooks'
```

---

## Directory Structure

```
apps/web/src/
├── app/
│   ├── actions/              # Server Actions (mutations + data fetching)
│   ├── api/                  # API routes
│   ├── (site)/               # Public pages
│   ├── admin/                # Global admin pages
│   └── staffadmin/           # Organization admin pages
├── components/
│   ├── index.ts              # ⭐ Central exports (import from here!)
│   ├── event-card.tsx        # Event display card
│   ├── course-card.tsx       # Course track card
│   ├── organizer-card.tsx    # Organizer preview card
│   ├── order-card.tsx        # Order history card
│   ├── membership-card.tsx   # Membership display
│   ├── grids.tsx             # Grid layouts (EventGrid, CourseGrid, etc.)
│   ├── empty-state.tsx       # Empty state placeholder
│   └── ui/                   # shadcn/ui primitives
├── hooks/
│   ├── index.ts              # ⭐ Central exports
│   ├── use-cart.ts           # Shopping cart state
│   ├── use-user.ts           # Current user + roles
│   └── use-organizer-access.ts # Org permissions
├── lib/
│   ├── formatters/           # ⭐ Date, price, text formatting
│   │   ├── index.ts          # Central exports
│   │   ├── date.ts           # Date formatting functions
│   │   ├── price.ts          # Price formatting functions
│   │   └── text.ts           # Text utilities
│   ├── queries/              # ⭐ Reusable Prisma queries
│   │   ├── index.ts          # Central exports
│   │   ├── events.ts         # Event queries
│   │   ├── courses.ts        # Course queries
│   │   ├── organizers.ts     # Organizer queries
│   │   └── users.ts          # User queries
│   └── services/             # Business logic (email, payments)
├── types/
│   ├── index.ts              # ⭐ Central exports
│   ├── event.ts              # Event types
│   ├── course.ts             # Course types
│   ├── organizer.ts          # Organizer types
│   ├── user.ts               # User types
│   └── order.ts              # Order types
└── utils/                    # Auth utilities, helpers
```

---

## ⛔ FORBIDDEN Patterns

These patterns are NOT ALLOWED. Use the alternatives.

### ❌ Direct date-fns imports for formatting

```tsx
// ❌ FORBIDDEN
import { format, formatDistanceToNow } from 'date-fns'
import { nb } from 'date-fns/locale'

format(date, 'dd.MM.yyyy', { locale: nb })
formatDistanceToNow(date, { addSuffix: true })
```

```tsx
// ✅ REQUIRED
import { formatDateNumeric, formatRelativeTime } from '@/lib/formatters'

formatDateNumeric(date)
formatRelativeTime(date)
```

### ❌ Inline price calculations

```tsx
// ❌ FORBIDDEN
<span>{(price ?? 0) / 100},-</span>
<span>{price.toLocaleString('nb-NO')} kr</span>
<span>kr {(amount / 100).toFixed(2)}</span>
```

```tsx
// ✅ REQUIRED
import { formatPrice, formatCurrency } from '@/lib/formatters'

<span>{formatPrice(price)}</span>
<span>{formatCurrency(amount)}</span>
```

### ❌ Duplicate card components

```tsx
// ❌ FORBIDDEN - Creating inline event/course cards
<Card>
  <CardHeader>{event.title}</CardHeader>
  <CardContent>{/* 30+ lines of layout */}</CardContent>
</Card>
```

```tsx
// ✅ REQUIRED
import { EventCard, CourseCard } from '@/components'

<EventCard event={event} />
<CourseCard track={track} />
```

### ❌ Inline empty states

```tsx
// ❌ FORBIDDEN
{items.length === 0 && (
  <div className="text-center py-8 text-muted-foreground">
    <CalendarX className="h-12 w-12 mx-auto mb-4" />
    <p>No items found</p>
  </div>
)}
```

```tsx
// ✅ REQUIRED
import { EmptyState } from '@/components'

{items.length === 0 && (
  <EmptyState icon={CalendarX} title="No items found" />
)}
```

### ❌ Raw Prisma queries in page components

```tsx
// ❌ FORBIDDEN - Queries in pages
export default async function Page() {
  const events = await prisma.event.findMany({
    where: { status: 'PUBLISHED' },
    include: { organizer: true }
  })
}
```

```tsx
// ✅ REQUIRED - Use server actions or query layer
import { getUpcomingEvents } from '@/app/actions/events'

export default async function Page() {
  const events = await getUpcomingEvents()
}
```

### ❌ Hardcoded weekday/month names

```tsx
// ❌ FORBIDDEN
const WEEKDAYS = ['Søndag', 'Mandag', 'Tirsdag', ...]
const dayName = WEEKDAYS[track.weekday]
```

```tsx
// ✅ REQUIRED
import { formatWeekday } from '@/lib/formatters'

const dayName = formatWeekday(track.weekday)
```

---

## ✅ Required Patterns

### Creating a New Page

```tsx
// ✅ GOOD - Uses existing components and formatters
import { EventCard, EventGrid, EmptyState } from '@/components'
import { getUpcomingEvents } from '@/app/actions/events'
import { CalendarX } from 'lucide-react'

export default async function EventsPage() {
  const events = await getUpcomingEvents()
  
  if (events.length === 0) {
    return (
      <EmptyState 
        icon={CalendarX}
        title="No upcoming events"
        description="Check back later for new events"
      />
    )
  }
  
  return (
    <EventGrid>
      {events.map(event => (
        <EventCard key={event.id} event={event} />
      ))}
    </EventGrid>
  )
}
```

### Creating a New Server Action

```tsx
// ✅ GOOD - Uses query layer, proper auth
'use server'

import { requireOrgAdminForOrganizer } from '@/utils/auth-org-admin'
import { getEventsByOrganizer } from '@/lib/queries'

export async function getOrgEvents(organizerId: string) {
  // 1. Auth check first
  await requireOrgAdminForOrganizer(organizerId)
  
  // 2. Use query function (not raw Prisma)
  return await getEventsByOrganizer(organizerId)
}
```

### Displaying Prices

```tsx
// ✅ GOOD - Consistent price formatting
import { formatPrice, formatPriceRange, showZeroAsAmount } from '@/lib/formatters'

// Regular price
<span>{formatPrice(event.basePriceCents)}</span>  // "299,-" or "Gratis"

// Price that should show 0 (e.g., subtotals)
<span>Subtotal: {showZeroAsAmount(subtotal)}</span>  // "0,-"

// Price range
<span>{formatPriceRange(minPrice, maxPrice)}</span>  // "299,- - 599,-"
```

### Displaying Dates

```tsx
// ✅ GOOD - Consistent date formatting
import { 
  formatEventDate,
  formatDateRange, 
  formatRelativeTime,
  formatWeekday 
} from '@/lib/formatters'

// Full event date
<span>{formatEventDate(event.startDateTime)}</span>  // "lørdag, 25. januar 2025"

// Date range for courses
<span>{formatDateRange(period.startDate, period.endDate)}</span>  // "20. jan - 15. mar"

// Relative time (for expiry, etc.)
<span>Expires {formatRelativeTime(expiresAt)}</span>  // "om 2 timer"

// Weekday
<span>{formatWeekday(track.weekday)}</span>  // "tirsdag"
```

### Using Types

```tsx
// ✅ GOOD - Typed props with centralized types
import type { EventCardData, CourseTrackCard } from '@/types'

interface EventListProps {
  events: EventCardData[]
  onSelect?: (event: EventCardData) => void
}

function EventList({ events, onSelect }: EventListProps) {
  // ...
}
```

---

## Available Components

| Component | Import | Use Case |
|-----------|--------|----------|
| `EventCard` | `@/components` | Display event in grid/list |
| `CourseCard` | `@/components` | Display course track with cart integration |
| `OrganizerCard` | `@/components` | Display organizer preview |
| `OrderCard` | `@/components` | Display order in history |
| `MembershipCard` | `@/components` | Display membership card |
| `EmptyState` | `@/components` | "No items" placeholder |
| `EventGrid` | `@/components` | Responsive event grid (1→2→3 cols) |
| `CourseGrid` | `@/components` | Responsive course grid |
| `TwoColumnGrid` | `@/components` | Two column layout |
| `FourColumnGrid` | `@/components` | Four column layout |

---

## Available Formatters

### Price (`@/lib/formatters`)
| Function | Example Output |
|----------|---------------|
| `formatPrice(29900)` | `"299,-"` |
| `formatPrice(0)` | `"Gratis"` |
| `showZeroAsAmount(0)` | `"0,-"` |
| `formatPriceRange(29900, 59900)` | `"299,- - 599,-"` |
| `formatCurrency(29900)` | `"kr 299"` |

### Date (`@/lib/formatters`)
| Function | Example Output |
|----------|---------------|
| `formatEventDate(date)` | `"lørdag, 25. januar 2025"` |
| `formatEventDateTime(date)` | `"lørdag, 25. jan kl. 19:00"` |
| `formatDateShort(date)` | `"25. jan. 2025"` |
| `formatDateNumeric(date)` | `"25.01.2025"` |
| `formatDateRange(start, end)` | `"20. jan - 15. mar 2025"` |
| `formatTime(date)` | `"19:00"` |
| `formatWeekday(1)` | `"mandag"` |
| `formatRelativeTime(date)` | `"2 timer siden"` / `"om 3 dager"` |

### Text (`@/lib/formatters`)
| Function | Example Output |
|----------|---------------|
| `truncate("Long text", 10)` | `"Long te..."` |
| `slugify("Hello World!")` | `"hello-world"` |
| `capitalize("hello world")` | `"Hello World"` |
| `getInitials("Bjørn Tore")` | `"BT"` |

---

## Available Hooks

### `useUser` - Current User & Permissions
```tsx
const { user, userAccount, isLoading, hasRole, isOrgAdmin, isGlobalAdmin } = useUser()
```

### `useOrganizerAccess` - Organization Permissions
```tsx
const { hasAccess, isAdmin, isFinanceManager, isCheckinStaff, roles } = useOrganizerAccess(orgId)
```

### `useCart` - Shopping Cart
```tsx
const { items, addItem, removeItem, clearCart, totalItems, totalPrice } = useCart()
```

---

## Query Functions

Use these in server actions after auth checks:

| Module | Key Functions |
|--------|---------------|
| `@/lib/queries/events` | `getEventById`, `getEventsByOrganizer`, `getUpcomingEvents`, `getEventCapacity` |
| `@/lib/queries/courses` | `getCoursePeriodById`, `getPublicCoursePeriods`, `getCourseTrackCapacity` |
| `@/lib/queries/organizers` | `getOrganizerBySlug`, `getOrganizerWithContent`, `getOrganizerStats` |
| `@/lib/queries/users` | `getUserAccountById`, `getUserRoles`, `hasOrganizerAccess` |

---

## Checklist Before Submitting Code

- [ ] Checked `@/components` for existing components
- [ ] Checked `@/hooks` for existing hooks
- [ ] Used formatters from `@/lib/formatters` (no inline formatting)
- [ ] Used types from `@/types`
- [ ] Used query functions in server actions (not raw Prisma)
- [ ] No date-fns imports for formatting
- [ ] No inline price calculations
- [ ] No duplicate card/empty state components
- [ ] **TypeScript compiles without errors** (`npx tsc --noEmit`)

---

## 🔴 TypeScript Requirements - MANDATORY

### Always Verify Type Safety

Before completing ANY task, you MUST run:

```bash
cd apps/web && npx tsc --noEmit
```

If there are errors, **fix them before considering the task complete**.

### Common TypeScript Mistakes to Avoid

#### ❌ Missing null checks
```tsx
// ❌ FORBIDDEN - Will crash if user is null
<span>{user.name}</span>

// ✅ REQUIRED - Handle null/undefined
<span>{user?.name ?? 'Unknown'}</span>
```

#### ❌ Incorrect function signatures
```tsx
// ❌ FORBIDDEN - Missing parameter types
async function getData(id) { ... }

// ✅ REQUIRED - Explicit types
async function getData(id: string): Promise<Event | null> { ... }
```

#### ❌ Using `any` type
```tsx
// ❌ FORBIDDEN - Never use any
const data: any = await fetchData()

// ✅ REQUIRED - Use proper types
import type { EventCardData } from '@/types'
const data: EventCardData[] = await fetchData()
```

#### ❌ Ignoring async/await types
```tsx
// ❌ FORBIDDEN - Missing await
const events = getEvents() // Returns Promise, not data!

// ✅ REQUIRED - Proper async handling
const events = await getEvents()
```

#### ❌ Wrong import paths
```tsx
// ❌ FORBIDDEN - Will fail in build
import { formatPrice } from '@/lib/formatter'  // typo!

// ✅ REQUIRED - Correct paths
import { formatPrice } from '@/lib/formatters'
```

### After Every Code Change

1. **Save the file** - Let VS Code show red squiggles
2. **Check for errors** - Run `npx tsc --noEmit` in `apps/web`
3. **Fix ALL errors** - Don't leave any TypeScript errors
4. **Verify build** - For major changes, run `npm run build`

### Type Checking Commands

```bash
# Quick type check (no emit)
cd apps/web && npx tsc --noEmit

# Check specific file patterns
cd apps/web && npx tsc --noEmit 2>&1 | grep "error TS"

# Full build check
cd apps/web && npm run build
```

### If You Encounter Type Errors

1. **Read the error message carefully** - TypeScript errors are descriptive
2. **Check the types** - Look in `@/types` for correct interfaces
3. **Check function signatures** - Ensure parameters match expected types
4. **Use type guards** - For union types, narrow with conditionals
5. **Don't use `as any` or `// @ts-ignore`** - Fix the root cause instead

---

## Related Documentation

- **[CODE_INVENTORY.md](../docs/CODE_INVENTORY.md)** - Complete inventory of all reusable code
- **[MIGRATION_GUIDE.md](../docs/MIGRATION_GUIDE.md)** - Patterns and migration guide
- **[DESIGN_SYSTEM.md](../docs/DESIGN_SYSTEM.md)** - UI design tokens
- **[Issue #10](../docs/issues/github/10-code-organization-refactor.md)** - Full refactor documentation
