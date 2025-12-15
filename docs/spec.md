# Master Implementation Plan — SalsaNor Course Period Platform

> **Context:** SalsaNor runs **multiple parallel course tracks** within a **time-bounded period** (typically **6–8 weeks**). The system must support complex pricing (multi-course, member/non-member, leader/follower vs pair), waitlists, participant lists, membership lists, and **QR-based check-in** (control app).  
> **Primary entity naming:** We will use **Course Period** (Norwegian UI label can be *Kursperiode*) as the “round” that contains many parallel **Course Tracks** (*Kursrekker*).

---

## 1. Project Executive Summary

### High-level goal and value proposition
Build a modern, scalable platform that replaces/augments LetsReg for SalsaNor’s recurring course operations by providing:

- **Course Period setup** (6–8 week rounds) with many **parallel course tracks**
- **Registrations** with role constraints (leader/follower/pair), capacities, and **waitlists**
- **Payments** with **explainable** discount logic (multi-course, membership, pair pricing, promo codes)
- **Membership management** (import/sync) for correct pricing and eligibility
- **Digital tickets (QR)** and a **Check-in control app** for door scanning and attendance logging
- **Admin dashboards** + exports (CSV/Excel) for instructors and operations

### Target audience
- **Admins/Organizers:** SalsaNor course managers handling setup, pricing rules, communication, exports.
- **Participants:** Students registering for one or more tracks within a Course Period; may register as leader/follower or as a pair.
- **Volunteers/Staff (Door/Check-in):** Scan QR tickets, verify eligibility/payment, mark attendance quickly.
- **Instructors:** View participant lists for their tracks, optionally check-in stats.

### Key user stories

**Participant**
1. As a participant, I can browse upcoming Course Periods and see available course tracks with day/time, level, and capacity.
2. As a participant, I can add multiple tracks in the same Course Period to my cart and see **exactly why** the final price is what it is (discount explanation).
3. As a participant, I can register as **leader** or **follower**, and optionally register as a **pair** with another person.
4. As a participant, if a track is full, I can join a **waitlist** and be notified if a spot opens.
5. As a participant, I can access my **digital ticket** (QR) and show it at the door.

**Admin**
1. As an admin, I can create a Course Period (6–8 weeks), define its sales window, and attach discount rules.
2. As an admin, I can create multiple parallel course tracks under a Course Period, with capacity rules (including leader/follower split if needed).
3. As an admin, I can manage registrations, promote from waitlist, and trigger communications.
4. As an admin, I can export participant lists per track and see summary dashboards.

**Check-in staff**
1. As check-in staff, I can scan a QR code, see participant details and track entitlements, and mark them checked-in.
2. As check-in staff, I can quickly see if the participant is paid/eligible and resolve duplicates.

---

## 2. Technical Stack & Architecture Decisions

### Exact tech stack

**Frontend**
- **Next.js (App Router) + TypeScript**
- **Tailwind CSS** + **shadcn/ui** for consistent components
- **PWA support** (participant “user app” + check-in “control app” as installable web apps)
- **React Query** (TanStack Query) for client-side data fetching/caching

**Backend**
- **Next.js Server Actions + Route Handlers** (monorepo, simplest deployment)
- Business logic in a dedicated `/packages/domain` (pure TypeScript) for testability.

**Database**
- **PostgreSQL** (via **Supabase**)
- **Row Level Security (RLS)** for safe multi-role access
- **Migrations** via **Prisma** (recommended) or Supabase migrations; decision: **Prisma** for schema clarity + typed access.

**Auth**
- **Supabase Auth**
  - Email magic link + password (configurable)
  - Role-based access using custom claims / separate `user_roles` table

**Payments**
- **Stripe** as primary payment processor (cards, Apple Pay/Google Pay)
- **Vipps:** integrate via **Vipps ePayment** directly OR via a Stripe-compatible method if available in your region/account.  
  **Decision:** design an internal `PaymentProvider` abstraction so Vipps can be added without refactoring.

**Hosting**
- **Vercel** for Next.js
- **Supabase** for Postgres + Auth + Storage (if needed for exports)

**Observability**
- Sentry (errors) + Vercel analytics (optional)
- Structured logs for payment + waitlist workflows

### Why these choices fit the requirements
- **Next.js + Server Actions**: fast iteration, single deployable, clean handling of forms/checkout flows.
- **Postgres**: ideal for relational data (period → tracks → registrations → payments → check-ins).
- **Supabase Auth + RLS**: secure role-based access without building auth from scratch.
- **PWA**: avoids native app costs; still provides “app-like” QR tickets and mobile scanning.
- **Prisma**: typed queries and reliable migrations in a growing domain model.

### High-level system architecture (data flow, services)

**Core flows**
1. **Browse & Select**
   - Client fetches Course Periods + Tracks.
2. **Cart & Pricing**
   - Client sends `PricingRequest` to server action.
   - Server executes deterministic discount engine → returns `PricingBreakdown`.
3. **Checkout**
   - Server creates `Order` + `PaymentIntent` (Stripe), then confirms.
4. **Fulfillment**
   - On payment success webhook:
     - mark `Order` paid
     - activate `Registrations`
     - generate `Ticket` (QR token)
5. **Check-in**
   - Control PWA scans QR → server validates token → creates `CheckIn` record.

**Services (logical modules, same repo)**
- `domain/pricing` — discount rules engine + explanations
- `domain/capacity` — seat allocation logic (including leader/follower split)
- `domain/waitlist` — waitlist promotion policies
- `domain/ticketing` — QR token generation/verification
- `integrations/payments` — Stripe + Vipps adapters
- `integrations/membership` — CSV import/sync + optional WP/CRM hooks

### Agentic Strategy (recommended sub-agents & responsibilities)
1. **Domain Model & Database Architect**
   - Finalize schema, constraints, RLS, migrations, indexes.
2. **Pricing & Rules Engine Specialist**
   - Implement discount rule DSL, evaluation order, explainable breakdown.
3. **Payments/Integration Specialist**
   - Stripe integration end-to-end; webhooks; provider abstraction; optional Vipps.
4. **Frontend/UI Agent**
   - Participant PWA + Admin UI + Control scanning UI using shadcn/tailwind.
5. **Security & Auth Agent**
   - Supabase Auth setup, role model, RLS policies, secure API patterns.
6. **QA & Test Automation Agent**
   - Unit tests for pricing/capacity/waitlist; E2E for checkout + scanning.
7. **Ops/Release Agent**
   - Vercel/Supabase env setup, secrets, staging vs prod, deployment checklist.

---

## 3. Data & Storage Specification

### Core naming & entities
- **CoursePeriod**: a bounded 6–8 week “round” that contains many tracks.
- **CourseTrack**: one course series running within a period (e.g., “Rueda L2 – Tuesday”).
- **Session (optional)**: dated instances of a track (for per-date attendance).
- **PersonProfile**: participant identity (can exist without app account).
- **Registration**: a person’s enrollment in a track within a period.
- **PairGroup**: links two people registering as a pair (if applicable).
- **Order + Payment**: financial records (one order can include multiple registrations).
- **Ticket**: QR entitlement linked to a person and period (and/or registrations).
- **CheckIn**: log entry when scanned/checked in.
- **Membership**: member status affecting discounts/eligibility.
- **DiscountRule**: configurable rules attached to a period.

### Schema (Prisma-style models)

> If your AI agent prefers SQL DDL instead, generate migrations from these models; constraints noted below.

```prisma
// prisma/schema.prisma (core excerpt)
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }
generator client { provider = "prisma-client-js" }

enum UserRole { ADMIN ORGANIZER INSTRUCTOR CHECKIN STAFF PARTICIPANT }
enum RegistrationStatus { DRAFT PENDING_PAYMENT ACTIVE WAITLIST CANCELLED REFUNDED }
enum TrackRole { LEADER FOLLOWER ANY }
enum OrderStatus { DRAFT PENDING PAID CANCELLED REFUNDED }
enum PaymentProvider { STRIPE VIPPS }
enum PaymentStatus { REQUIRES_ACTION SUCCEEDED FAILED REFUNDED }
enum WaitlistStatus { ON_WAITLIST OFFERED EXPIRED ACCEPTED REMOVED }
enum TicketStatus { ACTIVE VOIDED }
enum CheckInType { PERIOD_ENTRY SESSION_ENTRY }

model UserAccount {
  id            String   @id @default(uuid())
  supabaseUid   String   @unique
  email         String   @unique
  createdAt     DateTime @default(now())
  roles         UserAccountRole[]
  personProfile PersonProfile?
}

model UserAccountRole {
  id        String   @id @default(uuid())
  userId    String
  role      UserRole
  createdAt DateTime @default(now())
  user      UserAccount @relation(fields: [userId], references: [id])
  @@unique([userId, role])
}

model PersonProfile {
  id          String   @id @default(uuid())
  userId      String?  @unique
  firstName   String
  lastName    String
  phone       String?
  email       String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  memberships Membership[]
  registrations Registration[]
  tickets     Ticket[]
  user        UserAccount? @relation(fields: [userId], references: [id])
  @@index([email])
}

model CoursePeriod {
  id            String   @id @default(uuid())
  code          String   @unique // e.g., "TB-2026-P1"
  name          String
  city          String
  locationName  String?
  startDate     DateTime
  endDate       DateTime
  salesOpenAt   DateTime
  salesCloseAt  DateTime
  timezone      String   @default("Europe/Oslo")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  tracks        CourseTrack[]
  discountRules DiscountRule[]
  orders        Order[]
  tickets       Ticket[]
  @@index([startDate, endDate])
}

model CourseTrack {
  id             String   @id @default(uuid())
  periodId       String
  title          String
  levelLabel     String?  // "Intro", "L2", etc.
  weekday        Int      // 1=Mon..7=Sun
  timeStart      String   // "19:00"
  timeEnd        String   // "20:15"
  capacityTotal  Int
  capacityLeaders Int?    // optional split capacity
  capacityFollowers Int?  // optional split capacity
  rolePolicy     TrackRole @default(ANY)
  waitlistEnabled Boolean @default(true)
  priceSingleCents Int
  pricePairCents   Int?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  period         CoursePeriod @relation(fields: [periodId], references: [id])
  sessions       TrackSession[]
  registrations  Registration[]
  @@index([periodId])
}

model TrackSession {
  id        String   @id @default(uuid())
  trackId   String
  startsAt  DateTime
  endsAt    DateTime
  track     CourseTrack @relation(fields: [trackId], references: [id])
  checkIns  CheckIn[]
  @@index([trackId, startsAt])
}

model PairGroup {
  id        String   @id @default(uuid())
  periodId  String
  createdAt DateTime @default(now())
  period    CoursePeriod @relation(fields: [periodId], references: [id])
  members   Registration[]
  @@index([periodId])
}

model Registration {
  id            String   @id @default(uuid())
  periodId      String
  trackId       String
  personId      String
  status        RegistrationStatus @default(DRAFT)
  chosenRole    TrackRole @default(ANY) // participant choice: leader/follower/any
  pairGroupId   String?
  orderId       String?
  waitlist      WaitlistEntry?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  period        CoursePeriod @relation(fields: [periodId], references: [id])
  track         CourseTrack  @relation(fields: [trackId], references: [id])
  person        PersonProfile @relation(fields: [personId], references: [id])
  pairGroup     PairGroup? @relation(fields: [pairGroupId], references: [id])
  order         Order? @relation(fields: [orderId], references: [id])
  @@unique([trackId, personId]) // prevent duplicates in same track
  @@index([periodId, trackId])
}

model WaitlistEntry {
  id            String   @id @default(uuid())
  registrationId String @unique
  status        WaitlistStatus @default(ON_WAITLIST)
  offeredUntil  DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  registration  Registration @relation(fields: [registrationId], references: [id])
}

model Order {
  id          String   @id @default(uuid())
  periodId    String
  purchaserPersonId String
  status      OrderStatus @default(DRAFT)
  currency    String   @default("NOK")
  subtotalCents Int
  discountCents Int
  totalCents  Int
  pricingSnapshot Json // store applied rules + breakdown for audit
  providerCheckoutRef String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  period      CoursePeriod @relation(fields: [periodId], references: [id])
  purchaser   PersonProfile @relation(fields: [purchaserPersonId], references: [id])
  registrations Registration[]
  payments    Payment[]
  @@index([periodId, status])
}

model Payment {
  id          String @id @default(uuid())
  orderId     String
  provider    PaymentProvider
  providerPaymentRef String
  status      PaymentStatus
  amountCents Int
  currency    String @default("NOK")
  rawPayload  Json
  createdAt   DateTime @default(now())
  order       Order @relation(fields: [orderId], references: [id])
  @@index([orderId])
}

model Ticket {
  id          String   @id @default(uuid())
  periodId    String
  personId    String
  status      TicketStatus @default(ACTIVE)
  qrTokenHash String   @unique // store hash only
  issuedAt    DateTime @default(now())
  period      CoursePeriod @relation(fields: [periodId], references: [id])
  person      PersonProfile @relation(fields: [personId], references: [id])
  checkIns    CheckIn[]
  @@unique([periodId, personId]) // one ticket per person per period
  @@index([periodId])
}

model CheckIn {
  id          String   @id @default(uuid())
  ticketId    String
  type        CheckInType
  sessionId   String?
  scannedByUserId String?
  scannedAt   DateTime @default(now())
  meta        Json?
  ticket      Ticket @relation(fields: [ticketId], references: [id])
  session     TrackSession? @relation(fields: [sessionId], references: [id])
  @@index([ticketId, scannedAt])
}

model Membership {
  id          String   @id @default(uuid())
  personId    String
  org         String   @default("SALSANOR")
  memberNumber String?
  validFrom   DateTime
  validTo     DateTime
  status      String   @default("ACTIVE") // keep flexible; could be enum later
  source      String   @default("IMPORT")
  createdAt   DateTime @default(now())
  person      PersonProfile @relation(fields: [personId], references: [id])
  @@index([personId, validTo])
}

model DiscountRule {
  id          String   @id @default(uuid())
  periodId    String
  code        String   // internal code e.g. "MULTI_2", "MEMBER_15"
  name        String
  priority    Int      // evaluation order
  enabled     Boolean  @default(true)
  ruleType    String   // e.g. "MULTI_COURSE", "MEMBERSHIP", "PAIR_PRICE", "PROMO_CODE"
  config      Json     // structured config per type
  createdAt   DateTime @default(now())
  period      CoursePeriod @relation(fields: [periodId], references: [id])
  @@unique([periodId, code])
  @@index([periodId, priority])
}
```

### Key relationships & constraints (must-implement)
- `CoursePeriod 1—N CourseTrack`
- `CourseTrack 1—N Registration`
- Prevent duplicate registration: `@@unique([trackId, personId])`
- One ticket per person per period: `@@unique([periodId, personId])`
- If using leader/follower split:
  - enforce by server-side seat allocation (do not rely on DB constraints alone)
- `pricingSnapshot` stored on Order for **auditability** (critical for discount disputes)

### Initial status/role enums
Already defined above; keep stable for v1:
- `UserRole`
- `RegistrationStatus`
- `TrackRole`
- `OrderStatus`
- `PaymentProvider`
- `PaymentStatus`
- `WaitlistStatus`
- `TicketStatus`
- `CheckInType`

---

## 4. API & Interface Specification

### Core server endpoints / handlers (Next.js Route Handlers)
> Use `/app/api/*` route handlers for REST-like endpoints. For mutation-heavy flows, prefer Server Actions, but keep these APIs for the control app and integrations.

#### Public (Participant)
- `GET /api/public/periods`
  - Returns list of upcoming CoursePeriods with tracks.
- `GET /api/public/periods/:periodCode`
  - Returns detailed period view + tracks + pricing metadata.
- `POST /api/public/pricing/quote`
  - Calculates final price from cart + user context.
- `POST /api/public/checkout/create`
  - Creates order + payment intent/checkout session.
- `GET /api/public/me/ticket?periodCode=...`
  - Returns signed ticket payload (NOT token hash) for QR display.

#### Authenticated (Participant)
- `GET /api/me/registrations?periodCode=...`
- `POST /api/me/registrations/cancel`
- `POST /api/me/profile/update`

#### Admin/Organizer (RBAC)
- `POST /api/admin/periods`
- `PATCH /api/admin/periods/:id`
- `POST /api/admin/tracks`
- `PATCH /api/admin/tracks/:id`
- `GET /api/admin/registrations?periodId=...&trackId=...`
- `POST /api/admin/waitlist/promote`
- `POST /api/admin/memberships/import` (CSV upload)
- `GET /api/admin/exports/track-list.csv?trackId=...`
- `POST /api/admin/discount-rules` (CRUD)

#### Check-in Control App
- `POST /api/checkin/validate`
- `POST /api/checkin/mark`
- `GET /api/checkin/summary?periodId=...` (optional)

#### Webhooks
- `POST /api/webhooks/stripe`
  - Handle payment succeeded/failed/refunded
- `POST /api/webhooks/vipps` (optional later)

### Contracts for critical business logic

#### Pricing Quote Contract
**Input**
```json
{
  "periodCode": "TB-2026-P1",
  "cart": [
    { "trackId": "uuid-track-1", "mode": "SINGLE", "role": "LEADER" },
    { "trackId": "uuid-track-2", "mode": "SINGLE", "role": "FOLLOWER" }
  ],
  "purchaser": {
    "email": "a@b.com",
    "firstName": "A",
    "lastName": "B",
    "phone": "+47..."
  },
  "membership": { "isMember": true },
  "promoCode": "OPTIONAL"
}
```

**Output**
```json
{
  "currency": "NOK",
  "subtotalCents": 400000,
  "discountCents": 60000,
  "totalCents": 340000,
  "appliedRules": [
    { "code": "MEMBER_15", "name": "Medlemsrabatt", "amountCents": 45000 },
    { "code": "MULTI_2", "name": "Flere kurs", "amountCents": 15000 }
  ],
  "lineItems": [
    { "trackId": "uuid-track-1", "baseCents": 200000, "finalCents": 170000 },
    { "trackId": "uuid-track-2", "baseCents": 200000, "finalCents": 170000 }
  ],
  "explanation": [
    "Du får 15% medlemsrabatt (gyldig medlemskap).",
    "Du får flerkursrabatt fordi du melder deg på 2 kurs i samme kursperiode."
  ]
}
```

#### Seat Allocation Contract (Capacity & Waitlist)
**Function**
`allocateSeat({ trackId, chosenRole, mode, pairGroupId }) → { status: ACTIVE | WAITLIST, reason }`

Rules:
- If `capacityTotal` reached → WAITLIST (if enabled).
- If leader/follower split used:
  - chosenRole LEADER increments leader count; must not exceed `capacityLeaders`.
  - chosenRole FOLLOWER increments follower count; must not exceed `capacityFollowers`.
- If pair registration:
  - allocate both seats atomically or fail/WAITLIST both together (policy decision; recommend atomic).

#### Ticketing Contract (QR)
- QR code encodes **signed short payload**:
  - `periodId`, `personId`, `ticketId`, `issuedAt`, `nonce`
- Store only `qrTokenHash` server-side; validate by signature + hash match.
- On scan:
  - verify ticket ACTIVE
  - verify person has ACTIVE registrations in that period
  - return entitlements summary + payment status

---

## 5. Frontend & UI/UX Guidelines

### Core pages/views

**Public**
- `/` — landing + upcoming course periods
- `/p/[periodCode]` — Course Period details with all tracks
- `/checkout` — cart + pricing breakdown + checkout
- `/success` — post-payment confirmation + ticket access

**Participant (auth optional but recommended)**
- `/me` — dashboard (registrations, ticket, profile)
- `/me/ticket/[periodCode]` — full-screen QR ticket

**Admin**
- `/admin` — dashboard
- `/admin/periods` — list/create
- `/admin/periods/[id]` — edit period + view tracks + discount rules
- `/admin/tracks/[id]` — manage track + rosters
- `/admin/registrations` — filters + bulk tools
- `/admin/memberships` — import/sync + list
- `/admin/exports` — exports panel

**Check-in Control PWA**
- `/checkin` — login + period selector
- `/checkin/scan` — camera scanner view
- `/checkin/result` — validation result + “Mark check-in”
- `/checkin/history` — recent scans (helps resolve duplicates)

### Component hierarchy (Atomic design)

**Atoms**
- Button, Input, Select, Badge, Tooltip, Spinner
- QRCode renderer component
- Status pill (Paid/Waitlist/Active)

**Molecules**
- TrackCard (title, time, capacity, price)
- CartLineItem (track + role + price)
- PricingBreakdown (rule list + explanation)
- ParticipantRow (admin list row)
- ScanResultCard (ticket validation summary)

**Organisms**
- TrackGrid (list of TrackCards + filters)
- CheckoutForm (purchaser details + cart + breakdown + pay)
- AdminPeriodEditor (tabs: Tracks, Rules, Sales, Exports)
- CheckInScanner (camera + scan pipeline + feedback)
- WaitlistManager (promote/offers + timer)

### Design guidelines for AI designer

**Look & Feel**
- Modern, clean, Scandinavian minimalism
- White/near-white surfaces with soft shadows
- Strong readability for quick check-in use outdoors/indoors
- Touch-friendly controls (minimum 44px targets)

**Color palette (hex)**
- Primary: `#0B2A3C` (deep navy)
- Accent: `#16A6B6` (teal)
- Success: `#1F9D55`
- Warning: `#F59E0B`
- Danger: `#DC2626`
- Background: `#F7FAFC`
- Surface: `#FFFFFF`
- Text: `#0F172A`
- Muted text: `#64748B`
- Borders: `#E2E8F0`

**Typography**
- Use system font stack or **Inter**
- Headings: 600–700 weight
- Body: 400–500
- Numeric emphasis for prices/capacity: tabular-nums

**UI patterns**
- Always show **pricing explanation** on checkout (rule list + totals)
- Capacity indicators: “X / Y” + color-coded badge
- Waitlist states clearly labeled and consistent everywhere
- Check-in result screen uses “traffic light” layout:
  - big status banner (green/orange/red), then details, then action

---

## 6. Step-by-Step Implementation Roadmap

> Build in **atomic, agent-friendly steps**. Each step should be a distinct PR/commit.

### Phase 1 — Repo, environments, foundations
1. Create monorepo:
   - `apps/web` (Next.js)
   - `packages/domain` (pure TS business logic)
   - `packages/ui` (shared components)
2. Provision Supabase project (staging + prod), configure Auth providers.
3. Add Prisma, connect `DATABASE_URL`, create initial migration from schema.
4. Set up RBAC model (`UserAccountRole`) + seed script for first admin user.
5. Configure Vercel deployments (staging/prod) with env vars.

### Phase 2 — Core data CRUD (Admin-first)
6. Implement Admin auth guard + role checks (ADMIN/ORGANIZER).
7. Build Admin UI pages for CoursePeriod CRUD.
8. Build Admin UI pages for CourseTrack CRUD.
9. Implement basic list views + search/filter for periods/tracks.
10. Add CSV export endpoint for track rosters (empty initially).

### Phase 3 — Registration engine (no payment yet)
11. Implement participant public pages: list periods + period detail.
12. Implement “Add to cart” with chosen role (leader/follower/any) and mode (single/pair).
13. Implement seat allocation logic:
    - total capacity
    - optional leader/follower split
    - return ACTIVE vs WAITLIST
14. Implement Registration creation (DRAFT/PENDING_PAYMENT) with duplicate protection.
15. Admin roster view shows registrations and statuses.

### Phase 4 — Pricing & discount rules engine (explainable)
16. Define rule types (v1):
    - MEMBERSHIP_PERCENT
    - MULTI_COURSE_TIERED
    - PAIR_FIXED_PRICE (per track)
    - PROMO_CODE_PERCENT (optional)
17. Implement rule evaluation order by `priority`.
18. Implement `quotePricing()` returning:
    - line items, totals, applied rules, explanations
19. Store and load DiscountRules per period; build Admin rule CRUD UI.
20. Integrate pricing quote into checkout page (still no payment).

### Phase 5 — Payments (Stripe) + fulfillment
21. Implement Order creation:
    - snapshot pricing breakdown into `pricingSnapshot`
    - link registrations to order
22. Integrate Stripe Checkout or PaymentIntent:
    - create session
    - redirect
23. Implement Stripe webhook:
    - on success: set Order=PAID, set Registrations=ACTIVE, generate Ticket
    - on fail/expire: cancel order, release seats (or keep WAITLIST policy)
24. Participant success page shows confirmation and ticket link.
25. Admin exports include paid/active participants.

### Phase 6 — Ticketing & Check-in control app (PWA)
26. Implement ticket issuing:
    - one ticket per person per period
    - generate signed QR payload + store hash
27. Build participant “My Ticket” full-screen QR view.
28. Build `/checkin` PWA:
    - login (CHECKIN/STAFF roles)
    - select period
29. Implement QR scanning UI using browser camera.
30. Implement validate endpoint:
    - verify signature/hash
    - show entitlements + payment/registration status
31. Implement mark check-in endpoint:
    - create `CheckIn` record
    - prevent duplicates within time window (configurable)

### Phase 7 — Waitlist automation (MVP → v1.1)
32. Implement admin “Promote from waitlist” action:
    - choose next waitlist entry
    - create offer window (e.g., 24h)
    - send email with pay link
33. Implement scheduled job (cron) to expire offers and move to next.
34. Add participant view showing waitlist status + offer countdown.

### Phase 8 — Membership sync & ops polish
35. Implement membership import:
    - CSV schema + validation
    - upsert memberships
36. Add membership lookup by email/phone during checkout.
37. Add audit logs for:
    - pricing quotes
    - manual promotions
    - refunds/cancellations
38. Add monitoring + alerts (Sentry).

### Phase 9 — Hardening & launch checklist
39. Add unit tests:
    - pricing rules
    - seat allocation
    - waitlist transitions
40. Add E2E tests (Playwright):
    - browse → cart → quote → checkout → webhook → ticket → scan
41. Security review:
    - RLS policies
    - admin endpoints protected
    - webhook signature verification
42. Staging pilot with Antigravity:
    - 1 CoursePeriod, 3–6 tracks, real-world discount rules
43. Post-pilot fixes, then production rollout.

---

## Appendix — MVP Scope for Antigravity Pilot (recommended)
- One **CoursePeriod**
- 3–6 **CourseTracks**
- Discount rules v1:
  - Membership percent
  - Tiered multi-course discount (2 courses, 3+ courses)
  - Pair pricing (per track)
- Waitlist: manual promote
- Ticketing + scanning: yes (if door workflow is key), otherwise phase 2
- Exports: track roster CSV with role, membership flag, paid/status

---

## Appendix — Integration Notes (existing SalsaNor ecosystem)
- If SalsaNor currently relies on WordPress user accounts/newsletter tools:
  - keep this app standalone for v1
  - optionally add a “WP bridge” later (webhooks or scheduled sync)
- Avoid coupling the initial MVP to WordPress plugin complexity; prioritize correctness in pricing + operations.

