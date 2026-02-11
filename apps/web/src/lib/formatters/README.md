# Formatting Utilities

Centralized formatting functions to ensure consistency across the RegiNor application.

> **Language:** English (GB) is the primary language. Norwegian localization will be added via i18n in the future.

## Quick Start

```typescript
import { formatPrice, formatEventDate, truncate } from '@/lib/formatters'

// Price formatting
const price = formatPrice(29900) // "299,-"
const range = formatPriceRange(29900, 39900) // "299,- - 399,-"

// Date formatting (English)
const date = formatEventDate(event.startDateTime) // "Saturday, 25 January 2025"
const dateRange = formatDateRange(period.startDate, period.endDate) // "20 January - 15 March 2025"

// Text formatting
const short = truncate(event.longDescription, 100) // Truncates to 100 chars with "..."
const slug = slugify("Salsa Workshop 2025") // "salsa-workshop-2025"
```

## Why Use Formatters?

✅ **Consistency** - Same format everywhere  
✅ **English Locale** - Proper "Saturday", "Monday", etc. (i18n ready)  
✅ **Type Safety** - Handles `null`, `undefined`, edge cases  
✅ **Maintainability** - Change once, update everywhere  
✅ **Less Code** - No more `(priceCents ?? 0) / 100` everywhere

## Migration Guide

### Before (Inline Formatting)
```typescript
// ❌ Old way - duplicated across 50+ files
<span>{(event.basePriceCents ?? 0) === 0 ? 'Free' : `${(event.basePriceCents ?? 0) / 100},-`}</span>
<span>{format(event.startDateTime, 'EEEE, MMMM d, yyyy')}</span>
```

### After (Using Formatters)
```typescript
// ✅ New way - consistent, type-safe, reusable
import { formatPrice, formatEventDate } from '@/lib/formatters'

<span>{formatPrice(event.basePriceCents)}</span>
<span>{formatEventDate(event.startDateTime)}</span>
```

## Price Formatters

### `formatPrice(cents)`
Formats price in Norwegian kroner.

```typescript
formatPrice(29900)  // "299,-"
formatPrice(0)      // "Free"
formatPrice(null)   // "Free"
```

### `formatPriceRange(minCents, maxCents)`
Formats a price range.

```typescript
formatPriceRange(29900, 39900)  // "299,- - 399,-"
formatPriceRange(29900, 29900)  // "299,-" (same price)
formatPriceRange(0, 29900)      // "Free - 299,-"
```

### `formatCurrency(cents, options?)`
Uses Intl.NumberFormat with Norwegian locale.

```typescript
formatCurrency(29900)  // "kr 299"
formatCurrency(29950, { minimumFractionDigits: 2 })  // "kr 299,50"
```

## Date Formatters

### `formatEventDate(date)`
Full event date in English.

```typescript
formatEventDate(new Date('2025-01-25'))  
// "Saturday, 25 January 2025"
```

### `formatEventDateTime(date)`
Date with time.

```typescript
formatEventDateTime(new Date('2025-01-25T19:00:00'))  
// "Saturday, 25 January 2025 at 19:00"
```

### `formatDateRange(startDate, endDate)`
Smart date range formatting.

```typescript
// Same month
formatDateRange(new Date('2025-01-20'), new Date('2025-01-25'))
// "20-25 January 2025"

// Different months, same year
formatDateRange(new Date('2025-01-20'), new Date('2025-03-15'))
// "20 January - 15 March 2025"

// Different years
formatDateRange(new Date('2024-12-20'), new Date('2025-03-15'))
// "20 December 2024 - 15 March 2025"
```

### `formatWeekday(weekday)`
Convert weekday number (1-7) to English name.

```typescript
formatWeekday(1)  // "Monday"
formatWeekday(5)  // "Friday"
formatWeekday(7)  // "Sunday"
```

### `formatSmartDate(date)`
Smart relative date display.

```typescript
formatSmartDate(new Date())           // "Today"
formatSmartDate(tomorrow)             // "Tomorrow"
formatSmartDate(nextWeek)            // "Monday" (day name)
formatSmartDate(futureDate)          // "25 January 2025"
```

## Text Formatters

### `truncate(text, maxLength)`
Truncate text with ellipsis.

```typescript
truncate("This is a long text", 10)  // "This is a..."
truncate("Short", 10)                // "Short"
```

### `slugify(text)`
Generate URL-friendly slugs.

```typescript
slugify("Hello World!")      // "hello-world"
slugify("Øystein's Café")   // "oysteins-cafe"
slugify("Salsa & Bachata")  // "salsa-bachata"
```

### `pluralize(count, singular, plural?)`
Smart pluralization with count.

```typescript
pluralize(1, "ticket")               // "1 ticket"
pluralize(5, "ticket")               // "5 tickets"
pluralize(1, "person", "people")    // "1 person"
pluralize(5, "person", "people")    // "5 people"
```

### `capitalize(text)`
Capitalize each word.

```typescript
capitalize("hello world")  // "Hello World"
```

### `getInitials(name, maxLength?)`
Extract initials from name.

```typescript
getInitials("Bjørn Tore Almas")     // "BT"
getInitials("Bjørn Tore Almas", 3)  // "BTA"
```

### `formatList(items, conjunction?)`
Format array as comma-separated list.

```typescript
formatList(["Alice", "Bob"])              // "Alice and Bob"
formatList(["Alice", "Bob", "Charlie"])   // "Alice, Bob and Charlie"
formatList(["Alice", "Bob"], "or")        // "Alice or Bob"
```

## Testing

Run the test suite to verify all formatters:

```bash
cd apps/web
npx tsx src/lib/formatters/__tests__/formatters.test.ts
```

## Adding New Formatters

1. Add function to appropriate file (`price.ts`, `date.ts`, or `text.ts`)
2. Add JSDoc comments with examples
3. Export from `index.ts`
4. Add to this README
5. Update CODE_INVENTORY.md

## See Also

- [Type Definitions](/apps/web/src/types/) - TypeScript types for all entities
- [CODE_INVENTORY.md](/docs/CODE_INVENTORY.md) - Full component inventory
- [DESIGN_SYSTEM.md](/docs/DESIGN_SYSTEM.md) - RegiNor design tokens
