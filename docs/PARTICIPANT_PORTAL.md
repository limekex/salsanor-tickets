# Participant Portal Documentation

**Last Updated**: February 19, 2026  
**Status**: ✅ Complete  
**Language**: English (i18n-ready)

## Overview

The participant portal is a well-organized dashboard located at `/my/` that provides users with a centralized location to view and manage their event tickets, course registrations, and memberships.

All UI text is in English and structured for future internationalization (i18n) support.

## Portal Structure

### Main Dashboard (`/my/`)
The main portal dashboard displays:
- **Overview Cards**: Count of event tickets, course registrations, and memberships
- **Quick Actions**: Links to browse courses/events and access settings
- **Navigation**: Easy access to all sub-sections

### Sub-Sections

#### Event Tickets (`/my/tickets/`)
- Lists all event registrations (excluding drafts)
- Displays QR codes for active tickets
- Shows ticket details: quantity, date, payment status
- Handles pending payments and order cancellations
- Empty state with link to browse events

#### Course Registrations (`/my/courses/`)
- Lists all course registrations (excluding drafts)
- Displays course tickets with QR codes
- Shows waitlist offers with accept/decline actions
- Handles pending payments and order cancellations
- Empty state with link to browse courses

#### Memberships (`/my/memberships/`)
- Displays active and pending memberships
- Shows membership cards with organizer branding
- Indicates pending approval status
- Empty state with link to browse organizations

## Navigation Integration

### Public Navigation
- Desktop and mobile navigation updated to show "My Portal" instead of "My Profile"
- Links to `/my/` for authenticated users

### Footer
- Updated product section to link to "My Portal"

### Other Pages
All internal links updated:
- Homepage CTA buttons
- Success page after payment
- Checkout error pages
- Membership pending pages

## Backward Compatibility

The old `/profile` route now redirects to `/my/` to maintain backward compatibility with:
- Existing bookmarks
- External links
- Email links

## Implementation Details

### Authentication
All portal pages require authentication:
```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()

if (!user) {
  redirect('/auth/login')
}
```

### Onboarding Check
Redirects to onboarding if user profile is incomplete:
```typescript
if (!userAccount?.PersonProfile) {
  redirect('/onboarding')
}
```

### Data Fetching
Uses Prisma queries to fetch user data with proper relations:
- EventRegistration with Event and Organizer
- Registration with CourseTrack and CoursePeriod
- Membership with MembershipTier and Organizer

### Components Used
Following CODE_INVENTORY.md guidelines:
- `EmptyState` - For empty list states
- `Card`, `CardHeader`, `CardContent` - For card layouts
- `Badge` - For status indicators
- `Button` - For actions and navigation
- `QRCodeDisplay` - For ticket QR codes
- `TicketQR` - For course period tickets
- `MembershipCard` - For membership display
- `PayButton` - For payment actions
- `CancelOrderButton` - For order cancellations

### Formatters Used
Following AGENT_INSTRUCTIONS.md:
- `formatDateShort()` - For date displays
- `formatDateTimeShort()` - For date/time displays
- `formatPrice()` - For price displays
- `formatRelativeTime()` - For waitlist offer expiry

### Internationalization (i18n)
All UI text managed through centralized constants:
- Text constants in `@/lib/i18n/ui-text.ts`
- Helper functions for pluralization (`getCountText`)
- Type-safe text references using `UI_TEXT` object
- **Current language**: English (en-GB)
- **Ready for**: i18n library integration (next-intl, react-i18next, etc.)

Example usage:
```typescript
import { UI_TEXT, getCountText } from '@/lib/i18n'

// Simple text
<h1>{UI_TEXT.tickets.title}</h1>

// Pluralization
{getCountText(UI_TEXT.tickets.singular, UI_TEXT.tickets.plural, count)}

// Dynamic text with parameters
{UI_TEXT.memberships.pendingMessage(tierName)}
```

### UI Guidelines
Follows RegiNor_UI_Guidelines.md:
- Minimal, calm design
- Semantic color usage (badges)
- Consistent spacing with rn-* tokens
- Clear call-to-action buttons
- English language for all user-facing text (i18n-ready)

## Routes Summary

| Route | Purpose | Components |
|-------|---------|------------|
| `/my/` | Main dashboard | Overview cards, quick actions |
| `/my/tickets/` | Event tickets list | QR codes, payment buttons |
| `/my/courses/` | Course registrations | Tickets, waitlist offers |
| `/my/memberships/` | Active memberships | Membership cards |
| `/profile` | Legacy route | Redirects to `/my/` |

## Future Enhancements

Potential improvements:
- **Full i18n Support**: Integrate i18n library for multiple languages (Norwegian, English, etc.)
- Order history section (`/my/orders/`)
- Payment history section (`/my/payments/`)
- Notification preferences (`/my/notifications/`)
- Favorites/wishlist (`/my/favorites/`)
- Profile customization beyond settings

## Related Documentation

- [CODE_INVENTORY.md](./CODE_INVENTORY.md) - Reusable components and utilities
- [AGENT_INSTRUCTIONS.md](../.github/AGENT_INSTRUCTIONS.md) - Development guidelines
- [RegiNor_UI_Guidelines.md](./UI%20Guidelines/RegiNor_UI_Guidelines.md) - Design system
