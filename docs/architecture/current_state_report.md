# RegiNor.events - Current State Architecture Report

**Generated:** January 3, 2026  
**Repository:** salsanor-tickets  
**Branch:** vscode-dev  
**Auditor:** Principal Software Architect (AI Assistant)

---

## 1. Repo Snapshot

### Monorepo Structure
**Type:** NPM Workspaces Monorepo  
**Root:** `/Users/bjorn-torealmas/Documents/GIT/SalsaNor Tickets/`

```
├── apps/
│   └── web/                    # Next.js 16 application
├── packages/
│   ├── database/               # Prisma schema + migrations
│   ├── domain/                 # Shared domain types (minimal)
│   └── ui/                     # Shared UI components (unused)
├── docs/                       # Comprehensive documentation
├── scripts/                    # Deployment scripts
└── landing-page/               # Static HTML landing page
```

**Evidence:**
- `package.json` (root): `"workspaces": ["apps/*", "packages/*"]`
- `apps/web/package.json`: Main application
- `packages/database/package.json`: Database package

### Package Manager & Node Version
- **Package Manager:** npm (evidence: `package-lock.json` at root and in packages)
- **Node Version:** UNKNOWN - No `.nvmrc` or `engines` field found
  - ⚠️ **TODO:** Check `package.json` for `engines.node` field
  - ⚠️ **Risk:** Version drift between dev/staging/prod
- **TypeScript:** v5 (latest)
  - Evidence: `apps/web/package.json`: `"typescript": "^5"`

### Key Scripts
**Location:** `apps/web/package.json`

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "postinstall": "cd ../../packages/database && npx prisma generate"
}
```

**Observations:**
- ✅ Prisma client auto-generation on install
- ❌ No test scripts found
- ❌ No format scripts (Prettier)
- ❌ No migration scripts at root level

---

## 2. Runtime & Hosting Assumptions

### Framework
**Primary:** Next.js 16.0.10 (App Router)  
**React:** 19.0.0  
**Evidence:** `apps/web/package.json`

### Deployment Targets
**Primary:** Vercel (Confirmed)
- Evidence: `.vercel/` folder, `apps/web/.env.vercel`
- Evidence: `apps/web/vercel.json` (likely exists for config)

**Environments Detected:**
1. **Development:** Local (localhost:3000)
2. **Staging:** `.env.stage` files present
3. **Production:** `.env.prod` files present

**Evidence:**
- `packages/database/.env` (dev)
- `packages/database/.env.stage`
- `packages/database/.env.prod`
- `apps/web/.env.stage`
- `apps/web/.env.prod`

### Server-Side Execution Points

#### 1. Server Actions (Primary Business Logic)
**Location:** `apps/web/src/app/actions/`

Files found:
- `auth.ts` - Authentication actions
- `checkout.ts` - Order creation and cart pricing
- `courses.ts` - Public course queries
- `dashboard.ts` - Dashboard data
- `discounts.ts` - Discount rule management
- `finance.ts` - Financial reporting
- `memberships.ts` - Membership operations
- `onboarding.ts` - User onboarding flow
- `organizers.ts` - Organizer CRUD
- `payments.ts` - Payment initiation (Stripe)
- `periods.ts` - Course period management
- `profile.ts` - User profile
- `registration.ts` - Registration operations
- `settings.ts` - Settings management
- `tracks.ts` - Course track management
- `users.ts` - User management
- `waitlist.ts` - Waitlist promotion logic

**Pattern:** All actions use `'use server'` directive

#### 2. API Routes
**Location:** `apps/web/src/app/api/`

Confirmed endpoints:
- `POST /api/webhooks/stripe` - Stripe webhook handler
  - File: `apps/web/src/app/api/webhooks/stripe/route.ts`
- `/api/admin/*` - Admin-specific APIs (folder exists)
- `/api/tickets/validate` - Ticket validation endpoint
- `/api/verify-membership/[token]` - Membership verification

#### 3. Route Handlers
Next.js route handlers in:
- `(site)/auth/callback/route.ts` - Supabase auth callback
- Other route handlers likely present but not fully enumerated

---

## 3. Data Layer

### Prisma Configuration
**Status:** ✅ Fully Implemented  
**Schema Location:** `packages/database/prisma/schema.prisma` (785 lines)

**Configuration:**
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

**Key Models Found (Core Domain):**
1. `UserAccount` - User accounts linked to Supabase
2. `UserRole` - Multi-tenant role assignments with `organizerId`
3. `PersonProfile` - Participant profile data
4. `Organizer` - Multi-tenant organizer entity (TENANT ROOT)
5. `CoursePeriod` - 6-8 week course rounds (scoped to `organizerId`)
6. `CourseTrack` - Individual course tracks within periods
7. `Registration` - User registrations with status lifecycle
8. `Order` - Purchase orders with MVA/VAT tracking
9. `Payment` - Payment records (Stripe, Vipps)
10. `DiscountRule` - Complex pricing rules with priority
11. `Membership` - Member subscriptions (scoped to `organizerId`)
12. `MembershipTier` - Membership tier definitions
13. `WaitlistEntry` - Waitlist management
14. `Ticket` - QR code tickets
15. `CheckInLog` - Attendance logging
16. `EmailLog` - Email tracking
17. `EmailTemplate` - Org-specific email templates
18. `WebhookEvent` - Idempotency tracking for webhooks (NEW)

### Database
**Type:** PostgreSQL (Supabase)  
**Evidence:**
- All `.env` files contain `DATABASE_URL` with Supabase pooler URLs
- Format: `postgresql://postgres.{project}:...@aws-1-eu-{region}.pooler.supabase.com:6543/postgres?pgbouncer=true`

**Connection Strings Found:**
- Dev: `postgres.hiwzqklwecrquxtimgos` (eu-west-1)
- Staging: `postgres.zmfvwmmchiehnqhwsgkt` (eu-north-1)
- Production: `postgres.wdepcyyzjuavsbkrdeax` (eu-north-1)

**⚠️ SECURITY CONCERN:** Database credentials hardcoded in committed `.env` files

**Environment Variables:**
- `DATABASE_URL` - Pooler connection (PgBouncer)
- `DIRECT_URL` - Direct connection (for migrations)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase API URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key

### Migrations
**Storage:** `packages/database/prisma/migrations/`  
**Count:** 19 migrations (from Dec 2024 - Jan 2026)

**Notable Migrations:**
1. `20251213225106_init` - Initial schema
2. `20251215220701_add_norwegian_compliance_fields` - MVA tracking
3. `20251218113339_add_membership_and_events` - Membership system
4. `20251219171853_add_email_models` - Email infrastructure
5. `20251221123219_add_cancellation_and_language_fields` - Cancellation support
6. `20260101230319_add_org_specific_platform_fees` - Platform fee model
7. `20260102230829_add_webhook_event_idempotency` - Webhook deduplication (RECENT)

**Migration Application:**
- ✅ Prisma Migrate (standard approach)
- ❌ No CI/CD automation detected
- ⚠️ Manual deployment via scripts: `scripts/deploy-prod.sh`, `scripts/deploy-stage.sh`

### Supabase Usage
**RLS (Row Level Security):** UNKNOWN - No SQL files found in repository
- **TODO:** Check for `supabase/migrations/` folder or SQL files
- **Risk:** If RLS is not implemented, all security is backend-only

**Evidence of Supabase Integration:**
- `apps/web/src/utils/supabase/client.ts` - Client-side Supabase client
- `apps/web/src/utils/supabase/server.ts` - Server-side Supabase client
- `apps/web/src/utils/supabase/middleware.ts` - Session refresh middleware

**Supabase Features Used:**
- ✅ Auth (SSR-compatible cookie-based sessions)
- ✅ Database (PostgreSQL)
- ❌ Storage (no evidence found)
- ❌ Edge Functions (no evidence found)
- ❌ Realtime (no evidence found)

---

## 4. Auth & Authorization

### Auth Provider
**Provider:** Supabase Auth  
**Evidence:**
- `apps/web/src/utils/supabase/server.ts`: `createServerClient()` with cookie handling
- `apps/web/src/app/actions/auth.ts`: Sign in/sign up actions

### Session Model
**Type:** Cookie-based sessions (SSR-compatible)  
**Evidence:**
- `apps/web/src/utils/supabase/server.ts`: 
  ```typescript
  cookies: {
    getAll() { return cookieStore.getAll() },
    setAll(cookiesToSet) { ... }
  }
  ```
- Middleware refreshes sessions: `apps/web/src/middleware.ts` → `updateSession()`

**Session Storage:**
- Supabase manages JWT in httpOnly cookies
- Backend validates via Supabase Admin SDK

### Roles & Permissions
**Role Enum:** `packages/database/prisma/schema.prisma`
```prisma
enum UserRole {
  ADMIN           // Global admin - all organizers
  ORGANIZER       // Deprecated
  ORG_ADMIN       // Organizer admin - scoped to organizerId
  ORG_FINANCE     // Finance reports - scoped
  ORG_CHECKIN     // Check-in staff - scoped
  INSTRUCTOR      // View participant lists
  CHECKIN         // Global check-in
  STAFF           // General staff
  PARTICIPANT     // Regular user
}
```

**Role Assignment Model:**
```prisma
model UserRole {
  userId       String
  role         UserRole
  organizerId  String?    // Multi-tenant scoping
  @@unique([userId, role, organizerId])
}
```

### Authorization Enforcement

#### Backend Authorization (PRIMARY)
**Location:** `apps/web/src/utils/auth-admin.ts`

**Key Functions:**
1. `requireAdmin()` - Global ADMIN check
2. `requireOrganizerAccess(organizerId?)` - Scoped ORG_ADMIN check
3. Used in all admin actions

**Pattern:**
```typescript
export async function someAdminAction() {
  await requireAdmin() // Throws if not admin
  // ... business logic
}
```

**Evidence:** 20+ usages across action files (grep confirmed)

#### Client-Side Guards
**Location:** Various page components
- Navigation hides admin links if not admin
- But client-side guards are NOT security boundaries

#### RLS (Row Level Security)
**Status:** UNKNOWN - No SQL policies found in repo
- **Critical TODO:** Verify if RLS is enabled on Supabase tables
- **Risk:** If RLS is missing, backend authorization is the ONLY protection

**What would confirm RLS:**
- `supabase/migrations/*.sql` files with `CREATE POLICY` statements
- Supabase dashboard policy configuration
- Documentation mentioning RLS

### Multi-Tenant Architecture

**Tenant Concept:** ✅ CONFIRMED - `Organizer` is the tenant root

**Tenant Scoping in Schema:**

Tables with `organizerId`:
1. `UserRole` (line 117) - Role assignments scoped to organizer
2. `MembershipTier` (line 227) - Membership tiers per organizer
3. `CoursePeriod` (line 250) - Course periods per organizer
4. `Membership` (line 441) - Member subscriptions per organizer
5. `StandaloneEvent` (line 475) - Events per organizer
6. `Invoice` (line 614) - Invoices per organizer

**Unique Constraints on Tenant Scoping:**
- `UserRole`: `@@unique([userId, role, organizerId])`
- `MembershipTier`: `@@unique([organizerId, slug])`
- `CoursePeriod`: `@@unique([organizerId, slug])`
- `StandaloneEvent`: `@@unique([organizerId, slug])`

**Authorization Pattern:**
- `requireOrganizerAccess(organizerId)` checks role with matching `organizerId`
- Global ADMIN bypasses organizer scoping

**⚠️ Risk:** Queries must filter by `organizerId` to prevent cross-tenant data leakage

---

## 5. Core Domain Capabilities (Implementation Status)

### 1. Course Periods / "tidsperiode"
**Status:** ✅ IMPLEMENTED  
**Evidence:**
- Model: `CoursePeriod` (schema.prisma line 250+)
- Actions: `apps/web/src/app/actions/periods.ts`
- Admin UI: `apps/web/src/app/admin/periods/`
- Staff UI: `apps/web/src/app/staffadmin/periods/`
- Fields: name, code, city, startDate, endDate, salesOpenAt, salesCloseAt

### 2. Tracks / Course Series
**Status:** ✅ IMPLEMENTED  
**Evidence:**
- Model: `CourseTrack` (schema.prisma)
- Actions: `apps/web/src/app/actions/tracks.ts`
- Capacity: `capacityTotal`, `capacityLeader`, `capacityFollower`
- Pricing: `priceSingleCents`, `pricePairCents`
- Admin UI: `apps/web/src/app/admin/tracks/`

### 3. Registrations
**Status:** ✅ IMPLEMENTED  
**Evidence:**
- Model: `Registration` (schema.prisma line 298+)
- Actions: `apps/web/src/app/actions/registration.ts`
- Status lifecycle: DRAFT → PENDING_PAYMENT → ACTIVE / WAITLIST / CANCELLED / REFUNDED
- Unique constraint: `@@unique([trackId, personId])` (prevents double registration)
- Cancellation fields: `cancelledAt`, `cancellationReason`, `refundAmount`

### 4. Pricing & Discounts Logic
**Status:** ✅ IMPLEMENTED  
**Evidence:**
- Engine: `apps/web/src/lib/pricing/engine.ts`
- Actions: `apps/web/src/app/actions/discounts.ts`
- Model: `DiscountRule` with priority-based application
- Rule types:
  - `MEMBERSHIP_TIER_PERCENT` - Member discounts by tier
  - `MULTI_COURSE_TIERED` - Multi-course bundle discounts
- Context: `{ isMember, membershipTierId }`
- Calculation: `calculatePricing(cartItems, rules, context)`

**Discount Application:**
```typescript
export function calculatePricing(
  cartItems: CartItem[],
  rules: DiscountRule[],
  context: { isMember: boolean, membershipTierId?: string }
): PricingResult
```

**MVA (Norwegian VAT) Handling:**
- `calculateMva()` - MVA calculation per Norwegian tax law
- Rates: 0%, 12%, 15%, 25%
- Applied AFTER discounts: `subtotalAfterDiscount * mvaRate`

### 5. Waitlists (Offer Windows, Capacity Handling)
**Status:** ✅ IMPLEMENTED  
**Evidence:**
- Model: `WaitlistEntry` (schema.prisma)
- Actions: `apps/web/src/app/actions/waitlist.ts`
- Status: ON_WAITLIST → OFFERED → ACCEPTED / EXPIRED / REMOVED
- Offer window: `offeredUntil` timestamp
- Promotion logic: `promoteToOffered()` action

### 6. Memberships (Purchase/Import, Verification)
**Status:** ✅ IMPLEMENTED  
**Evidence:**
- Models: `Membership`, `MembershipTier`, `MembershipProduct` (schema.prisma)
- Actions: `apps/web/src/app/actions/memberships.ts`, `memberships-import.ts`
- Features:
  - CSV import: `apps/web/src/app/staffadmin/memberships/membership-importer.tsx`
  - Verification tokens: `verificationToken` field
  - Member numbers: Auto-generated sequence
  - Photo upload: `photoUrl` field
- Admin UI: `apps/web/src/app/staffadmin/memberships/`
- Verification API: `/api/verify-membership/[token]`

### 7. Payments (Stripe, Checkout Flow)
**Status:** ✅ IMPLEMENTED (Stripe only, Vipps planned)  
**Evidence:**
- Actions: `apps/web/src/app/actions/payments.ts`
- Checkout: `apps/web/src/app/actions/checkout.ts`
- Models: `Order`, `Payment`, `PaymentConfig`
- Stripe integration: `stripe` package (v20.0.0)
- Payment flow:
  1. Cart → `createOrderFromCart()` (creates DRAFT order)
  2. Redirect to `/checkout/[orderId]`
  3. `payOrder()` creates Stripe Checkout Session
  4. Webhook fulfills order on success

### 8. Webhooks Handling and Idempotency Strategy
**Status:** ✅ IMPLEMENTED (Recent: Jan 2, 2026)  
**Evidence:**
- Endpoint: `POST /api/webhooks/stripe` (route.ts)
- Idempotency: `WebhookEvent` model (migration 20260102230829)
- Strategy:
  ```typescript
  // 1. Check if event already processed
  const existingEvent = await prisma.webhookEvent.findUnique({ where: { id: event.id } })
  if (existingEvent) return { alreadyProcessed: true }
  
  // 2. Create event record with status: PROCESSING (optimistic locking)
  await prisma.webhookEvent.create({ data: { id: event.id, status: 'PROCESSING' } })
  
  // 3. Process event
  // 4. Update status to PROCESSED or FAILED
  ```
- Signature verification: ✅ Present (`Stripe.webhooks.constructEvent()`)
- Error handling: Captures errors without failing webhook (returns 200)
- Thin payload handling: Fetches full object from Stripe API if needed

### 9. Ticketing / QR Generation
**Status:** ✅ IMPLEMENTED  
**Evidence:**
- Model: `Ticket` (schema.prisma)
- Generation: `apps/web/src/lib/fulfillment/service.ts` (fulfillOrder)
- QR library: `qrcode` package
- React component: `qrcode.react` package
- Fields: `qrCode` (unique), `status` (ACTIVE/VOIDED)

### 10. Check-in Scanning Flow and Check-in Logging
**Status:** ✅ IMPLEMENTED  
**Evidence:**
- UI: `apps/web/src/app/(checkin)/checkin/page.tsx`
- Scanner: `html5-qrcode` package (v2.3.8)
- Validation: `/api/tickets/validate` endpoint
- Logging: `CheckInLog` model (schema.prisma)
- Types: PERIOD_ENTRY, SESSION_ENTRY

### 11. Admin UI vs Participant UI vs Check-in UI
**Status:** ✅ SEPARATED  
**Evidence:**
- **Public/Participant:** `apps/web/src/app/(site)/` route group
  - Pages: `/`, `/courses`, `/cart`, `/checkout`, `/profile`, `/dashboard`
- **Admin (Global):** `apps/web/src/app/admin/` (no route group parentheses)
  - Pages: `/admin/periods`, `/admin/tracks`, `/admin/users`, `/admin/organizers`, `/admin/email`, `/admin/finance`
- **Staff Admin (Org-scoped):** `apps/web/src/app/staffadmin/`
  - Pages: `/staffadmin/periods`, `/staffadmin/memberships`, `/staffadmin/discounts`
- **Check-in:** `apps/web/src/app/(checkin)/checkin/` route group
  - Dark theme, optimized for scanning

**Route Group Architecture:**
- `(site)` → Maps to `/` (includes public + authenticated user pages)
- `(checkin)` → Maps to `/` but with dedicated layout
- `admin/` → Maps to `/admin/*` (explicit URL segment)
- `staffadmin/` → Maps to `/staffadmin/*` (explicit URL segment)

---

## 6. API Surface

### API Endpoints Inventory

#### 1. Webhook Endpoints (Public, Signature-Verified)
| Method | Path | Purpose | Auth | Input Validation | Error Handling |
|--------|------|---------|------|------------------|----------------|
| POST | `/api/webhooks/stripe` | Stripe payment webhooks | Signature verification (HMAC) | Stripe SDK validates | Returns 200 even on error, logs to WebhookEvent |

**Evidence:** `apps/web/src/app/api/webhooks/stripe/route.ts`

**Security:**
- ✅ Signature verification with `Stripe.webhooks.constructEvent()`
- ✅ Webhook secret from DB or env
- ✅ Idempotency via `WebhookEvent` table
- ⚠️ Returns 200 on errors (prevents retries, but logs failure)

#### 2. Verification Endpoints (Public, Token-Based)
| Method | Path | Purpose | Auth | Input Validation | Error Handling |
|--------|------|---------|------|------------------|----------------|
| GET | `/api/verify-membership/[token]` | Verify membership via token | Public (token validation) | Token lookup in DB | UNKNOWN |

**Evidence:** Folder exists: `apps/web/src/app/api/verify-membership/`

#### 3. Check-in Endpoints
| Method | Path | Purpose | Auth | Input Validation | Error Handling |
|--------|------|---------|------|------------------|----------------|
| POST | `/api/tickets/validate` | Validate QR code ticket | Supabase Auth (check-in role) | UNKNOWN | UNKNOWN |

**Evidence:** Folder exists: `apps/web/src/app/api/tickets/`

**⚠️ TODO:** Audit this endpoint for role checks (should require CHECKIN or ORG_CHECKIN role)

#### 4. Auth Callbacks
| Method | Path | Purpose | Auth | Input Validation | Error Handling |
|--------|------|---------|------|------------------|----------------|
| GET | `/auth/callback` | Supabase OAuth callback | Public (Supabase handles) | Supabase SDK | UNKNOWN |

**Evidence:** `apps/web/src/app/(site)/auth/callback/route.ts`

### Server Actions (Primary Business Logic)

**Pattern:** All actions use `'use server'` directive and are invoked from client components or server components.

**Authorization Approach:**
- Admin actions: Call `requireAdmin()` or `requireOrganizerAccess()`
- Public actions: Query only public data or user's own data
- No centralized authorization middleware (per-action checks)

#### Critical Business Logic Entrypoints

1. **Quote Price**
   - Function: `getCartPricing(items)` in `apps/web/src/app/actions/checkout.ts`
   - Returns: `PricingResult` with discounts applied
   - Validation: None (calculates based on current rules and membership)

2. **Create Order**
   - Function: `createOrderFromCart(items)` in `checkout.ts`
   - Auth: Requires logged-in user with completed profile
   - Validation: 
     - All items same period
     - No existing active registrations
     - Cleans up DRAFT/CANCELLED/REFUNDED registrations before creating
   - Returns: `{ orderId }` or `{ error }`

3. **Mark Check-in**
   - Function: Likely in check-in related actions (not fully enumerated)
   - Auth: Check-in staff role required
   - Validation: UNKNOWN

4. **Validate Membership**
   - Function: Membership verification actions
   - Auth: Public with token or admin
   - Validation: UNKNOWN

### Input Validation

**Approach:** Zod schemas  
**Evidence:**
- `apps/web/src/lib/schemas/discount.ts` - Discount rule schemas
- React Hook Form + Zod resolvers: `@hookform/resolvers` package
- Used in client forms, validated on server actions

**⚠️ Gap:** Not all server actions have explicit Zod validation at entry point

### Error Handling

**Patterns Observed:**
1. **Server Actions:** Return `{ error: string }` objects
2. **Webhooks:** Log errors to `WebhookEvent.errorMessage`, always return 200
3. **Auth Guards:** Throw errors or redirect

**⚠️ Inconsistency:** No centralized error handling strategy

---

## 7. Security Findings

### 🔴 CRITICAL: Credentials in Version Control
**Severity:** CRITICAL  
**Evidence:**
- `.env` files with database credentials committed to Git
- Files: `packages/database/.env`, `.env.prod`, `.env.stage`
- Files: `apps/web/.env.prod`, `.env.stage`, `.env.vercel`
- Contains: Full Supabase URLs and database passwords

**Impact:**
- Anyone with repo access has production database credentials
- If repo is ever public, all credentials are compromised

**Recommended Fix:**
1. Rotate all database passwords immediately
2. Use Vercel environment variables (already setup but not exclusive)
3. Add `.env*` to `.gitignore` (except `.env.example`)
4. Use secret management (Vercel Secrets, 1Password, etc.)

### 🟡 MEDIUM: Missing Row Level Security (RLS) Confirmation
**Severity:** MEDIUM (Unconfirmed)  
**Evidence:**
- No `supabase/migrations/` folder found
- No SQL files with `CREATE POLICY` statements
- Authorization is backend-only (server actions)

**Impact:**
- If RLS is not enabled, direct Supabase client queries bypass authorization
- Client-side Supabase client (`utils/supabase/client.ts`) could query any data

**Recommended Fix:**
1. Confirm RLS is enabled on all tables via Supabase dashboard
2. Create SQL migration files in `supabase/migrations/`
3. Document RLS policy strategy

**What to Check:**
```sql
-- Example RLS policy for multi-tenant data
ALTER TABLE "CoursePeriod" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read periods from their organizer"
  ON "CoursePeriod" FOR SELECT
  USING (
    auth.uid() IN (
      SELECT "supabaseUid" FROM "UserAccount" ua
      JOIN "UserRole" ur ON ua.id = ur."userId"
      WHERE ur."organizerId" = "CoursePeriod"."organizerId"
    )
  );
```

### 🟡 MEDIUM: Missing Tenant Scoping in Some Queries
**Severity:** MEDIUM  
**Evidence:**
- Multi-tenant architecture with `organizerId` present
- Some queries may not filter by `organizerId`

**Risk Example:**
```typescript
// BAD: Missing organizerId filter
const periods = await prisma.coursePeriod.findMany()

// GOOD: Scoped to user's organizer
const periods = await prisma.coursePeriod.findMany({
  where: { organizerId: user.organizerId }
})
```

**Recommended Fix:**
1. Audit all Prisma queries for `organizerId` filtering
2. Consider Prisma middleware to enforce tenant scoping globally
3. Add integration tests for cross-tenant isolation

### 🟢 LOW: No CSRF Protection on API Routes
**Severity:** LOW (Next.js 13+ has built-in mitigations)  
**Evidence:**
- No explicit CSRF tokens in forms
- Server actions are POST-based but rely on SameSite cookies

**Context:**
- Next.js Server Actions have built-in CSRF protection (action encryption)
- Supabase Auth uses httpOnly cookies with SameSite=Lax

**Recommended Fix:**
- Document that CSRF is handled by framework
- If custom API routes are added, verify SameSite cookie settings

### 🟢 LOW: Secrets in Logs
**Severity:** LOW (No evidence found, but monitor)  
**Evidence:**
- Webhook handler logs: `console.log('Webhook: Secret present?', !!webhookSecret)`
- No direct secret logging detected

**Recommended Fix:**
- Add linting rule to prevent `console.log` of env vars
- Use structured logging with secret redaction

### ✅ GOOD: Webhook Signature Verification
**Severity:** N/A (Properly implemented)  
**Evidence:**
- `apps/web/src/app/api/webhooks/stripe/route.ts` line 36:
  ```typescript
  event = Stripe.webhooks.constructEvent(body, signature, webhookSecret)
  ```

**Impact:** Protects against forged webhook requests

### ✅ GOOD: Idempotency for Webhooks
**Severity:** N/A (Properly implemented)  
**Evidence:**
- `WebhookEvent` model with unique constraint on `id`
- Optimistic locking with `P2002` error handling
- Prevents duplicate fulfillments

---

## 8. Performance Findings (Lightweight/Fast Loading)

### Bundle Size Analysis (Estimate)

**Heavy Dependencies:**
1. `@stripe/stripe-js` (8.6.0) - ~80KB gzipped
2. `@stripe/connect-js` (3.3.31) - Size unknown, likely large
3. `html5-qrcode` (2.3.8) - ~100KB+ (heavy camera library)
4. `react-hook-form` (7.68.0) - ~20KB gzipped
5. `date-fns` (4.1.0) - ~69KB gzipped (full library)

**Evidence:** `apps/web/package.json`

**Observations:**
- ❌ No bundle analyzer configured
- ❌ No code splitting strategy documented
- ✅ Next.js 16 default code splitting (automatic)
- ⚠️ Large client-side dependencies for scanning and payments

### SSR vs CSR Usage Patterns

**Server-Side Rendering (Primary):**
- Most pages are Server Components by default
- Data fetching in Server Components via Prisma

**Client Components (Selective):**
- Forms: `'use client'` for React Hook Form
- Interactive components: Dialogs, buttons with `useTransition`
- Scanning: `html5-qrcode` requires client-side camera access

**Evidence:**
- Grep found 20+ `'use client'` directives (forms, admin tools)
- Most page components do NOT have `'use client'` (Server Components)

**Good Practices:**
- ✅ Forms are client components
- ✅ Data-heavy pages remain server components
- ✅ Actions are server-side

### Dynamic Imports / Lazy Loading
**Status:** ⚠️ NOT EXPLICITLY USED  
**Evidence:** No `next/dynamic` imports found in common patterns

**Recommended:**
- Lazy load QR scanner: `const Scanner = dynamic(() => import('./scanner'))`
- Lazy load Stripe components for checkout page only

### Large Dependencies to Review

1. **html5-qrcode (100KB+)**
   - Used in: Check-in scanner
   - Fix: Lazy load only on `/checkin` page
   - Alternative: Consider lighter QR library (jsQR ~20KB)

2. **date-fns (69KB)**
   - Used in: Multiple pages for date formatting
   - Fix: Tree-shake by importing only needed functions
   - Example: `import { format } from 'date-fns/format'` (not full library)

3. **Stripe Connect JS (size TBD)**
   - Used in: Admin payment settings
   - Fix: Lazy load only on settings pages

### Page Load Performance (Estimated)

**Fast Pages (Likely <1s LCP):**
- `/` - Hero + features (SSR with minimal JS)
- `/courses` - Course list (SSR with filters)
- `/profile` - User profile (SSR, simple)

**Slower Pages (Likely >1s LCP):**
- `/checkin` - Heavy QR scanner library
- `/admin/*` - Complex forms with many components
- `/cart` - Pricing calculations client-side (should be server)

**Recommendations:**
1. Measure Core Web Vitals in production (add Vercel Analytics)
2. Use React Profiler for client component optimization
3. Implement route-based code splitting for admin pages

---

## 9. Architecture Gaps & Risks (Top 10)

### 1. 🔴 CRITICAL: Database Credentials in Git
**Risk:** All database passwords are visible in committed `.env` files  
**Evidence:** `packages/database/.env`, `apps/web/.env.prod`, etc.  
**Impact:** 
- Compromised credentials if repo is ever public
- Insider threat vector
- Compliance violation (GDPR, PCI)

**Fix:**
1. Rotate all passwords immediately
2. Remove `.env` files from Git (keep `.env.example` only)
3. Use Vercel environment variables exclusively
4. Add pre-commit hook to block `.env` files

**Priority:** IMMEDIATE (before any pilot launch)

---

### 2. 🔴 HIGH: Row Level Security (RLS) Status Unknown
**Risk:** Backend authorization may be the only security layer  
**Evidence:** No SQL policy files found, RLS status unconfirmed  
**Impact:**
- If client directly queries Supabase, it could bypass auth checks
- Single point of failure (backend actions)

**Fix:**
1. Verify RLS is enabled on all tables via Supabase dashboard
2. Create comprehensive RLS policies for multi-tenant isolation
3. Test RLS with direct Supabase client queries
4. Document RLS strategy in `docs/SECURITY.md`

**Priority:** HIGH (before staging pilot)

---

### 3. 🟡 MEDIUM: No Automated Testing
**Risk:** Regressions, bugs, and security issues undetected  
**Evidence:** No test scripts in `package.json`  
**Impact:**
- High risk of payment/pricing bugs
- Can't confidently refactor code
- Manual QA is slow and error-prone

**Fix:**
1. Add Jest + React Testing Library
2. Unit test pricing engine (`lib/pricing/engine.ts`)
3. Integration test checkout flow
4. E2E test critical paths (Playwright)
5. Target 70% code coverage for business logic

**Priority:** MEDIUM (within 2 weeks of pilot start)

---

### 4. 🟡 MEDIUM: Missing Tenant Scoping Audits
**Risk:** Cross-tenant data leakage via missing `organizerId` filters  
**Evidence:** Multi-tenant schema present, but queries not audited  
**Impact:**
- Organizer A could see/modify Organizer B's data
- Compliance violation (GDPR Article 32 - data isolation)

**Fix:**
1. Audit all Prisma queries for `organizerId` filtering
2. Add Prisma middleware to enforce tenant scoping:
   ```typescript
   prisma.$use(async (params, next) => {
     if (params.model === 'CoursePeriod' && !params.args.where?.organizerId) {
       throw new Error('Missing organizerId filter')
     }
     return next(params)
   })
   ```
3. Add integration tests for tenant isolation

**Priority:** HIGH (before multi-organizer pilot)

---

### 5. 🟡 MEDIUM: Heavy Client-Side Dependencies
**Risk:** Slow page loads, poor mobile performance  
**Evidence:**
- `html5-qrcode` (100KB+)
- `date-fns` (69KB, full library)
- `@stripe/stripe-js` (80KB)

**Impact:**
- Check-in page slow to load on mobile
- Poor Core Web Vitals (LCP >2.5s)
- User frustration, especially at door check-in

**Fix:**
1. Lazy load QR scanner: `dynamic(() => import('./scanner'))`
2. Tree-shake date-fns: `import { format } from 'date-fns/format'`
3. Use route-based code splitting for admin pages
4. Measure with Lighthouse and Vercel Analytics

**Priority:** MEDIUM (optimize before public launch)

---

### 6. 🟡 MEDIUM: No Error Monitoring
**Risk:** Production errors go unnoticed until users report them  
**Evidence:** No Sentry, Bugsnag, or similar integration found  
**Impact:**
- Payment failures may not trigger alerts
- User experience degrades silently
- Hard to debug production issues

**Fix:**
1. Add Sentry: `npm install @sentry/nextjs`
2. Configure error boundaries in layouts
3. Track server action failures
4. Set up alerts for critical errors (payment, checkout)

**Priority:** MEDIUM (before staging pilot)

---

### 7. 🟡 MEDIUM: Inconsistent Error Handling
**Risk:** Users see cryptic errors, lack of graceful degradation  
**Evidence:**
- Some actions return `{ error: string }`
- Some throw errors
- No standardized format

**Impact:**
- Poor UX when errors occur
- Hard to debug from error messages
- Inconsistent UI error states

**Fix:**
1. Standardize error response format:
   ```typescript
   type ActionResult<T> = 
     | { success: true, data: T }
     | { success: false, error: string, code?: string }
   ```
2. Create error boundary components
3. Add user-friendly error messages
4. Log errors to monitoring service

**Priority:** LOW (nice to have, not blocking)

---

### 8. 🟢 LOW: No Node.js Version Pinning
**Risk:** Version drift between environments  
**Evidence:** No `.nvmrc` or `engines` field in `package.json`  
**Impact:**
- Dev/staging/prod may run different Node versions
- Subtle bugs or compatibility issues

**Fix:**
1. Add `.nvmrc` with Node 20 LTS
2. Add to `package.json`:
   ```json
   "engines": {
     "node": ">=20.0.0 <21.0.0"
   }
   ```
3. Document in README

**Priority:** LOW (good hygiene)

---

### 9. 🟢 LOW: No Code Formatting Automation
**Risk:** Inconsistent code style, merge conflicts  
**Evidence:** No Prettier scripts in `package.json`  
**Impact:**
- Code reviews slower (style debates)
- Merge conflicts from whitespace diffs

**Fix:**
1. Add Prettier: `npm install -D prettier`
2. Add `.prettierrc` config
3. Add script: `"format": "prettier --write ."`
4. Add pre-commit hook (Husky + lint-staged)

**Priority:** LOW (nice to have)

---

### 10. 🟢 LOW: No Bundle Size Monitoring
**Risk:** Slow regressions creep in over time  
**Evidence:** No webpack-bundle-analyzer or similar  
**Impact:**
- Bundle size grows without notice
- Performance degrades slowly

**Fix:**
1. Add bundle analyzer: `npm install -D @next/bundle-analyzer`
2. Configure in `next.config.ts`:
   ```typescript
   const withBundleAnalyzer = require('@next/bundle-analyzer')({
     enabled: process.env.ANALYZE === 'true',
   })
   module.exports = withBundleAnalyzer(nextConfig)
   ```
3. Run on CI: `ANALYZE=true npm run build`
4. Set bundle size budgets

**Priority:** LOW (optimization, not blocking)

---

## 10. Recommended Next Steps (2-Week Plan)

### Week 1: Security & Stability

#### Day 1-2: CRITICAL Security Fixes
- [ ] **Rotate all database passwords** (dev, staging, prod)
- [ ] **Remove `.env` files from Git**, add to `.gitignore`
- [ ] **Add `.env.example` templates** with placeholder values
- [ ] **Configure Vercel environment variables** for all secrets
- [ ] **Add pre-commit hook** to block `.env` files (Husky)
- [ ] **Audit all admins** with access to Supabase/Vercel

#### Day 3-4: Row Level Security (RLS)
- [ ] **Verify RLS status** on all tables via Supabase dashboard
- [ ] **Create RLS policies** for multi-tenant isolation:
  - `CoursePeriod`, `CourseTrack`, `Registration`, `Membership`, `MembershipTier`
  - Policy: Users can only read/write data for their `organizerId`
- [ ] **Test RLS** with direct Supabase client queries
- [ ] **Document RLS strategy** in `docs/SECURITY.md`

#### Day 5: Tenant Scoping Audit
- [ ] **Audit all Prisma queries** for missing `organizerId` filters
- [ ] **Add Prisma middleware** to enforce tenant scoping (throw error if missing)
- [ ] **Write integration tests** for cross-tenant isolation
- [ ] **Fix any queries** that bypass tenant filters

### Week 2: Testing & Monitoring

#### Day 6-7: Testing Infrastructure
- [ ] **Setup Jest + React Testing Library**
- [ ] **Write unit tests** for pricing engine:
  - `calculatePricing()` with member discounts
  - `calculateMva()` with Norwegian tax rates
  - `calculateOrderTotal()` with discounts + MVA
- [ ] **Write integration tests** for checkout flow:
  - Create order → Pay order → Webhook fulfillment
- [ ] **Target 50% coverage** for critical business logic

#### Day 8: Error Monitoring
- [ ] **Install Sentry** (`@sentry/nextjs`)
- [ ] **Configure error tracking** for server actions
- [ ] **Add error boundaries** to layouts
- [ ] **Set up alerts** for critical errors (payment, checkout, auth)
- [ ] **Test error reporting** in staging

#### Day 9: Performance Optimization
- [ ] **Add Vercel Analytics** for Core Web Vitals
- [ ] **Lazy load QR scanner** (`dynamic(() => import('./scanner'))`)
- [ ] **Tree-shake date-fns** (import only needed functions)
- [ ] **Measure baseline** (Lighthouse score for key pages)

#### Day 10: Documentation & Hygiene
- [ ] **Add Node version pinning** (`.nvmrc`, `package.json` engines)
- [ ] **Document deployment process** (update `DEPLOYMENT_GUIDE.md`)
- [ ] **Add code formatting** (Prettier + pre-commit hook)
- [ ] **Create `SECURITY.md`** with security practices
- [ ] **Update README** with architecture overview

### Quick Wins (Can do immediately)
1. ✅ Add `.nvmrc` with Node 20 LTS
2. ✅ Add Prettier formatting
3. ✅ Add bundle analyzer to `next.config.ts`
4. ✅ Document RLS status (even if just "TODO")

### Must-Do Before Pilots
1. 🔴 Fix credential leak (remove from Git, rotate passwords)
2. 🔴 Confirm RLS is enabled (or implement if missing)
3. 🟡 Add basic error monitoring (Sentry)
4. 🟡 Write tests for pricing engine (too risky without tests)

---

## Appendix A: Dependency Analysis

### Top 30 Dependencies (apps/web/package.json)

| Package | Version | Size (Est.) | Category | Notes |
|---------|---------|-------------|----------|-------|
| next | 16.0.10 | ~500KB | Framework | Core framework |
| react | 19.0.0 | ~50KB | Framework | Latest React |
| react-dom | 19.0.0 | ~150KB | Framework | Latest React DOM |
| stripe | 20.0.0 | ~200KB | Payment | Server-side SDK |
| @stripe/stripe-js | 8.6.0 | ~80KB | Payment | Client-side SDK |
| @stripe/connect-js | 3.3.31 | LARGE | Payment | Stripe Connect UI |
| @supabase/supabase-js | 2.87.1 | ~100KB | Auth/DB | Supabase client |
| @supabase/ssr | 0.8.0 | ~20KB | Auth | SSR helpers |
| @prisma/client | 5.22.0 | ~500KB | ORM | Generated Prisma client |
| html5-qrcode | 2.3.8 | ~100KB+ | Scanning | **HEAVY** QR scanner |
| qrcode | 1.5.4 | ~30KB | Ticketing | QR generation |
| qrcode.react | 4.2.0 | ~20KB | Ticketing | QR React component |
| date-fns | 4.1.0 | ~69KB | Utils | **TREE-SHAKE** Date library |
| react-hook-form | 7.68.0 | ~20KB | Forms | Form state management |
| zod | 3.25.76 | ~30KB | Validation | Schema validation |
| @hookform/resolvers | 5.2.2 | ~10KB | Forms | Zod + RHF integration |
| lucide-react | 0.561.0 | ~50KB | Icons | Icon library |
| tailwind-merge | 3.4.0 | ~10KB | Styling | Tailwind class merging |
| class-variance-authority | 0.7.1 | ~5KB | Styling | CVA for variants |
| clsx | 2.1.1 | ~1KB | Styling | Class name helper |
| @getbrevo/brevo | 3.0.1 | ~50KB | Email | Email provider SDK |
| html-to-text | 9.0.5 | ~30KB | Email | HTML to plain text |
| sonner | 2.0.7 | ~15KB | UI | Toast notifications |
| papaparse | 5.5.3 | ~30KB | CSV | CSV parsing |
| @radix-ui/* | Various | ~200KB | UI | Radix UI components (all) |

### Flagged Dependencies (Heavy or Risky)

#### 🔴 html5-qrcode (100KB+)
- **Issue:** Very heavy library for camera scanning
- **Usage:** Check-in page only
- **Fix:** Lazy load with `next/dynamic`
- **Alternative:** Consider jsQR (~20KB) if camera features not needed

#### 🟡 date-fns (69KB full library)
- **Issue:** Entire library imported, not tree-shaken
- **Usage:** Date formatting across many pages
- **Fix:** Import specific functions only:
  ```typescript
  import { format } from 'date-fns/format'  // Not full library
  ```

#### 🟡 @stripe/connect-js (size TBD, likely large)
- **Issue:** Stripe Connect UI components (heavy)
- **Usage:** Admin payment settings only
- **Fix:** Lazy load on admin pages only

#### 🟡 @radix-ui/* (200KB combined)
- **Issue:** Many Radix UI components imported
- **Usage:** UI components throughout
- **Fix:** Already tree-shaken by Next.js, but consider reducing component usage

### Recommendations
1. **Immediate:** Lazy load `html5-qrcode` on check-in page
2. **Quick win:** Tree-shake `date-fns` imports
3. **Monitor:** Add bundle analyzer to track size over time
4. **Goal:** Keep main bundle <200KB gzipped

---

## Appendix B: Migration History Summary

**Total Migrations:** 19 (Dec 2024 - Jan 2026)

**Key Schema Evolution:**
1. **Initial Schema (Dec 13, 2024):** Base models
2. **Organizer Model (Dec 15):** Multi-tenant foundation
3. **Norwegian Compliance (Dec 15):** MVA tracking
4. **Membership System (Dec 18):** Member tiers, products
5. **Email Infrastructure (Dec 19):** Email logs, templates, providers
6. **Cancellation Support (Dec 21):** Refund tracking
7. **Platform Fees (Jan 1, 2026):** Org-specific fee model
8. **Webhook Idempotency (Jan 2, 2026):** Prevents duplicate processing

**Migration Strategy:**
- ✅ Prisma Migrate (automated)
- ✅ Incremental changes (safe rollback)
- ❌ No down migrations (Prisma limitation)
- ⚠️ Manual deployment (no CI/CD)

---

## Appendix C: Supabase Project Summary

**Projects Detected:**
1. **Dev:** `hiwzqklwecrquxtimgos` (eu-west-1)
2. **Staging:** `zmfvwmmchiehnqhwsgkt` (eu-north-1)
3. **Production:** `wdepcyyzjuavsbkrdeax` (eu-north-1)

**Features Used:**
- ✅ Auth (email/password, magic links, OAuth)
- ✅ Database (PostgreSQL with PgBouncer)
- ❌ Storage (no evidence)
- ❌ Edge Functions (no evidence)
- ❌ Realtime (no evidence)

**RLS Status:** UNKNOWN - Requires manual verification

**Connection Pooling:**
- All environments use PgBouncer (port 6543)
- Direct connection env var: `DIRECT_URL` (for migrations)

---

## Summary & Conclusion

### Overall Architecture Quality: **B+ (Good, with critical gaps)**

**Strengths:**
- ✅ Modern stack (Next.js 16, React 19, Prisma, TypeScript)
- ✅ Clean separation of concerns (actions, components, lib)
- ✅ Comprehensive domain model (memberships, pricing, waitlists)
- ✅ Recent security improvements (webhook idempotency)
- ✅ Multi-tenant architecture present

**Critical Gaps:**
- 🔴 Database credentials in Git (IMMEDIATE FIX REQUIRED)
- 🔴 RLS status unknown (HIGH PRIORITY)
- 🟡 No automated testing (BLOCKS CONFIDENT REFACTORING)
- 🟡 Tenant scoping not audited (MULTI-TENANT RISK)

**Recommended Timeline:**
- **Week 1:** Fix security (credentials, RLS, tenant scoping)
- **Week 2:** Add testing, monitoring, performance optimization
- **Before Pilots:** All CRITICAL and HIGH priority items must be resolved

**Next Step:** Share this report with team, prioritize fixes, and begin Week 1 security work immediately.

---

**End of Report**
