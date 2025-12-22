# RegiNor UI Guidelines

**Product:** RegiNor.event  
**Positioning:** “from signup to showtime”  
**UI goals:** *Minimal, calm, fast, predictable.*  
**Performance goals:** *Lightweight, fast loading, low JS by default.*

---

## 1) Principles

1. **Clarity beats decoration**  
   If it doesn’t improve understanding or speed, remove it.
2. **Calm under pressure**  
   UI must work in real-world conditions (door check-in, noisy venues).
3. **One primary action per screen**  
   Especially for checkout and check-in.
4. **Text first**  
   Icons support text; they don’t replace it.
5. **Semantic color only**  
   Color indicates state (success/warn/error/active) — not “style.”
6. **Performance is a feature**  
   Prefer SSR/Server Actions, avoid heavy client bundles, load what you need.

---

## 2) Design Tokens

> Use these tokens as the single source of truth. Recommended implementation: CSS variables + Tailwind config mapping.

### 2.1 Colors

**Neutrals**
- `--rn-bg`: `#F8FAFC` (app background)
- `--rn-surface`: `#FFFFFF` (cards, panels)
- `--rn-surface-2`: `#F1F5F9` (subtle sections)
- `--rn-border`: `#E2E8F0`
- `--rn-text`: `#0F172A`
- `--rn-text-muted`: `#64748B`
- `--rn-text-subtle`: `#94A3B8`

**Brand**
- `--rn-primary`: `#16A6B6` (teal accent, primary CTA)
- `--rn-primary-strong`: `#0E7C88` (hover/active)
- `--rn-focus`: `#16A6B6` (focus ring)

**Semantic**
- `--rn-success`: `#16A34A`
- `--rn-warning`: `#F59E0B`
- `--rn-danger`: `#DC2626`
- `--rn-info`: `#2563EB`

**Overlay**
- `--rn-overlay`: `rgba(15, 23, 42, 0.55)`

**Rule:** No additional colors without adding a token and documenting usage.

---

### 2.2 Typography

- Font: **Inter** (fallback: system-ui, -apple-system, Segoe UI, Roboto)
- Base size: `15px`
- Line-height: `1.45`
- Numeric style: `font-variant-numeric: tabular-nums;`

**Type scale**
- `--rn-h1`: 28px / 600
- `--rn-h2`: 22px / 600
- `--rn-h3`: 18px / 600
- `--rn-body`: 15px / 450
- `--rn-meta`: 13px / 500
- `--rn-caption`: 12px / 500

---

### 2.3 Spacing (8px system)

Use 4px increments, anchored on 8px:
- `--rn-s-1`: 4px
- `--rn-s-2`: 8px
- `--rn-s-3`: 12px
- `--rn-s-4`: 16px
- `--rn-s-5`: 24px
- `--rn-s-6`: 32px
- `--rn-s-7`: 40px
- `--rn-s-8`: 48px

**Rule:** Avoid custom spacing. Pick the nearest token.

---

### 2.4 Radius

- `--rn-r-1`: 8px (inputs, buttons)
- `--rn-r-2`: 12px (cards)
- `--rn-r-3`: 16px (modals, check-in result panels)

---

### 2.5 Shadows (minimal)

- `--rn-shadow-1`: `0 1px 2px rgba(15, 23, 42, 0.06)`
- `--rn-shadow-2`: `0 6px 18px rgba(15, 23, 42, 0.10)`

**Rule:** Use borders first. Shadows only for elevation / focus.

---

### 2.6 Borders

- Default border: `1px solid var(--rn-border)`
- Divider: `1px solid var(--rn-border)`
- Focus ring: `0 0 0 3px color-mix(in srgb, var(--rn-focus) 25%, transparent)`

---

## 3) Layout & Information Architecture

### 3.1 App shell

**Admin**
- Left sidebar (primary navigation)
- Header row (page title + primary action)
- Content area (tables, cards, forms)
- Max content width: **1280px**

**Check-in**
- Full-height mobile-first layout
- One main action: Scan → Validate → Check-in
- Large touch targets (min 44px)

**Participant (Checkout)**
- Two-column on desktop:
  - Left: form
  - Right: summary + pricing explanation
- One-column on mobile

---

## 4) Components (rules + specs)

### 4.1 Buttons
- Sizes:
  - `sm` height 36px
  - `md` height 40px (default)
  - `lg` height 44px (check-in)
- Variants:
  - **Primary**: solid teal (`--rn-primary`)
  - **Secondary**: white + border
  - **Tertiary**: text-only
  - **Danger**: solid red
- Disabled: reduce opacity to 0.55, keep cursor not-allowed.

### 4.2 Inputs
- Height: 40px
- Border: 1px
- Focus: ring + border in primary
- Error state: border in danger + helper text

### 4.3 Tables (critical for Admin)
- Sticky header (if scroll)
- Row height 44px
- Subtle zebra optional: `--rn-surface-2` at 30% opacity
- Actions inline (avoid hidden kebab menus when possible)
- Status pills: small, compact, consistent

### 4.4 Status Pills
- Use semantic colors only.
- Example:
  - ACTIVE → success
  - WAITLIST → warning
  - UNPAID → danger
  - DRAFT/PENDING → muted

### 4.5 Alerts / Notices
- Use for: payment failures, membership expired, waitlist offer windows.
- Always include a clear next action.

---

## 5) Core Views (wireframe sketches)

### 5.1 Admin Dashboard (Operations overview)

**Primary goals**
- See current Course Periods
- Track signups / capacity / revenue
- Jump to rosters and exports fast

**Wireframe**
```text
┌───────────────────────────────────────────────────────────────┐
│ Sidebar         │ Admin / Dashboard            [New Period]    │
│ ─────────────── │─────────────────────────────────────────────│
│ • Dashboard     │ KPIs:  Periods | Registrations | Revenue     │
│ • Periods       │ ┌───────┐ ┌────────────┐ ┌──────────────┐   │
│ • Tracks        │ │  3    │ │   186      │ │   214 000    │   │
│ • Registrations │ │active │ │ signups    │ │ NOK revenue  │   │
│ • Memberships   │ └───────┘ └────────────┘ └──────────────┘   │
│ • Exports       │                                               │
│ • Check-in      │ Current Periods                               │
│                │ ┌───────────────────────────────────────────┐ │
│                │ │ TB-2026-P1  | 6 tracks | 78% full   [Open]│ │
│                │ │ OS-2026-P1  | 5 tracks | 54% full   [Open]│ │
│                │ └───────────────────────────────────────────┘ │
│                │ Recent activity                                 │
│                │ • Payment succeeded – Order #123                 │
│                │ • Waitlist offer sent – Track Rueda L2           │
└───────────────────────────────────────────────────────────────┘
```

---

### 5.2 Checkout (Participant)

**Primary goals**
- Fast completion
- Transparent pricing explanation
- Membership captured/validated cleanly

**Wireframe**
```text
┌───────────────────────────────────────────────────────────────┐
│ RegiNor.event – Checkout                                       │
│ From signup to showtime                                        │
├───────────────────────────────────────────────────────────────┤
│ [Left: Details]                         [Right: Summary]       │
│ ┌───────────────────────┐              ┌─────────────────────┐ │
│ │ Name / Email / Phone  │              │ Your selection      │ │
│ │ Membership (toggle)   │              │ • Rueda L2 Tue      │ │
│ │ Promo code (optional) │              │ • Son Intro Thu     │ │
│ │ Consent checkbox      │              │                     │ │
│ │ [Pay securely]        │              │ Pricing             │ │
│ └───────────────────────┘              │ Subtotal:  2000 NOK │ │
│                                        │ Discounts:  -300 NOK│ │
│                                        │ Total:     1700 NOK │ │
│                                        │ Why this price?     │ │
│                                        │ • Member -15%       │ │
│                                        │ • Multi-course      │ │
│                                        └─────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

---

### 5.3 Check-in Scan Result (Control App)

**Primary goals**
- Instant feedback
- Large, obvious status
- One action: “Mark checked in”

**Wireframe**
```text
┌───────────────────────────────────────────┐
│ Check-in • TB-2026-P1                      │
├───────────────────────────────────────────┤
│  ✅ ALLOWED                                │
│  Ingrid N.                                 │
│  Ticket: Active • Paid • Member verified   │
│  Courses: Rueda L2 (Tue), Son Intro (Thu)  │
│                                           │
│  [Mark check-in]                           │
│  Secondary: [Scan next]                    │
└───────────────────────────────────────────┘
```

---

## 6) Event Registration Flow (end-to-end)

### Participant flow
1. Select tracks (role + single/pair)
2. Review cart
3. Pricing quote (always show explanation + membership effect)
4. Checkout & pay
5. Success + ticket link
6. Ticket (QR) ready, offline-friendly
7. Scan & check-in logged

### Admin flow
1. Create Course Period (dates, sales window, discount rules)
2. Add Tracks (schedule, capacity, pricing, waitlist)
3. Monitor signups and waitlists
4. Export rosters
5. Check-in onsite

### Membership flow (service product)
- Memberships can be imported or sold.
- Membership status affects pricing and access.
- Membership card/ID should be visible in participant profile and at check-in.

---

## 7) Performance Guidelines (lightweight, fast loading)

- SSR-first, server actions for mutations
- Lazy-load QR scanner module only on check-in routes
- Avoid heavy chart libraries; prefer KPIs + simple lists
- SVG icons only; no decorative imagery in ops views
- Keep JavaScript minimal in public/checkout pages

---

## 8) Copy & Tone

Short. Neutral. Operational.  
No jokes in critical flows.

---

## 9) Repo Placement

- `docs/RegiNor_UI_Guidelines.md` (this file)
- `styles/tokens.css` (tokens as CSS vars)
- `tailwind.config.ts` (map tokens to Tailwind theme)
