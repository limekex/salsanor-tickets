# Issue #12: TypeScript Build Errors

**Created**: March 7, 2026  
**Priority**: 🔴 High (Blocking deployment)  
**Status**: Open

## Overview

37 TypeScript errors detected during `tsc --noEmit`. These must be resolved before the next deployment.

---

## Error Categories

### 1. Stripe API Version Mismatch (4 errors)

**Problem**: Stripe SDK updated, API version changed from `2025-11-17.clover` to `2026-02-25.clover`

**Files affected:**
- `src/app/(site)/org/[slug]/settings/stripe/actions.ts` (line 152)
- `src/app/actions/cancel-registration.ts` (line 12)
- `src/app/staffadmin/settings/payments/actions.ts` (line 28)
- `src/app/staffadmin/settings/payments/page.tsx` (line 22)

**Fix**: Update API version string or use `as const` type assertion

```typescript
// Option A: Update to new version
apiVersion: '2026-02-25.clover'

// Option B: Use type assertion (if backwards compatibility needed)
apiVersion: '2025-11-17.clover' as any
```

**Root cause**: `npm update` or `npm install` pulled newer Stripe SDK without updating code

---

### 2. Ticket PDF Route - Missing Properties (13 errors)

**File**: `src/app/api/tickets/[id]/pdf/route.ts`

**Problem**: Prisma query doesn't include required fields from Organizer model

**Missing properties:**
- `address`
- `postalCode`
- `orgNumber`
- `vatNumber`
- `contactPhone`
- `location`
- `paymentMethod`

**Also:**
- `eventRegistrationId` should be `EventRegistration`
- Buffer type incompatibility with Response body
- `vatRate` not in `TicketLineItem` type
- `phone` not in `BuyerInfo` type
- `orderId` not in `TransactionInfo` type

**Fix**: Update Prisma include or fix type definitions in ticket PDF generator

---

### 3. StaffAdmin Layout - Role Query Issues (10 errors)

**File**: `src/app/staffadmin/layout.tsx`

**Problems:**
- Line 57: `string[]` not assignable to `UserRole[]`
- Lines 66, 73: `UserAccountRole` not included in Prisma query
- Lines 74, 75, 81, 82, 89: Implicit `any` types

**Fix**: 
1. Include `UserAccountRole` in Prisma query
2. Add explicit type annotations for map/filter parameters

```typescript
// Add to Prisma include
include: {
  UserAccountRole: true
}

// Add type annotations
.map((r: UserAccountRole) => r.role)
```

---

### 4. Location Picker Type Mismatch (1 error)

**File**: `src/app/staffadmin/tracks/staff-track-form.tsx` (line 361)

**Problem**: `LocationValue` type has optional `locationName` but state expects required field

**Fix**: Align types - either make state properties optional or LocationValue properties required

```typescript
// Option A: Make state match LocationValue
const [location, setLocation] = useState<LocationValue>({})

// Option B: Handle undefined in setter
onChange={(value) => setLocation({
  locationName: value.locationName ?? '',
  locationAddress: value.locationAddress ?? '',
  latitude: value.latitude,
  longitude: value.longitude
})}
```

---

### 5. Wallet Pass Generators (3 errors)

**File**: `src/lib/wallet/apple/ticket-pass-generator.ts`
- Line 452: `relevantDate` → use `setRelevantDate()`
- Line 456: `expirationDate` → use `setExpirationDate()`

**File**: `src/lib/wallet/google/membership-pass-generator.ts`
- Line 96: `heroUrl` possibly undefined

**Fix**: Use setter methods for PKPass, add null check for heroUrl

---

### 6. Email Service - Null vs Undefined (1 error)

**File**: `src/lib/email/email-service.ts` (line 115)

**Problem**: `contactEmail: string | null` not assignable to `contactEmail?: string`

**Fix**: Convert null to undefined

```typescript
contactEmail: organizer?.contactEmail ?? undefined
```

---

### 7. Finance Actions (2 errors)

**File**: `src/app/actions/staffadmin-finance.ts`
- Line 615: `null` not assignable to JSON input
- Line 625: `paidAt` property missing from query result

**Fix**: Include `paidAt` in Prisma select, handle null for JSON fields

---

### 8. Finance Payments Page (2 errors)

**File**: `src/app/staffadmin/finance/payments/page.tsx` (line 141)

**Problem**: Accessing `.length` and `[0]` on object `{ invoiceNumber: string }`

**Fix**: Check actual data structure - likely array expected but object returned

---

### 9. Event Form Toast Error (1 error)

**File**: `src/app/staffadmin/events/event-form.tsx` (line 94)

**Problem**: Error object passed to toast instead of string

**Fix**: Extract message from error object

```typescript
toast.error(typeof result === 'string' ? result : result._form?.[0] ?? 'Failed to create tag')
```

---

### 10. Ticket Validation Route (1 error)

**File**: `src/app/api/tickets/validate/route.ts` (line 78)

**Problem**: Comparing `"VOIDED"` with `"USED"` - types have no overlap

**Fix**: Review logic - likely incorrect status check

---

## Prevention Strategies

### Immediate Actions

1. **Add pre-commit hook** - Run `tsc --noEmit` before allowing commits

```bash
# .husky/pre-commit
cd apps/web && npx tsc --noEmit
```

2. **Add CI check** - GitHub Actions workflow

```yaml
# .github/workflows/typecheck.yml
name: TypeScript Check
on: [push, pull_request]
jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: cd apps/web && npx tsc --noEmit
```

3. **VS Code settings** - Enable TypeScript errors in Problems panel

```json
// .vscode/settings.json
{
  "typescript.tsdk": "apps/web/node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

### Development Practices

1. **Lock Stripe SDK version** in package.json:
```json
"stripe": "17.5.0"  // Pin exact version, not ^17.5.0
```

2. **Run type check after package updates**:
```bash
npm update && cd apps/web && npx tsc --noEmit
```

3. **Add npm script** for easy type checking:
```json
// apps/web/package.json
"scripts": {
  "typecheck": "tsc --noEmit",
  "precommit": "npm run typecheck && npm run lint"
}
```

4. **Update copilot-instructions.md** - Add mandatory type check step (already documented, but should be enforced)

---

## Fix Priority

| Priority | Category | Errors | Effort |
|----------|----------|--------|--------|
| 1 | Stripe API version | 4 | Low |
| 2 | StaffAdmin layout | 10 | Medium |
| 3 | Ticket PDF route | 13 | High |
| 4 | Location picker | 1 | Low |
| 5 | Wallet generators | 3 | Low |
| 6 | Email service | 1 | Low |
| 7 | Finance actions | 2 | Medium |
| 8 | Finance payments | 2 | Medium |
| 9 | Event form toast | 1 | Low |
| 10 | Ticket validation | 1 | Low |

---

## Checklist

- [ ] Fix Stripe API version (4 files)
- [ ] Fix staffadmin/layout.tsx role queries
- [ ] Fix tickets/pdf/route.ts property access
- [ ] Fix location picker type
- [ ] Fix wallet pass generators
- [ ] Fix email service null handling
- [ ] Fix finance actions
- [ ] Fix finance payments page
- [ ] Fix event form toast
- [ ] Fix ticket validation route
- [ ] Add pre-commit hook
- [ ] Add GitHub Actions workflow
- [ ] Update package.json scripts
- [ ] Verify build passes

---

## Related

- [copilot-instructions.md](../../.github/copilot-instructions.md) - TypeScript requirements section
