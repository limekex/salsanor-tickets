# RLS Implementation Status

## ✅ Completed: Schema Preparation (Steps 1 & 2)

### Changes Made
- **Order model**: Added `organizerId` (required), relation, and index on (organizerId, status)
- **AuditLog model**: Added `organizerId` (nullable), relation, and index on (organizerId, timestamp)
- **Migration 20260103191625**: Intelligent backfill from 4 sources
  1. CoursePeriod via periodId (primary source)
  2. Event via EventRegistration
  3. Membership table
  4. Registration via periodId (fallback)
- **Seed script**: Updated all test orders with organizerId and subtotalAfterDiscountCents

### Verification
```
✅ All 5 test orders have organizerId: d71c16cd-aef9-4768-810d-243bbf39b650
✅ All orders linked to organizer: SalsaNor Oslo (salsanor-oslo)
✅ subtotalAfterDiscountCents properly calculated for all orders
✅ Migration successfully applied to dev database
```

### Commits
- `9d5e168`: feat: Add organizerId to Order and AuditLog for RLS support
- `4c309e0`: fix: Improve onboarding UI and fix period creation bug

---

## 🎯 Next Steps: RLS Policy Implementation

### Tier 1: Critical Data (Money, PII, Access Control)
**Priority: HIGH** - Start with these tables

#### Tables Ready for RLS:
1. **Order** ✅ (has organizerId)
   - Policy: `organizerId = current_user_org()`
   - Roles: ADMIN, ORG_ADMIN, ORG_FINANCE
   
2. **Payment** ✅ (via Order.organizerId)
   - Policy: `orderId IN (SELECT id FROM Order WHERE organizerId = current_user_org())`
   - Roles: ADMIN, ORG_ADMIN, ORG_FINANCE
   
3. **Invoice** ✅ (via Order.organizerId)
   - Policy: Same as Payment
   - Roles: ADMIN, ORG_ADMIN, ORG_FINANCE
   
4. **Registration** ✅ (via CoursePeriod.organizerId)
   - Policy: `periodId IN (SELECT id FROM CoursePeriod WHERE organizerId = current_user_org())`
   - Roles: ADMIN, ORG_ADMIN, ORG_CHECKIN, INSTRUCTOR
   
5. **Membership** ✅ (has organizerId)
   - Policy: `organizerId = current_user_org()`
   - Roles: ADMIN, ORG_ADMIN, ORG_FINANCE
   
6. **UserAccountRole** (needs organizerId!)
   - Policy: `organizerId = current_user_org()`
   - Roles: ADMIN, ORG_ADMIN
   
7. **AuditLog** ✅ (has organizerId)
   - Policy: `organizerId = current_user_org() OR organizerId IS NULL`
   - Roles: ADMIN, ORG_ADMIN

8. **PersonProfile** (PII - needs careful policy)
   - Policy: Check if person has any relationship to current_user_org
   - Roles: All authenticated users (read own), ORG_ADMIN (read org members)

### Tier 2: Operational Data
**Priority: MEDIUM** - After Tier 1 is tested

1. **CoursePeriod** (has organizerId)
2. **CourseTrack** (via CoursePeriod)
3. **DiscountRule** (via CoursePeriod)
4. **Event** (has organizerId)
5. **EventRegistration** (via Event)
6. **WaitlistEntry** (via Registration → CoursePeriod)

### Tier 3: Platform-Wide Data
**Priority: LOW** - After Tier 1 & 2 are stable

1. **Organizer** (public read, admin write)
2. **PaymentConfig** (via Organizer)
3. **PlatformFee** (via Organizer)
4. **MembershipTier** (via Organizer)
5. **EmailTemplate** (via Organizer)
6. **UserAccount** (special case - user owns their own record)
7. **WebhookEvent** (ADMIN only)

---

## 📋 Implementation Checklist

### Before Enabling RLS:
- [x] Add organizerId to Order
- [x] Add organizerId to AuditLog
- [ ] Add organizerId to UserAccountRole
- [ ] Test all queries work with organizerId filters
- [ ] Create helper function: `current_user_org()` in Supabase
- [ ] Document RLS policy patterns

### For Each Table (Tier 1):
- [ ] Create SELECT policy for read access
- [ ] Create INSERT policy for create access
- [ ] Create UPDATE policy for modify access
- [ ] Create DELETE policy for remove access
- [ ] Test with different user roles (ADMIN, ORG_ADMIN, ORG_FINANCE, PARTICIPANT)
- [ ] Verify queries return only org-specific data
- [ ] Check performance (indexes on organizerId)

### Testing Strategy:
1. **Local Dev**: Test with multiple test organizers
2. **Stage**: Test with real user roles and permissions
3. **Production**: Enable for one table at a time, monitor errors

---

## 🔧 Helper Function Example

```sql
-- Create function to get current user's organizerId
CREATE OR REPLACE FUNCTION current_user_org()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT "organizerId" 
  FROM "UserAccountRole"
  WHERE "userId" = (
    SELECT id 
    FROM "UserAccount" 
    WHERE "supabaseUid" = auth.uid()
  )
  LIMIT 1;
$$;
```

---

## 📝 Policy Pattern Examples

### Order Table (read):
```sql
CREATE POLICY "Users can read their org's orders"
ON "Order"
FOR SELECT
TO authenticated
USING (
  "organizerId" = current_user_org()
  OR
  EXISTS (
    SELECT 1 FROM "UserAccountRole" uar
    JOIN "UserAccount" ua ON uar."userId" = ua.id
    WHERE ua."supabaseUid" = auth.uid()
    AND uar.role = 'ADMIN'
  )
);
```

### Registration Table (read):
```sql
CREATE POLICY "Users can read their org's registrations"
ON "Registration"
FOR SELECT
TO authenticated
USING (
  "periodId" IN (
    SELECT id FROM "CoursePeriod"
    WHERE "organizerId" = current_user_org()
  )
  OR
  EXISTS (
    SELECT 1 FROM "UserAccountRole" uar
    JOIN "UserAccount" ua ON uar."userId" = ua.id
    WHERE ua."supabaseUid" = auth.uid()
    AND uar.role = 'ADMIN'
  )
);
```

---

## ⚠️ Known Issues & Considerations

1. **UserAccountRole needs organizerId**: This is CRITICAL for RLS to work properly
2. **ADMIN role**: Should bypass all RLS (global access)
3. **Performance**: Ensure indexes on organizerId columns
4. **Nullable organizerId**: AuditLog allows NULL for platform-wide events
5. **Migration strategy**: One tier at a time, monitor for errors
6. **Rollback plan**: Keep RLS disabled until confident in policies

---

## 📊 Current Database State

### Dev Database:
- ✅ Migration applied: 20260103191625_add_organizer_id_for_rls
- ✅ All 21 orders backfilled with organizerId
- ✅ Seed data working correctly
- ✅ Relations verified (Order → Organizer)

### Next Database Actions:
1. Apply migration to **stage** database
2. Verify backfill works with production-like data
3. Test queries with organizerId filters
4. Create helper functions in Supabase
5. Apply migration to **production** during maintenance window
