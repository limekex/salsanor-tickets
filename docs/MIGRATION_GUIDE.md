# Migration Guide for Developers

**Created**: February 11, 2026  
**Related Issue**: [Issue #10 - Code Organization Refactor](issues/github/10-code-organization-refactor.md)

This guide helps developers understand the patterns established during the code organization refactor and how to use existing abstractions instead of creating duplicates.

---

## 🎯 Quick Reference

### Before You Code - Always Check:

| What you need | Where to find it |
|---------------|------------------|
| UI Components | `@/components/` (EventCard, CourseCard, EmptyState, grids) |
| shadcn/ui primitives | `@/components/ui/` (Button, Card, Dialog, etc.) |
| Date/Price/Text formatting | `@/lib/formatters` |
| TypeScript types | `@/types/` |
| Data queries | `@/lib/queries/` |
| Server actions | `@/app/actions/` |
| Custom hooks | `@/hooks/` |

---

## 📦 Import Patterns

### Components

```tsx
// ✅ Import from centralized exports
import { EventCard, CourseCard, EmptyState, EventGrid } from '@/components'

// ❌ Don't import from individual files
import EventCard from '@/components/event-card'
```

### Formatters

```tsx
// ✅ Import formatters
import { formatPrice, formatEventDate, formatDateRange, formatRelativeTime } from '@/lib/formatters'

// ❌ Don't use date-fns directly for formatting
import { format, formatDistanceToNow } from 'date-fns'

// ❌ Don't do inline price calculations
<span>{(priceCents ?? 0) / 100},-</span>
```

### Types

```tsx
// ✅ Import types from centralized location
import type { EventCardData, CourseTrackCard, UserProfile } from '@/types'

// ❌ Don't define types inline in components
interface MyEventType { ... }
```

### Queries

```tsx
// ✅ In server actions, use query functions
import { getEventsByOrganizer, getUserEventRegistrations } from '@/lib/queries'

// ❌ Don't write raw Prisma queries in actions
const events = await prisma.event.findMany({ ... })
```

---

## 🎨 Component Patterns

### Event Display

```tsx
// ✅ Use EventCard component
import { EventCard, EventGrid, EmptyState } from '@/components'

export default function EventsPage({ events }) {
  if (events.length === 0) {
    return <EmptyState icon={CalendarX} title="No events found" />
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

### Course Display

```tsx
// ✅ Use CourseCard component
import { CourseCard, CourseGrid, EmptyState } from '@/components'

export default function CoursesPage({ tracks }) {
  if (tracks.length === 0) {
    return <EmptyState icon={GraduationCap} title="No courses available" />
  }
  
  return (
    <CourseGrid>
      {tracks.map(track => (
        <CourseCard key={track.id} track={track} />
      ))}
    </CourseGrid>
  )
}
```

### Empty States

```tsx
// ✅ Use EmptyState component
import { EmptyState } from '@/components'
import { ShoppingCart, Calendar, Users } from 'lucide-react'

// No items
<EmptyState 
  icon={ShoppingCart} 
  title="Your cart is empty"
  description="Add some courses or events to get started"
/>

// With action
<EmptyState 
  icon={Calendar} 
  title="No upcoming events"
  action={{ label: "Browse all events", href: "/events" }}
/>
```

---

## 💰 Price Formatting

### Available Functions

| Function | Output Example | Use Case |
|----------|---------------|----------|
| `formatPrice(cents)` | `"299,-"` or `"Gratis"` | Display prices |
| `formatPriceRange(min, max)` | `"299,- - 399,-"` | Price ranges |
| `formatCurrency(cents)` | `"kr 299"` | Norwegian locale |
| `showZeroAsAmount(cents)` | `"0,-"` (never "Gratis") | Totals/subtotals |

### Examples

```tsx
import { formatPrice, formatPriceRange, showZeroAsAmount } from '@/lib/formatters'

// Single price
<span>{formatPrice(event.basePriceCents)}</span>  // "299,-"

// Free items
<span>{formatPrice(0)}</span>  // "Gratis"

// Subtotals (should show 0,- not Gratis)
<span>Subtotal: {showZeroAsAmount(subtotalCents)}</span>  // "0,-"

// Price range
<span>{formatPriceRange(minPrice, maxPrice)}</span>  // "299,- - 599,-"
```

---

## 📅 Date Formatting

### Available Functions

| Function | Output Example | Use Case |
|----------|---------------|----------|
| `formatEventDate(date)` | `"lørdag, 25. januar 2025"` | Full event date |
| `formatEventDateTime(date)` | `"lørdag, 25. jan kl. 19:00"` | Date with time |
| `formatDateShort(date)` | `"25. jan. 2025"` | Compact date |
| `formatDateRange(start, end)` | `"20. jan - 15. mar 2025"` | Date ranges |
| `formatTime(date)` | `"19:00"` | Time only |
| `formatWeekday(num)` | `"mandag"` | Day of week |
| `formatRelativeTime(date)` | `"2 timer siden"` | Relative time |
| `formatDateNumeric(date)` | `"25.01.2025"` | Numeric format |

### Examples

```tsx
import { 
  formatEventDate, 
  formatDateRange, 
  formatRelativeTime,
  formatWeekday 
} from '@/lib/formatters'

// Event detail page
<span>{formatEventDate(event.startDateTime)}</span>

// Course period
<span>{formatDateRange(period.startDate, period.endDate)}</span>

// Relative time (e.g., for "expires in...")
<span>{formatRelativeTime(invitation.expiresAt)}</span>

// Weekday from number (0=Sunday, 1=Monday, etc.)
<span>{formatWeekday(track.weekday)}</span>  // "tirsdag"
```

---

## 🪝 Custom Hooks

### useUser - Current User & Permissions

```tsx
import { useUser } from '@/hooks'

function MyComponent() {
  const { 
    user,           // Supabase auth user
    userAccount,    // Full account with roles
    isLoading,
    hasRole,        // hasRole('ADMIN')
    hasOrgRole,     // hasOrgRole(orgId, 'ORG_ADMIN')
    isOrgAdmin,     // isOrgAdmin(orgId)
    isGlobalAdmin   // isGlobalAdmin()
  } = useUser()
  
  if (isLoading) return <Spinner />
  
  if (isGlobalAdmin()) {
    // Show admin features
  }
}
```

### useOrganizerAccess - Organization Permissions

```tsx
import { useOrganizerAccess } from '@/hooks'

function OrgAdminComponent({ organizerId }) {
  const { 
    hasAccess,      // Any access to org
    isAdmin,        // ORG_ADMIN role
    isFinanceManager, // ORG_FINANCE role
    isCheckinStaff,   // ORG_CHECKIN role
    roles           // All roles array
  } = useOrganizerAccess(organizerId)
  
  if (!hasAccess) return <AccessDenied />
  
  if (isAdmin) {
    // Show admin features
  }
}
```

### useCart - Shopping Cart

```tsx
import { useCart } from '@/hooks'

function CartButton() {
  const { items, addItem, removeItem, clearCart, totalItems, totalPrice } = useCart()
  
  return (
    <Button onClick={() => addItem(item)}>
      Add to Cart ({totalItems})
    </Button>
  )
}
```

---

## 📊 Data Queries

### Pattern: Server Actions + Query Layer

```tsx
// ✅ Server action uses query layer
// /app/actions/events.ts
'use server'

import { requireOrgAdminForOrganizer } from '@/utils/auth-org-admin'
import { getEventsByOrganizer } from '@/lib/queries'

export async function getOrgEvents(organizerId: string) {
  // 1. Auth check
  await requireOrgAdminForOrganizer(organizerId)
  
  // 2. Use query function (pure data access)
  return await getEventsByOrganizer(organizerId)
}
```

### Available Query Functions

**Events (`@/lib/queries/events`):**
- `getEventById`, `getEventBySlug`
- `getEventsByOrganizer`, `getUpcomingEvents`, `getPastEvents`
- `getEventCapacity`, `isEventSlugAvailable`

**Courses (`@/lib/queries/courses`):**
- `getCoursePeriodById`, `getCoursePeriodBySlug`
- `getCoursePeriodsByOrganizer`, `getPublicCoursePeriods`
- `getCourseTrackCapacity`, `isCoursePeriodSlugAvailable`

**Organizers (`@/lib/queries/organizers`):**
- `getOrganizerById`, `getOrganizerBySlug`
- `getOrganizerWithContent`, `getActiveOrganizers`
- `getOrganizerStats`, `isOrganizerSlugAvailable`

**Users (`@/lib/queries/users`):**
- `getUserAccountById`, `getUserAccountByEmail`
- `getUserRoles`, `hasOrganizerAccess`
- `getUserEventRegistrations`, `getUserCourseRegistrations`

---

## ✅ Migration Checklist

When working on existing code, check for these patterns and migrate:

### Price Formatting
- [ ] Replace `{(price ?? 0) / 100},-` → `formatPrice(price)`
- [ ] Replace `{price.toLocaleString()}` → `formatPrice(price)`
- [ ] Replace `kr ${price}` → `formatCurrency(price)`

### Date Formatting
- [ ] Replace `import { format } from 'date-fns'` → `import { formatX } from '@/lib/formatters'`
- [ ] Replace `format(date, 'pattern')` → appropriate formatter function
- [ ] Replace `formatDistanceToNow()` → `formatRelativeTime()`
- [ ] Replace `WEEKDAY_LABELS[n]` → `formatWeekday(n)`

### Components
- [ ] Replace inline event cards → `<EventCard />`
- [ ] Replace inline course cards → `<CourseCard />`
- [ ] Replace inline empty states → `<EmptyState />`
- [ ] Replace inline grid layouts → `<EventGrid />` / `<CourseGrid />`

### Data Access
- [ ] Move Prisma queries from pages → server actions
- [ ] Move repeated queries from actions → query functions

---

## 🚫 Anti-Patterns to Avoid

### Don't: Import date-fns directly

```tsx
// ❌ BAD
import { format, formatDistanceToNow } from 'date-fns'
import { nb } from 'date-fns/locale'

format(date, 'dd.MM.yyyy', { locale: nb })
```

```tsx
// ✅ GOOD
import { formatDateNumeric } from '@/lib/formatters'

formatDateNumeric(date)
```

### Don't: Inline price calculations

```tsx
// ❌ BAD
<span>{event.basePriceCents ? `${(event.basePriceCents / 100).toFixed(0)},-` : 'Gratis'}</span>
```

```tsx
// ✅ GOOD
import { formatPrice } from '@/lib/formatters'

<span>{formatPrice(event.basePriceCents)}</span>
```

### Don't: Create duplicate card components

```tsx
// ❌ BAD - Creating a new event card
function MyEventCard({ event }) {
  return (
    <Card>
      <CardHeader>...</CardHeader>
      <CardContent>...</CardContent>
    </Card>
  )
}
```

```tsx
// ✅ GOOD - Use existing component
import { EventCard } from '@/components'

<EventCard event={event} showOrganizer />
```

### Don't: Define types inline

```tsx
// ❌ BAD
interface Event {
  id: string
  title: string
  // ... duplicating type definition
}
```

```tsx
// ✅ GOOD
import type { EventCardData } from '@/types'
```

---

## 📚 Further Reading

- [CODE_INVENTORY.md](CODE_INVENTORY.md) - Complete list of all reusable code
- [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) - UI design tokens and patterns
- [Issue #10](issues/github/10-code-organization-refactor.md) - Full refactor documentation
- [AGENT_INSTRUCTIONS.md](../.github/AGENT_INSTRUCTIONS.md) - Guidelines for AI agents

---

## 🆘 Need Help?

If you can't find what you need:

1. **Search CODE_INVENTORY.md** - Most patterns are documented there
2. **Search the codebase** - `grep -r "formatPrice" src/` to find usage examples
3. **Ask in the issue** - Create a discussion if you're unsure

Remember: **If you're copying code for the third time, extract it!**
