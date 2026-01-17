# Code Inventory

Last updated: January 2025

This document tracks existing reusable code to prevent duplication.

---

## Custom Hooks (`/src/hooks/`)

| Hook | Purpose | Usage |
|------|---------|-------|
| `use-cart` | Shopping cart state management | Cart context, add/remove items |

**Note:** Currently underutilized. Consider adding:
- `use-user` - Current user context
- `use-organizer-access` - Check org permissions
- `use-format` - Formatting utilities

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
- [ ] `EventCard` - Reusable event display card
- [ ] `CourseCard` - Reusable course display card
- [ ] `OrganizerCard` - Organizer preview card
- [ ] `TicketCard` - Ticket display card

### Lists & Grids
- [ ] `EventGrid` - Grid of event cards
- [ ] `CourseGrid` - Grid of course cards
- [ ] `EmptyState` - "No items" placeholder
- [ ] `LoadingSkeleton` - Loading state for lists

### Formatters (`/src/lib/formatters/`)
- [ ] `formatPrice(cents)` - Convert cents to display price
- [ ] `formatEventDate(date)` - Format event dates
- [ ] `formatDateRange(start, end)` - Format date ranges
- [ ] `formatCurrency(amount)` - Currency formatting

### Queries (`/src/lib/queries/`)
- [ ] `eventQueries.ts` - Reusable Prisma event queries
- [ ] `courseQueries.ts` - Reusable Prisma course queries
- [ ] `organizerQueries.ts` - Reusable Prisma organizer queries

---

## Usage Notes

### Price Formatting
Currently prices are formatted inline. Use this pattern:

```tsx
// Prices are stored in cents (øre)
const displayPrice = (basePriceCents ?? 0) / 100
// Output: "299,-" or "Free"
```

### Date Formatting
Uses date-fns with English locale:

```tsx
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
