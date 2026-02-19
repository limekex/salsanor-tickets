# Internationalization (i18n) Guide

**Last Updated**: February 19, 2026  
**Status**: Phase 1 Complete (Foundation Ready)

## Overview

The application uses a centralized text management system that is ready for full internationalization support. Currently, all UI text is in English, but the structure allows for easy integration with i18n libraries.

## Current Implementation

### Text Constants (`/lib/i18n/ui-text.ts`)

All user-facing text is centralized in the `UI_TEXT` constant object:

```typescript
import { UI_TEXT } from '@/lib/i18n'

// Usage in components
<h1>{UI_TEXT.tickets.title}</h1>
// Output: "My Event Tickets"
```

### Helper Functions

**Pluralization Helper:**
```typescript
import { getCountText } from '@/lib/i18n'

const count = 5
const text = getCountText(
  UI_TEXT.tickets.singular,  // "ticket"
  UI_TEXT.tickets.plural,    // "tickets"
  count
)
// Output: "tickets" (plural because count > 1)
```

**Dynamic Text with Parameters:**
```typescript
// Function-based text for dynamic content
const message = UI_TEXT.memberships.pendingMessage("Gold")
// Output: "Your Gold membership is waiting for validation from an administrator."
```

## Text Categories

### Portal Text
- Navigation labels
- Page titles
- Welcome messages

### Tickets Section
- Page headers
- Empty states
- Ticket labels and counts
- Action buttons

### Courses Section
- Registration lists
- Waitlist messages
- Role displays

### Memberships Section
- Membership status
- Pending approval messages
- Tier information

### Dashboard
- Card titles
- Quick action labels
- Navigation links

### Common Text
- Navigation elements
- Status labels
- Dates and timestamps

## Adding New Text

### 1. Add to UI_TEXT constant

Edit `/lib/i18n/ui-text.ts`:

```typescript
export const UI_TEXT = {
  // ... existing sections ...
  
  newSection: {
    title: 'New Section Title',
    description: 'Description text',
    action: 'Action Button',
    // For dynamic text, use functions
    dynamicMessage: (param: string) => `Message with ${param}`,
  },
} as const
```

### 2. Import and use in components

```typescript
import { UI_TEXT } from '@/lib/i18n'

function MyComponent() {
  return (
    <div>
      <h1>{UI_TEXT.newSection.title}</h1>
      <p>{UI_TEXT.newSection.description}</p>
      <button>{UI_TEXT.newSection.action}</button>
    </div>
  )
}
```

## Future: Full i18n Integration

### Recommended Libraries

1. **next-intl** (Recommended for Next.js)
   - Native Next.js App Router support
   - Type-safe translations
   - Server and client component support

2. **react-i18next**
   - Popular, mature library
   - Extensive features
   - Large ecosystem

### Migration Path

**Phase 1: Foundation (✅ Complete)**
- Centralized text constants
- English-only implementation
- Helper functions for pluralization

**Phase 2: Library Integration (Future)**
1. Install i18n library (e.g., `next-intl`)
2. Create translation files:
   ```
   locales/
   ├── en.json  (from UI_TEXT)
   ├── no.json  (Norwegian translations)
   └── ...
   ```
3. Set up i18n provider and context
4. Replace `UI_TEXT` imports with translation hooks:
   ```typescript
   // Before
   import { UI_TEXT } from '@/lib/i18n'
   <h1>{UI_TEXT.tickets.title}</h1>
   
   // After (with next-intl)
   import { useTranslations } from 'next-intl'
   const t = useTranslations('tickets')
   <h1>{t('title')}</h1>
   ```

**Phase 3: Language Switching (Future)**
- Add language selector UI
- Persist user language preference
- Server-side language detection
- URL-based locale routing (`/en/my`, `/no/my`)

## Translation Keys Structure

The current `UI_TEXT` structure maps directly to future translation keys:

```typescript
// Current: UI_TEXT.tickets.title
// Future key in en.json:
{
  "tickets": {
    "title": "My Event Tickets"
  }
}

// Future key in no.json:
{
  "tickets": {
    "title": "Mine Arrangementsbilett"
  }
}
```

## Best Practices

### DO ✅
- Always use `UI_TEXT` constants for user-facing text
- Use helper functions for pluralization
- Use function-based text for dynamic content
- Keep related text grouped in logical sections

### DON'T ❌
- Don't hardcode text strings in components
- Don't use inline pluralization logic
- Don't create duplicate text constants
- Don't forget to update documentation when adding new text

## Example: Converting Hardcoded Text

**Before (❌ Bad):**
```typescript
function TicketList({ count }: { count: number }) {
  return (
    <div>
      <h1>My Event Tickets</h1>
      <p>{count} {count === 1 ? 'ticket' : 'tickets'}</p>
      <p>No event tickets</p>
    </div>
  )
}
```

**After (✅ Good):**
```typescript
import { UI_TEXT, getCountText } from '@/lib/i18n'

function TicketList({ count }: { count: number }) {
  return (
    <div>
      <h1>{UI_TEXT.tickets.title}</h1>
      <p>
        {count} {getCountText(
          UI_TEXT.tickets.singular,
          UI_TEXT.tickets.plural,
          count
        )}
      </p>
      <p>{UI_TEXT.tickets.noTickets}</p>
    </div>
  )
}
```

## Files

### Core i18n Files
- `/lib/i18n/ui-text.ts` - Text constants and helpers
- `/lib/i18n/index.ts` - Public exports

### Files Using i18n
- `/app/(site)/my/page.tsx` - Dashboard
- `/app/(site)/my/tickets/page.tsx` - Tickets page
- `/app/(site)/my/courses/page.tsx` - Courses page
- `/app/(site)/my/memberships/page.tsx` - Memberships page

## Related Documentation

- [PARTICIPANT_PORTAL.md](./PARTICIPANT_PORTAL.md) - Portal implementation details
- [CODE_INVENTORY.md](./CODE_INVENTORY.md) - Reusable components and utilities
- [next-intl Documentation](https://next-intl-docs.vercel.app/) - Recommended i18n library
