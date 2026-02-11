# i18n & l10n Strategy

## Current State (February 2026)

**Primary Language:** English (GB)
- All formatters use `enGB` locale from date-fns
- UI strings are in English
- Email templates support language selection (`primaryLanguage: 'no'` in email service)

## Why English First?

1. **TypeScript compliance** - Easier to work with during development
2. **Phase 2 readiness** - Build components with English, then add i18n
3. **i18n preparation** - Formatters designed to accept locale parameter in future

## Future i18n Implementation

### Recommended Approach

**Use `next-intl`** (Next.js App Router native solution):
- ✅ Server Component support
- ✅ Type-safe translation keys
- ✅ URL-based routing (`/en/events`, `/no/events`)
- ✅ Server-side locale detection

### Implementation Order

1. **Phase 2 (Now)** - Build components with English
2. **Phase 3** - Add `next-intl` setup
   - Install: `npm install next-intl`
   - Create locale files: `messages/en.json`, `messages/no.json`
   - Update formatters to accept locale parameter
3. **Phase 4** - Migrate existing strings
   - Replace hardcoded strings with `t('key')`
   - Add Norwegian translations
4. **Phase 5** - Language switcher UI

### Formatter Updates Needed

When adding i18n, update formatters to accept locale:

```typescript
// Current (English only)
export function formatEventDate(date: Date | string): string {
  return format(dateObj, 'EEEE, d MMMM yyyy', { locale: enGB })
}

// Future (i18n ready)
export function formatEventDate(
  date: Date | string,
  locale: Locale = enGB
): string {
  return format(dateObj, 'EEEE, d MMMM yyyy', { locale })
}
```

### Translation Keys Structure

```json
{
  "common": {
    "free": "Free",
    "today": "Today",
    "tomorrow": "Tomorrow",
    "and": "and",
    "or": "or"
  },
  "events": {
    "title": "Events",
    "noEvents": "No events found"
  },
  "cart": {
    "addToCart": "Add to Cart",
    "checkout": "Checkout"
  }
}
```

### Email Templates

Email service already has language support:
- `primaryLanguage` in organization settings
- Template selection by language
- Keep this pattern when adding UI i18n

## Norwegian Considerations

- **Date formats**: "25. januar 2025" (note the period after day)
- **Currency**: "kr 299" vs "NOK 299"
- **Weekdays**: "lørdag", "søndag" (with ø)
- **Relative time**: "2 timer siden" vs "2 hours ago"

## References

- [next-intl docs](https://next-intl-docs.vercel.app/)
- [date-fns locales](https://date-fns.org/docs/I18n)
- Email service: [/apps/web/src/lib/email/email-service.ts](/apps/web/src/lib/email/email-service.ts)
