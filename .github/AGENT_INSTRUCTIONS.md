# Agent Development Instructions

## Code Organization Guidelines

When developing features for this project, follow these guidelines to maintain consistency and reusability.

---

## Directory Structure

```
src/
├── app/
│   ├── actions/          # Server Actions for data mutations
│   └── (site)/           # Public pages
│       └── api/          # API routes
├── components/
│   ├── ui/               # shadcn/ui primitives (Button, Card, etc.)
│   ├── cards/            # Reusable card components
│   ├── lists/            # Grid/list components
│   └── sections/         # Page sections (headers, footers)
├── hooks/                # Custom React hooks (client-side)
├── lib/
│   ├── queries/          # Reusable Prisma queries
│   ├── formatters/       # Date, price, text formatting
│   └── services/         # Business logic (email, payments)
├── types/                # TypeScript type definitions
└── utils/                # Utility functions
```

---

## Before Creating New Code

### 1. Check for Existing Components

Before creating UI elements, check these locations:

| Need | Check First |
|------|-------------|
| Button, Input, Card | `/components/ui/` |
| Event display | `/components/cards/event-card.tsx` |
| Course display | `/components/cards/course-card.tsx` |
| Empty states | `/components/lists/empty-state.tsx` |
| Loading states | `/components/lists/loading-grid.tsx` |

### 2. Check for Existing Hooks

| Need | Check First |
|------|-------------|
| Cart state | `useCart` from `/hooks/use-cart` |
| Current user | `useUser` from `/hooks/use-user` |
| Org admin check | `useOrganizerAccess` from `/hooks/use-organizer-access` |
| Formatting | `useFormat` from `/hooks/use-format` |

### 3. Check for Existing Server Actions

| Need | Check First |
|------|-------------|
| Event data | `/app/actions/events.ts` |
| Course data | `/app/actions/courses.ts` |
| Organizer data | `/app/actions/organizers.ts` |
| User/Auth | `/app/actions/auth.ts` |
| Checkout | `/app/actions/checkout.ts` |

### 4. Check for Existing Queries

| Need | Check First |
|------|-------------|
| Event queries | `/lib/queries/events.ts` |
| Course queries | `/lib/queries/courses.ts` |
| Organizer queries | `/lib/queries/organizers.ts` |

---

## Patterns to Follow

### Creating a New Page

```tsx
// ✅ GOOD - Use existing components
import { EventCard } from '@/components/cards/event-card'
import { EventGrid } from '@/components/lists/event-grid'
import { EmptyState } from '@/components/lists/empty-state'
import { getUpcomingEvents } from '@/app/actions/events'

export default async function EventsPage() {
    const events = await getUpcomingEvents()
    
    if (events.length === 0) {
        return <EmptyState message="No upcoming events" />
    }
    
    return <EventGrid events={events} />
}

// ❌ BAD - Hardcoding everything
export default async function EventsPage() {
    const events = await prisma.event.findMany({...})
    
    return (
        <div className="grid gap-4">
            {events.map(event => (
                <Card key={event.id}>
                    {/* 50 lines of hardcoded UI */}
                </Card>
            ))}
        </div>
    )
}
```

### Creating a New Component

```tsx
// ✅ GOOD - Typed props, uses design system
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatPrice } from '@/lib/formatters/price'
import type { Event } from '@/types'

interface EventCardProps {
    event: Event
    showPrice?: boolean
    onClick?: () => void
}

export function EventCard({ event, showPrice = true, onClick }: EventCardProps) {
    return (
        <Card onClick={onClick}>
            <CardHeader>
                <CardTitle>{event.title}</CardTitle>
            </CardHeader>
            {showPrice && (
                <CardContent>
                    {formatPrice(event.basePriceCents)}
                </CardContent>
            )}
        </Card>
    )
}
```

### Data Fetching

```tsx
// ✅ GOOD - Server Action in /app/actions/
// /app/actions/events.ts
'use server'

import { prisma } from '@/lib/db'

export async function getUpcomingEvents(limit?: number) {
    return prisma.event.findMany({
        where: {
            startDateTime: { gte: new Date() },
            status: 'PUBLISHED'
        },
        orderBy: { startDateTime: 'asc' },
        take: limit
    })
}

// ❌ BAD - Query directly in page component
export default async function Page() {
    const events = await prisma.event.findMany({
        // Duplicate query logic...
    })
}
```

### Formatting Values

```tsx
// ✅ GOOD - Use formatters
import { formatPrice } from '@/lib/formatters/price'
import { formatEventDate } from '@/lib/formatters/date'

<span>{formatPrice(event.basePriceCents)}</span>
<span>{formatEventDate(event.startDateTime)}</span>

// ❌ BAD - Inline formatting
<span>{event.basePriceCents / 100},-</span>
<span>{new Date(event.startDateTime).toLocaleDateString('en-US')}</span>
```

---

## When to Create New Abstractions

Create a new reusable component/hook when:

1. **Used 3+ times** - If you're copying code a third time, extract it
2. **Complex logic** - If formatting/calculation logic is > 5 lines
3. **Testable unit** - If it's something that should be unit tested
4. **Design system** - If it's a visual pattern used across the app

**Don't over-abstract:**
- One-off layouts can stay in the page file
- Simple string concatenation doesn't need a utility
- If props become too complex, maybe it shouldn't be a component

---

## Checklist Before PR

- [ ] Checked `/components/` for existing components
- [ ] Checked `/hooks/` for existing hooks  
- [ ] Checked `/app/actions/` for existing server actions
- [ ] Used TypeScript types from `/types/`
- [ ] Used formatters from `/lib/formatters/`
- [ ] New reusable code is properly exported
- [ ] Added JSDoc comments for public functions
