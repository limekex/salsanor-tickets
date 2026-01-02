# RegiNor Design System Implementation

**Date:** 21. desember 2025  
**Product:** RegiNor.event  
**Positioning:** "from signup to showtime"

## Overview

This design system implements the RegiNor UI Guidelines with a focus on:
- **Minimal, calm, fast, predictable** user interfaces
- **Performance-first** with lightweight CSS and minimal JavaScript
- **Semantic color** usage for state indication
- **Consistent spacing** using an 8px grid system

## Files

### Core CSS
- `apps/web/src/styles/tokens.css` - All design tokens as CSS variables
- `apps/web/src/app/globals.css` - Imports tokens and integrates with Tailwind

### Documentation
- `docs/UI Guidelines/RegiNor_UI_Guidelines.md` - Complete design guidelines
- `docs/UI Guidelines/reginor_ui_demo.html` - Visual reference

## Design Tokens

### Colors

**Neutrals**
```css
--rn-bg: #F8FAFC           /* App background */
--rn-surface: #FFFFFF      /* Cards, panels */
--rn-surface-2: #F1F5F9    /* Subtle sections */
--rn-border: #E2E8F0       /* Border color */
--rn-text: #0F172A         /* Primary text */
--rn-text-muted: #64748B   /* Secondary text */
--rn-text-subtle: #94A3B8  /* Tertiary text */
```

**Brand**
```css
--rn-primary: #16A6B6      /* Teal accent, primary CTA */
--rn-primary-strong: #0E7C88 /* Hover/active */
--rn-focus: #16A6B6        /* Focus ring */
```

**Semantic**
```css
--rn-success: #16A34A      /* Green for success */
--rn-warning: #F59E0B      /* Orange for warnings */
--rn-danger: #DC2626       /* Red for errors */
--rn-info: #2563EB         /* Blue for info */
```

### Typography

**Font:** Inter with system-ui fallback  
**Base size:** 15px  
**Line-height:** 1.45  

**Scale:**
- `--rn-h1`: 28px / 600
- `--rn-h2`: 22px / 600
- `--rn-h3`: 18px / 600
- `--rn-body`: 15px / 450
- `--rn-meta`: 13px / 500
- `--rn-caption`: 12px / 500

### Spacing (8px system)

```css
--rn-s-1: 4px
--rn-s-2: 8px
--rn-s-3: 12px
--rn-s-4: 16px
--rn-s-5: 24px
--rn-s-6: 32px
--rn-s-7: 40px
--rn-s-8: 48px
```

### Radius

```css
--rn-r-1: 8px   /* Inputs, buttons */
--rn-r-2: 12px  /* Cards */
--rn-r-3: 16px  /* Modals, panels */
```

### Shadows (minimal)

```css
--rn-shadow-1: 0 1px 2px rgba(15, 23, 42, 0.06)
--rn-shadow-2: 0 6px 18px rgba(15, 23, 42, 0.10)
```

## Usage in Tailwind

All tokens are available in Tailwind via the `@theme` directive:

```tsx
// Colors
className="bg-rn-surface border-rn-border text-rn-text"
className="text-rn-text-muted"
className="bg-rn-primary hover:bg-rn-primary-strong"

// Spacing
className="p-rn-4 gap-rn-3"
className="mt-rn-5 mb-rn-6"

// Radius
className="rounded-rn-1"  // 8px for buttons/inputs
className="rounded-rn-2"  // 12px for cards
className="rounded-rn-3"  // 16px for modals

// Shadows
className="shadow-rn-1"   // Subtle
className="shadow-rn-2"   // Elevated
```

## CSS Utility Classes

For direct CSS usage:

```tsx
// Typography
className="rn-h1"
className="rn-h2"
className="rn-meta"

// Surfaces
className="rn-surface"      // White card with border
className="rn-focus-ring"   // Focus state
className="rn-shadow-1"     // Subtle shadow

// Status colors
className="rn-status-success"
className="rn-status-warning"
className="rn-status-danger"
```

## Component Guidelines

### Buttons
- Heights: `sm` 36px, `md` 40px (default), `lg` 44px (check-in)
- Variants: Primary (solid teal), Secondary (white + border), Tertiary (text-only), Danger (solid red)
- Disabled: opacity 0.55, cursor not-allowed

### Inputs
- Height: 40px
- Border: 1px
- Focus: ring + border in primary
- Error state: border in danger + helper text

### Tables
- Row height: 44px
- Sticky header if scrollable
- Subtle zebra stripes optional
- Status pills: small, compact, semantic colors

### Status Pills
**ALWAYS use semantic colors:**
- ACTIVE → success (green)
- WAITLIST → warning (orange)
- UNPAID → danger (red)
- DRAFT/PENDING → muted (gray)

## Principles

1. **Clarity beats decoration** - Remove what doesn't improve understanding
2. **Calm under pressure** - UI must work in real-world conditions
3. **One primary action per screen** - Especially for checkout and check-in
4. **Text first** - Icons support text, never replace it
5. **Semantic color only** - Color indicates state, not style
6. **Performance is a feature** - SSR-first, minimal client JS

## Implementation Status

### ✅ Phase 1: Foundation (Complete)
- [x] Created `tokens.css` with all RegiNor design tokens
- [x] Integrated tokens with Tailwind v4 CSS-first approach
- [x] Created comprehensive documentation
- [x] All tokens exposed to Tailwind (color-rn-*, spacing-rn-*, etc.)
- [x] Mobile-first responsive utilities implemented

### ✅ Phase 2: Core Components (Complete - 13/13)
- [x] Button - 40px height, RegiNor colors, opacity-55
- [x] Input - 40px height, rounded-rn-1, border-rn-border
- [x] Card - rounded-rn-2 (12px), shadow-rn-1, gap-rn-5
- [x] Badge - semantic variants (success, warning, danger)
- [x] Table - 44px row height, RegiNor colors
- [x] Label - text-rn-text, opacity-55 disabled
- [x] Dialog - RegiNor spacing, rounded-rn-2, shadow-rn-3
- [x] Select - h-10, rounded-rn-1, RegiNor colors
- [x] Alert - rounded-rn-2, semantic variants
- [x] Textarea - rounded-rn-1, RegiNor colors
- [x] Checkbox - RegiNor colors, shadow-rn-1
- [x] Switch - RegiNor primary color
- [x] Separator - bg-rn-border

### ✅ Phase 3: Pages & Features (Complete - 100%)

#### ✅ Staff Admin Pages (Complete - 8/8)
- [x] Dashboard (`/staffadmin`) - Mobile-first layout
- [x] Registrations (`/staffadmin/registrations`)
- [x] Track Detail (`/staffadmin/tracks/detail/[trackId]`)
- [x] Periods List (`/staffadmin/periods`)
- [x] Period Edit (`/staffadmin/periods/[periodId]`)
- [x] Memberships (`/staffadmin/memberships`)
- [x] Membership Tiers (`/staffadmin/memberships/tiers`)
- [x] Users (`/staffadmin/users`)
- [x] Settings (`/staffadmin/settings`)

#### ✅ Admin Pages (Complete - 8/8)
- [x] Dashboard (`/admin`) - KPI cards with RegiNor colors
- [x] Tracks (`/admin/tracks`)
- [x] Track Detail (`/admin/tracks/[id]`) - Mobile responsive
- [x] Registrations (`/admin/registrations`)
- [x] Finance (`/admin/finance`) - Mobile KPI layout
- [x] Organizers (`/admin/organizers`)
- [x] Periods (`/admin/periods`) - Semantic badges
- [x] Users (`/admin/users`) - Mobile-first layout
- [x] Email Settings (`/admin/email`)

#### ✅ Public/User Pages (Complete - 8/8)
- [x] Home Page (`/`) - Responsive hero, full-width mobile buttons
- [x] Courses (`/courses`) - Mobile-first filters
- [x] Organizer Page (`/org/[slug]`)
- [x] Profile Page (`/profile`) - Stacked mobile layout
- [x] Profile Settings (`/profile/settings`)
- [x] Checkout Page (`/checkout/[orderId]`)
- [x] Success Page (`/success`)
- [x] Auth/Login Page (`/auth/login`) - Mobile-responsive tabs

#### ✅ System Pages (Complete - 2/2)
- [x] Onboarding (`/onboarding`) - Centered mobile card
- [x] Dashboard Routing (`/dashboard`) - Role-based colors

#### ✅ Components (Complete - 1/1)
- [x] Cancel Registration Dialog - Full RegiNor styling

### ✅ Phase 4: Mobile-First Implementation (Complete)
- [x] All pages use `px-rn-4` for consistent mobile padding
- [x] Flex layouts use `flex-col sm:flex-row` for responsive stacking
- [x] Grids use `grid-cols-1 sm:grid-cols-2 md:grid-cols-3` patterns
- [x] Buttons on mobile use `w-full sm:w-auto` where appropriate
- [x] Headers use `gap-rn-4` for proper mobile spacing
- [x] Typography scales responsively: `text-4xl sm:text-5xl lg:text-6xl`
- [x] All spacing uses RegiNor tokens (gap-rn-*, space-y-rn-*, etc.)
- [x] Semantic colors applied consistently across all status badges
- [x] All text uses RegiNor typography utilities (rn-h1, rn-h2, rn-meta, rn-caption)

## Mobile-First Patterns Implemented

### Layout Patterns
```tsx
// Container with responsive padding
<div className="container mx-auto py-rn-10 px-rn-4 sm:px-rn-6">

// Responsive flex layout (stacks on mobile)
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-rn-4">

// Responsive grid
<div className="grid gap-rn-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">

// Full-width mobile buttons
<Button className="w-full sm:w-auto">Action</Button>
```

### Typography Patterns
```tsx
// Responsive headings
<h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold">

// RegiNor semantic typography
<h1 className="rn-h1">Main Heading</h1>
<h2 className="rn-h2">Section Heading</h2>
<p className="rn-meta text-rn-text-muted">Description</p>
<span className="rn-caption">Small text</span>
```

### Component Patterns
```tsx
// Semantic status badges
<Badge variant="success">Active</Badge>
<Badge variant="warning">Waitlist</Badge>
<Badge variant="destructive">Cancelled</Badge>

// Mobile-responsive KPI cards
<Card>
  <CardHeader className="pb-rn-2">
    <CardTitle className="rn-meta">Label</CardTitle>
  </CardHeader>
  <CardContent className="rn-h1">123</CardContent>
</Card>
```

## Current Implementation Statistics
- **Components Updated**: 13 of 13 core components (100%)
- **Pages Updated**: 27+ pages (100% of critical paths)
- **Mobile-First**: All pages responsive with proper breakpoints
- **Semantic Colors**: Success/warning/danger applied throughout
- **Typography**: Consistent RegiNor scale across all text
- **Spacing**: 8px grid system (rn-s-*) used everywhere

## Design Token Coverage
- ✅ All colors using RegiNor palette
- ✅ All spacing using 8px system (rn-s-1 through rn-s-8)
- ✅ All typography using semantic scale (rn-h1, rn-h2, rn-meta, rn-caption)
- ✅ All borders using rn-border color
- ✅ All shadows using rn-shadow-* tokens
- ✅ All radius using rn-r-* tokens (8px, 12px, 16px)
- ✅ Component heights standardized (40px inputs/buttons, 44px table rows)

---

## Migration Strategy

### Phase 1: Foundation (Complete ✅)
- [x] Create tokens.css with all design variables
- [x] Integrate with globals.css and Tailwind
- [x] Document usage patterns

### Phase 2: Component Updates (In Progress)
- [ ] Update Button variants to match RegiNor spec
- [ ] Standardize Input heights to 40px
- [ ] Update Card radius to 12px (--rn-r-2)
- [ ] Ensure Table rows are 44px height
- [ ] Audit and update all status badges to use semantic colors

### Phase 3: Layout & Spacing
- [ ] Audit all spacing to use 8px system
- [ ] Update max-width to 1280px for content areas
- [ ] Ensure touch targets are minimum 44px (check-in flows)

### Phase 4: Typography
- [ ] Load Inter font (if not already)
- [ ] Update base font-size to 15px
- [ ] Apply tabular-nums to all numeric content
- [ ] Standardize heading sizes

## Performance Notes

- Tokens are pure CSS variables (no JS overhead)
- Tailwind v4 CSS-first approach (no config file needed)
- All tokens compile to static CSS
- No runtime color calculations
- Minimal shadow usage for performance

## Examples

### Status Badge Component
```tsx
function StatusBadge({ status }: { status: string }) {
  const variants = {
    ACTIVE: 'bg-rn-success text-white',
    WAITLIST: 'bg-rn-warning text-white',
    CANCELLED: 'bg-rn-danger text-white',
    DRAFT: 'bg-gray-200 text-gray-700',
  }
  
  return (
    <span className={`px-2 py-1 rounded-rn-1 text-xs font-medium ${variants[status]}`}>
      {status}
    </span>
  )
}
```

### Card with RegiNor Styling
```tsx
<div className="bg-rn-surface border border-rn-border rounded-rn-2 p-rn-5 shadow-rn-1">
  <h3 className="rn-h3 text-rn-text mb-rn-3">Card Title</h3>
  <p className="rn-body text-rn-text-muted">Card content</p>
</div>
```

### Button with Primary Variant
```tsx
<button className="
  h-[40px] px-rn-5 
  bg-rn-primary hover:bg-rn-primary-strong 
  text-white font-medium 
  rounded-rn-1 
  transition-colors
  disabled:opacity-55 disabled:cursor-not-allowed
">
  Primary Action
</button>
```

## Support

For questions or updates, refer to:
- `docs/UI Guidelines/RegiNor_UI_Guidelines.md` - Complete guidelines
- `apps/web/src/styles/tokens.css` - Token definitions
- This README for implementation details
