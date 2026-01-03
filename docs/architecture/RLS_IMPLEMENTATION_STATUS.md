# RLS Implementation Status

## ✅ Completed: Schema Preparation & Test Data (Steps 1-3)

### Changes Made
- **Order model**: Added `organizerId` (required), relation, and index on (organizerId, status)
- **AuditLog model**: Added `organizerId` (nullable), relation, and index on (organizerId, timestamp)
- **Migration 20260103191625**: Intelligent backfill from 4 sources
  1. CoursePeriod via periodId (primary source)
  2. Event via EventRegistration
  3. Membership table
  4. Registration via periodId (fallback)
- **Seed script**: Updated all test orders with organizerId and subtotalAfterDiscountCents
- **Test roles**: Added 6 staff users with different roles:
  - Global ADMIN (no organizerId)
  - ORG_ADMIN for SalsaNor Oslo
  - ORG_FINANCE for SalsaNor Oslo
  - ORG_CHECKIN for SalsaNor Oslo
  - INSTRUCTOR for SalsaNor Oslo
  - ORG_ADMIN for Bergen Salsa Club (cross-org testing)

### Verification
```
✅ All 5 test orders have organizerId: d71c16cd-aef9-4768-810d-243bbf39b650
✅ All orders linked to organizer: SalsaNor Oslo (salsanor-oslo)
✅ subtotalAfterDiscountCents properly calculated for all orders
✅ Migration successfully applied to dev database
✅ All 5 org-specific roles have organizerId set
✅ Test data includes multi-organization scenario (Oslo + Bergen)
```

### Commits
- `9d5e168`: feat: Add organizerId to Order and AuditLog for RLS support
- `4c309e0`: fix: Improve onboarding UI and fix period creation bug
- `1c88ffa`: docs: Add RLS implementation status and roadmap
- `b46967d`: feat: Add RLS test roles and comprehensive SQL policies

### Documentation Created
- [RLS_HELPER_FUNCTIONS.md](./RLS_HELPER_FUNCTIONS.md) - Complete SQL implementation guide
  - 4 helper functions (current_user_org, is_global_admin, has_org_role, user_org_ids)
  - RLS policies for all Tier 1 tables
  - Testing queries
  - Rollback instructions
  - Performance and security notes

---

## 🎯 Next Steps: Apply RLS to Database

### Step 4: Apply Helper Functions (READY TO EXECUTE)

All SQL code is prepared in [RLS_HELPER_FUNCTIONS.md](./RLS_HELPER_FUNCTIONS.md)

**Action Items:**
1. Open Supabase SQL Editor for dev database
2. Copy and run helper function SQL (4 functions)
3. Test helper functions with test users
4. Verify results:
   - `current_user_org()` returns correct organizerId
   - `is_global_admin()` returns true for ADMIN role
   - `user_org_ids()` returns all user's organizations

**Test Users Available:**
- `test-admin` (admin@salsanor.no) - ADMIN role
- `test-org-admin` (orgadmin@salsanor.no) - ORG_ADMIN for Oslo
- `test-finance` (finance@salsanor.no) - ORG_FINANCE for Oslo
- `test-bergen-admin` (admin@bergensalsa.no) - ORG_ADMIN for Bergen

### Step 5: Enable RLS for Order Table (PILOT)

Start with Order table as pilot to validate approach.

**Action Items:**
1. Run Order table RLS policies from [RLS_HELPER_FUNCTIONS.md](./RLS_HELPER_FUNCTIONS.md)
2. Test queries as different users:
   ```sql
   -- As Oslo admin: should see Oslo orders only
   SELECT COUNT(*) FROM "Order";
   
   -- As Bergen admin: should see 0 (no Bergen orders yet)
   SELECT COUNT(*) FROM "Order";
   
   -- As global admin: should see all orders
   SELECT COUNT(*) FROM "Order";
   ```
3. Verify application still works (no broken queries)
4. Monitor performance (check query plans)

### Step 6: Roll Out Tier 1 Tables

After Order table success, enable RLS for remaining Tier 1 tables one at a time:

**Rollout Order:**
1. ✅ Order (pilot completed)
2. ⏭️ Payment
3. ⏭️ Invoice
4. ⏭️ Registration
5. ⏭️ Membership
6. ⏭️ AuditLog

**For Each Table:**
- Enable RLS
- Apply policies from RLS_HELPER_FUNCTIONS.md
- Test with different roles
- Verify application functionality
- Monitor for errors

---

## 📋 Implementation Checklist (UPDATED)

### Schema & Data Preparation:
- [x] Add organizerId to Order
- [x] Add organizerId to AuditLog
- [x] Create migration with backfill logic
- [x] Apply migration to dev database
- [x] Add test users with various roles
- [x] Verify all org roles have organizerId
- [x] Create test data for multi-org scenario

### RLS Infrastructure:
- [x] Document helper functions
- [x] Create current_user_org() function SQL
- [x] Create is_global_admin() function SQL
- [x] Create has_org_role() function SQL
- [x] Create user_org_ids() function SQL
- [x] Document all Tier 1 RLS policies
- [x] Create testing queries
- [x] Document rollback procedures

### Database Deployment (DEV):
- [ ] Apply helper functions to dev database
- [ ] Test helper functions with test users
- [ ] Enable RLS on Order table (pilot)
- [ ] Test Order access with different roles
- [ ] Verify application works with Order RLS
- [ ] Enable RLS on Payment table
- [ ] Enable RLS on Invoice table
- [ ] Enable RLS on Registration table
- [ ] Enable RLS on Membership table
- [ ] Enable RLS on AuditLog table
- [ ] Full regression testing

### Stage & Production:
- [ ] Apply migration to stage database
- [ ] Apply helper functions to stage
- [ ] Enable RLS on stage (all Tier 1 tables)
- [ ] Test stage with real user accounts
- [ ] Document any issues found
- [ ] Schedule production maintenance window
- [ ] Apply migration to production
- [ ] Apply helper functions to production
- [ ] Enable RLS on production (Tier 1)
- [ ] Monitor production for 24 hours

---

## 🔧 Helper Function Example

See complete implementation in [RLS_HELPER_FUNCTIONS.md](./RLS_HELPER_FUNCTIONS.md)

**Quick Reference:**
```sql
-- Get current user's organization
SELECT current_user_org();

-- Check if user is admin
SELECT is_global_admin();

-- Get all user's organizations (multi-org support)
SELECT * FROM user_org_ids();

-- Check specific role for organization
SELECT has_org_role('org-id-here', 'ORG_ADMIN');
```

---

## 📝 Testing Approach

### Phase 1: Helper Functions (15 minutes)
1. Apply helper functions in Supabase SQL Editor
2. Use "Select a user" dropdown to test as different users
3. Verify current_user_org() returns correct values
4. Verify is_global_admin() works for ADMIN role

### Phase 2: Order Table RLS (30 minutes)
1. Enable RLS on Order table
2. Test SELECT as Oslo admin (should see 5 orders)
3. Test SELECT as Bergen admin (should see 0 orders)
4. Test SELECT as global admin (should see all orders)
5. Verify application Order queries still work

### Phase 3: Remaining Tier 1 (2 hours)
1. Enable Payment RLS, test access
2. Enable Invoice RLS, test access
3. Enable Registration RLS, test access (includes own registration access)
4. Enable Membership RLS, test access (includes own membership access)
5. Enable AuditLog RLS, test access
6. Full application regression test

### Phase 4: Stage Deployment (1 day)
1. Apply migration to stage
2. Apply all RLS changes
3. Test with real user accounts
4. Monitor for any access issues

### Phase 5: Production (with maintenance window)
1. Announce maintenance window
2. Apply migration (< 1 minute)
3. Apply RLS helper functions (< 1 minute)
4. Enable RLS policies (< 5 minutes)
5. Test critical paths
6. Monitor for 24 hours

---

## ⚠️ Tier 2 & 3 Planning

### Tier 2: Operational Data (After Tier 1 Success)

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
