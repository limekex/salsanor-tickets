# Role Implementation: ORG_FINANCE (Finance Manager)

**Status**: 🟡 IN PROGRESS  
**Priority**: 🔥 HIGH - Required for MVP  
**Last Updated**: February 11, 2026

## 🎯 Overview

**Label:** Finance Manager  
**Description:** Financial and payment management access for organization  
**Scope:** Organization-level (specific organizer)

The Finance Manager role provides read-only access to financial data, reports, and exports for their organization. All functionality MUST comply with **Norwegian Accounting Law (Bokføringsloven)** and **VAT Law (Merverdiavgiftsloven)**.

---

## ✅ Existing Infrastructure

### Already Implemented ✅
- [x] Role exists in database schema (`UserRole.ORG_FINANCE`)
- [x] Dashboard displays role with permissions
- [x] `useOrganizerAccess` hook with `isFinanceManager` check
- [x] Role can be assigned via staff admin invite system
- [x] Global admin finance page exists at `/admin/finance`
- [x] `finance.ts` server actions exist (but only for global admin)
- [x] `legal-requirements.ts` with Norwegian compliance formatters
- [x] Orders page in staffadmin (`/staffadmin/orders`)

### Files to Reference
- `/apps/web/src/app/admin/finance/page.tsx` - Existing global admin finance page
- `/apps/web/src/app/actions/finance.ts` - Existing finance actions (global scope)
- `/apps/web/src/lib/tickets/legal-requirements.ts` - Norwegian legal compliance
- `/apps/web/src/hooks/use-organizer-access.ts` - Role checking hook

---

## 📋 Implementation Checklist

### Phase 1: Core Finance Portal (Required for MVP)

#### 1.1 Navigation & Access
- [ ] Add "Finance" menu item in `staff-admin-nav.tsx` for ORG_FINANCE role
- [ ] Create `/staffadmin/finance` route with layout
- [ ] Create auth utility `requireOrgFinance()` in `/utils/auth-org-finance.ts`
- [ ] Ensure ORG_ADMIN also has access to finance views

#### 1.2 Server Actions - Create `/app/actions/staffadmin-finance.ts`

```typescript
// Required functions:
export async function getOrgFinancialSummary(organizerId: string)
export async function getOrgRevenueByPeriod(organizerId: string, dateRange?: DateRange)
export async function getOrgRevenueByTrack(organizerId: string)
export async function getOrgPaymentStatus(organizerId: string)
export async function getOrgPaidRegistrations(organizerId: string, filters?: FinanceFilters)
export async function exportOrgFinancialData(organizerId: string, format: 'csv' | 'json', dateRange?: DateRange)
export async function getOrgInvoices(organizerId: string)
export async function getOrgDiscountUsage(organizerId: string)
```

All functions MUST:
- Validate user has `ORG_FINANCE` or `ORG_ADMIN` role for the specific `organizerId`
- Filter data to ONLY show the organization's data
- Use `formatNOK()` and `formatDateNO()` from `legal-requirements.ts`

#### 1.3 Finance Dashboard Page - `/staffadmin/finance/page.tsx`

**Required Stats Cards:**
| Stat | Description |
|------|-------------|
| Total Revenue | Sum of all paid orders (NOK) |
| Order Count | Number of paid orders |
| Registration Count | Total registrations |
| Average Order Value | Revenue / Orders |
| Pending Payments | Orders with status PENDING_PAYMENT |
| Discounts Given | Total discount amount |

**Required Sections:**
1. Revenue overview cards
2. Revenue by period table
3. Revenue by track table
4. Payment status breakdown
5. Recent orders list (last 10)

---

### Phase 2: Detailed Reports (Required for MVP)

#### 2.1 Revenue Reports - `/staffadmin/finance/revenue/page.tsx`
- [ ] Revenue by date range (with date picker)
- [ ] Revenue by course period
- [ ] Revenue by track/course
- [ ] Revenue by payment method (Stripe)
- [ ] MVA (VAT) breakdown table

**MVA Breakdown Table (MANDATORY for Norwegian law):**
| Column | Description |
|--------|-------------|
| Period | Course period name |
| Gross Revenue | Total including MVA |
| Net Revenue | Amount before MVA |
| MVA Rate | 25% or 0% |
| MVA Amount | Calculated VAT |

#### 2.2 Payment Status - `/staffadmin/finance/payments/page.tsx`
- [ ] List all payments with status filter
- [ ] Filter: SUCCEEDED, PENDING, FAILED, REFUNDED
- [ ] Show Stripe payment ID for reference
- [ ] Show payment date and amount

#### 2.3 Registration Payments - `/staffadmin/finance/registrations/page.tsx`
- [ ] List paid registrations
- [ ] Filter by period, track, date range
- [ ] Show: participant name, track, amount, payment date
- [ ] Link to full order details

---

### Phase 3: Export & Compliance (Required for MVP)

#### 3.1 Data Export - `/staffadmin/finance/export/page.tsx`
- [ ] Export button with format selection (CSV/Excel)
- [ ] Date range filter for export
- [ ] Period/track filter for export
- [ ] Generate compliant export file

**Export File MUST Include (Norwegian Bokføringsloven):**
```
Order ID, Order Date, Period, Track, 
Participant Name, Subtotal (NOK), Discount (NOK),
Net Amount (NOK), MVA Rate (%), MVA Amount (NOK), 
Total (NOK), Payment Method, Payment Date, Stripe ID
```

#### 3.2 API Route for Export - `/api/staffadmin/export/finance/route.ts`
- [ ] Validate ORG_FINANCE or ORG_ADMIN role
- [ ] Support CSV and JSON formats
- [ ] Include all legally required fields
- [ ] Set correct Content-Type and filename headers

---

### Phase 4: Invoice Management (Post-MVP)

#### 4.1 Invoice List - `/staffadmin/finance/invoices/page.tsx`
- [ ] List all invoices for organization
- [ ] Show: invoice number, date, amount, status
- [ ] Download PDF button
- [ ] Resend email button

#### 4.2 Invoice Generation
- [ ] Generate invoice for order
- [ ] Use existing PDF template from `/admin/pdf-templates`
- [ ] Store invoice in database
- [ ] Track invoice number sequence per organization

---

## 🇳🇴 Norwegian Legal Compliance (MANDATORY)

### Bokføringsloven Requirements
All financial reports and exports MUST include:

1. **Seller Information:**
   - Organization name (from `Organizer.name`)
   - Organization number (from `Organizer.organizationNumber`)
   - Address

2. **Transaction Details:**
   - Unique order number
   - Transaction date and time
   - Description of service
   - Quantity
   - Unit price

3. **VAT Breakdown (if MVA registered):**
   - Net amount (grunnlag for MVA)
   - VAT rate (25% or 0%)
   - VAT amount (MVA-beløp)
   - Gross amount (totalbeløp inkl. MVA)

4. **Use Existing Utilities:**
```typescript
import { formatNOK, formatDateNO, formatOrgNumber } from '@/lib/tickets/legal-requirements'
```

### Data Retention
- Financial records must be retained for 5 years (Bokføringsloven §13)
- Exports should include date generated and export ID
- No hard deletion of financial data

---

## 📁 File Structure

```
apps/web/src/
├── app/
│   ├── actions/
│   │   └── staffadmin-finance.ts       # NEW - Finance server actions
│   └── staffadmin/
│       └── finance/
│           ├── layout.tsx              # NEW - Finance section layout
│           ├── page.tsx                # NEW - Finance dashboard
│           ├── revenue/
│           │   └── page.tsx            # NEW - Revenue reports
│           ├── payments/
│           │   └── page.tsx            # NEW - Payment status
│           ├── registrations/
│           │   └── page.tsx            # NEW - Registration payments
│           ├── export/
│           │   └── page.tsx            # NEW - Export tools
│           └── invoices/
│               └── page.tsx            # NEW - Invoice management
├── api/
│   └── staffadmin/
│       └── export/
│           └── finance/
│               └── route.ts            # NEW - Export API
└── utils/
    └── auth-org-finance.ts             # NEW - Finance role auth
```

---

## 🔐 Access Control Matrix

| Feature | ORG_ADMIN | ORG_FINANCE | ORG_CHECKIN | STAFF |
|---------|-----------|-------------|-------------|-------|
| View finance dashboard | ✅ | ✅ | ❌ | ❌ |
| View revenue reports | ✅ | ✅ | ❌ | ❌ |
| View payment status | ✅ | ✅ | ❌ | ❌ |
| Export financial data | ✅ | ✅ | ❌ | ❌ |
| View invoices | ✅ | ✅ | ❌ | ❌ |
| Generate invoices | ✅ | ❌ | ❌ | ❌ |
| View orders page | ✅ | ✅ | ❌ | ❌ |

**IMPORTANT:** ORG_FINANCE is READ-ONLY. Cannot create, edit, or delete any data.

---

## 🧪 Test User

```
Email: finance@salsanor.no
Role: ORG_FINANCE
Organization: SalsaNor Oslo
```

Use this account to test all finance functionality.

---

## 📊 UI Components to Create

| Component | Location | Purpose |
|-----------|----------|---------|
| `FinanceDashboardStats` | `/components/finance/` | Revenue overview cards |
| `RevenueTable` | `/components/finance/` | Revenue by period/track |
| `PaymentStatusTable` | `/components/finance/` | Payment list with filters |
| `MvaBreakdownTable` | `/components/finance/` | VAT breakdown (Norwegian) |
| `FinanceExportDialog` | `/components/finance/` | Export configuration |
| `DateRangeFilter` | `/components/finance/` | Date range picker for reports |

**Use Existing Components:**
- `formatNOK()`, `formatDateNO()` from `@/lib/tickets/legal-requirements`
- `Card`, `Table` from `@/components/ui`
- `EmptyState` from `@/components`

---

## 🔄 Data Flow

```
User (ORG_FINANCE) 
    → staffadmin/finance/* pages
    → requireOrgFinance() auth check
    → staffadmin-finance.ts actions
    → Prisma queries with organizerId filter
    → Return data with legal formatters applied
```

---

## ⚡ Implementation Order

1. **Day 1:** Auth utility + navigation + basic dashboard
2. **Day 2:** Revenue reports with MVA breakdown
3. **Day 3:** Payment status + registration payments
4. **Day 4:** Export functionality + API route
5. **Day 5:** Testing + compliance verification

---

## ✅ Definition of Done

- [ ] All routes accessible with ORG_FINANCE role
- [ ] All routes ALSO accessible with ORG_ADMIN role
- [ ] Data filtered to only user's organization
- [ ] All monetary values use `formatNOK()`
- [ ] All dates use `formatDateNO()`
- [ ] MVA breakdown table shows correct VAT calculations
- [ ] Export includes all legally required fields
- [ ] TypeScript compiles without errors (`npx tsc --noEmit`)
- [ ] Test user `finance@salsanor.no` can access all features
- [ ] Read-only: no create/edit/delete operations available

---

## 🔗 Related Documents

- [legal-requirements.ts](../../apps/web/src/lib/tickets/legal-requirements.ts) - Norwegian compliance utilities
- [Bokføringsloven](https://lovdata.no/dokument/NL/lov/2004-11-19-73) - Norwegian Accounting Act
- [Issue #10 - Code Organization](./github/10-code-organization-refactor.md) - Use shared formatters
