# RLS Helper Functions and Policies (Session-Based)

This document contains SQL functions and policies for implementing Row-Level Security (RLS) using **server-set session variables** instead of JWT-based `auth.uid()`.

## Architecture Overview

**Why Session-Based RLS?**
- ✅ Works with Prisma's connection pooling
- ✅ No need for JWT in database connections
- ✅ Server controls security context explicitly
- ✅ RLS acts as "defense in depth" backup
- ✅ Easy to test and debug

**How It Works:**
1. Server identifies user's organizerId (from session/roles)
2. Server sets `app.organizer_id` via `set_config()` in transaction
3. RLS policies check against `current_setting('app.organizer_id')`
4. Database enforces isolation even if app has bugs

## Installation Instructions

Run these SQL statements in the Supabase SQL Editor in this order:

1. Helper functions first
2. Then RLS policies for each table

---

## Helper Functions

### 1. Get Current Organization ID (Session-Based)

This function returns the organizerId set by the server in the current session.

```sql
-- Drop if exists (for updates)
DROP FUNCTION IF EXISTS app_current_organizer_id();

-- Create function to get server-set organizerId
CREATE OR REPLACE FUNCTION app_current_organizer_id()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT nullif(current_setting('app.organizer_id', true), '');
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION app_current_organizer_id() TO postgres;
```

**Note:** The `true` parameter makes it return NULL if not set (no error).

### 2. Check if Session is Global Admin

This function returns true if the server has set the global admin flag.

```sql
-- Drop if exists
DROP FUNCTION IF EXISTS app_is_global_admin();

-- Create function to check server-set admin flag
CREATE OR REPLACE FUNCTION app_is_global_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT coalesce(
    nullif(current_setting('app.is_global_admin', true), '')::boolean,
    false
  );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION app_is_global_admin() TO postgres;
```

### 3. Get Current User ID (Session-Based)

Optional: If you need to track which specific user is making changes (for audit logs).

```sql
-- Drop if exists
DROP FUNCTION IF EXISTS app_current_user_id();

-- Create function to get server-set userId
CREATE OR REPLACE FUNCTION app_current_user_id()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT nullif(current_setting('app.user_id', true), '');
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION app_current_user_id() TO postgres;
```

---

## Server-Side: Setting Session Variables

### Prisma Transaction Pattern

```typescript
// Get user's organizerId from your auth system
const organizerId = await getUserOrgId(session);
const isAdmin = await isGlobalAdmin(session);

// Set session context and run queries in transaction
await prisma.$transaction(async (tx) => {
  // Set session variables
  await tx.$executeRawUnsafe(
    `SELECT set_config('app.organizer_id', $1, true)`,
    organizerId
  );
  
  await tx.$executeRawUnsafe(
    `SELECT set_config('app.is_global_admin', $1, true)`,
    isAdmin.toString()
  );

  // Optional: set user ID for audit
  await tx.$executeRawUnsafe(
    `SELECT set_config('app.user_id', $1, true)`,
    userId
  );

  // Now run your queries - RLS will enforce based on session
  const orders = await tx.order.findMany({
    where: { /* your filters */ }
  });

  return orders;
});
```

**Important:** The `true` parameter in `set_config()` means "transaction-local" - it resets after transaction ends.

---

## Tier 1 RLS Policies (Critical Data)

### Order Table

```sql
-- Enable RLS
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Server can read org orders" ON "Order";
DROP POLICY IF EXISTS "Server can create org orders" ON "Order";
DROP POLICY IF EXISTS "Server can update org orders" ON "Order";
DROP POLICY IF EXISTS "Admins can delete orders" ON "Order";

-- SELECT: Server can read orders from session organizerId or if global admin
CREATE POLICY "Server can read org orders"
ON "Order"
FOR SELECT
TO postgres
USING (
  app_is_global_admin()
  OR "organizerId" = app_current_organizer_id()
  OR "purchaserPersonId" IN (
    SELECT id FROM "PersonProfile"
    WHERE "userId" = (
      SELECT id FROM "UserAccount"
      WHERE "supabaseUid" = auth.uid()::text
    )
  )
);
-- CourseTrack: Public data, readable by authenticated users
ALTER TABLE "CourseTrack" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read tracks" ON "CourseTrack";

CREATE POLICY "Anyone can read tracks"
ON "CourseTrack"
FOR SELECT
TO postgres
USING (true);

-- Organizer: Public data, readable by authenticated users  
ALTER TABLE "Organizer" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read organizers" ON "Organizer";

CREATE POLICY "Anyone can read organizers"
ON "Organizer"
FOR SELECT
TO postgres
USING (true);

-- INSERT: Server can create orders for session organization
CREATE POLICY "Server can create org orders"
ON "Order"
FOR INSERT
TO postgres
WITH CHECK (
  app_is_global_admin()
  OR "organizerId" = app_current_organizer_id()
);

-- UPDATE: Server can update orders from session organization
CREATE POLICY "Server can update org orders"
ON "Order"
FOR UPDATE
TO postgres
USING (
  app_is_global_admin()
  OR "organizerId" = app_current_organizer_id()
)
WITH CHECK (
  app_is_global_admin()
  OR "organizerId" = app_current_organizer_id()
);

-- DELETE: Only global admins can delete orders
CREATE POLICY "Admins can delete orders"
ON "Order"
FOR DELETE
TO postgres
USING (app_is_global_admin());
```

### Payment Table

```sql
-- Enable RLS
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Server can read org payments" ON "Payment";
DROP POLICY IF EXISTS "Server can create org payments" ON "Payment";
DROP POLICY IF EXISTS "Server can update org payments" ON "Payment";

-- SELECT: Server can read payments for orders from session organization
CREATE POLICY "Server can read org payments"
ON "Payment"
FOR SELECT
TO postgres
USING (
  app_is_global_admin()
  OR "orderId" IN (
    SELECT id FROM "Order" 
    WHERE "organizerId" = app_current_organizer_id()
  )
);

-- INSERT: Server can create payments for session organization's orders
CREATE POLICY "Server can create org payments"
ON "Payment"
FOR INSERT
TO postgres
WITH CHECK (
  app_is_global_admin()
  OR "orderId" IN (
    SELECT id FROM "Order" 
    WHERE "organizerId" = app_current_organizer_id()
  )
);

-- UPDATE: Server can update payments from session organization
CREATE POLICY "Server can update org payments"
ON "Payment"
FOR UPDATE
TO postgres
USING (
  app_is_global_admin()
  OR "orderId" IN (
    SELECT id FROM "Order" 
    WHERE "organizerId" = app_current_organizer_id()
  )
)
WITH CHECK (
  app_is_global_admin()
  OR "orderId" IN (
    SELECT id FROM "Order" 
    WHERE "organizerId" = app_current_organizer_id()
  )
);
```

### Invoice Table

```sql
-- Enable RLS
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Server can read org invoices" ON "Invoice";
DROP POLICY IF EXISTS "Server can create org invoices" ON "Invoice";

-- SELECT: Server can read invoices for orders from session organization
CREATE POLICY "Server can read org invoices"
ON "Invoice"
FOR SELECT
TO postgres
USING (
  app_is_global_admin()
  OR "orderId" IN (
    SELECT id FROM "Order" 
    WHERE "organizerId" = app_current_organizer_id()
  )
);

-- INSERT: Server can create invoices for session organization
CREATE POLICY "Server can create org invoices"
ON "Invoice"
FOR INSERT
TO postgres
WITH CHECK (
  app_is_global_admin()
  OR "orderId" IN (
    SELECT id FROM "Order" 
    WHERE "organizerId" = app_current_organizer_id()
  )
);
```

### CreditNote Table

```sql
-- Enable RLS
ALTER TABLE "CreditNote" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Server can read org credit notes" ON "CreditNote";
DROP POLICY IF EXISTS "Server can create org credit notes" ON "CreditNote";
DROP POLICY IF EXISTS "Server can update org credit notes" ON "CreditNote";

-- SELECT: Server can read credit notes from session organization
-- Users can also read their own credit notes (via registration/order)
CREATE POLICY "Server can read org credit notes"
ON "CreditNote"
FOR SELECT
TO postgres
USING (
  app_is_global_admin()
  OR "organizerId" = app_current_organizer_id()
  OR "orderId" IN (
    SELECT id FROM "Order"
    WHERE "purchaserPersonId" IN (
      SELECT id FROM "PersonProfile"
      WHERE "userId" = (
        SELECT id FROM "UserAccount"
        WHERE "supabaseUid" = auth.uid()::text
      )
    )
  )
);

-- INSERT: Server can create credit notes for session organization
CREATE POLICY "Server can create org credit notes"
ON "CreditNote"
FOR INSERT
TO postgres
WITH CHECK (
  app_is_global_admin()
  OR "organizerId" = app_current_organizer_id()
);

-- UPDATE: Server can update credit notes from session organization
CREATE POLICY "Server can update org credit notes"
ON "CreditNote"
FOR UPDATE
TO postgres
USING (
  app_is_global_admin()
  OR "organizerId" = app_current_organizer_id()
)
WITH CHECK (
  app_is_global_admin()
  OR "organizerId" = app_current_organizer_id()
);
```

### CoursePeriod Table

```sql
-- Enable RLS
ALTER TABLE "CoursePeriod" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Server can read org periods" ON "CoursePeriod";
DROP POLICY IF EXISTS "Server can manage org periods" ON "CoursePeriod";

-- SELECT: Server can read periods from session organization or periods with user's registrations
CREATE POLICY "Server can read org periods"
ON "CoursePeriod"
FOR SELECT
TO postgres
USING (
  app_is_global_admin()
  OR "organizerId" = app_current_organizer_id()
  OR id IN (
    SELECT "periodId" FROM "Registration"
    WHERE "orderId" IN (
      SELECT id FROM "Order"
      WHERE "purchaserPersonId" IN (
        SELECT id FROM "PersonProfile"
        WHERE "userId" = (
          SELECT id FROM "UserAccount"
          WHERE "supabaseUid" = auth.uid()::text
        )
      )
    )
  )
);

-- INSERT/UPDATE/DELETE: Server can manage periods for session organization
CREATE POLICY "Server can manage org periods"
ON "CoursePeriod"
FOR ALL
TO postgres
USING (
  app_is_global_admin()
  OR "organizerId" = app_current_organizer_id()
)
WITH CHECK (
  app_is_global_admin()
  OR "organizerId" = app_current_organizer_id()
);
```

### Registration Table

```sql
-- Enable RLS
ALTER TABLE "Registration" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Server can read org registrations" ON "Registration";
DROP POLICY IF EXISTS "Server can manage org registrations" ON "Registration";

-- SELECT: Server can read registrations from session organization's periods or from own orders
CREATE POLICY "Server can read org registrations"
ON "Registration"
FOR SELECT
TO postgres
USING (
  app_is_global_admin()
  OR "periodId" IN (
    SELECT id FROM "CoursePeriod"
    WHERE "organizerId" = app_current_organizer_id()
  )
  OR "orderId" IN (
    SELECT id FROM "Order"
    WHERE "purchaserPersonId" IN (
      SELECT id FROM "PersonProfile"
      WHERE "userId" = (
        SELECT id FROM "UserAccount"
        WHERE "supabaseUid" = auth.uid()::text
      )
    )
  )
);

-- INSERT/UPDATE/DELETE: Server can manage registrations
CREATE POLICY "Server can manage org registrations"
ON "Registration"
FOR ALL
TO postgres
USING (
  app_is_global_admin()
  OR "periodId" IN (
    SELECT id FROM "CoursePeriod"
    WHERE "organizerId" = app_current_organizer_id()
  )
)
WITH CHECK (
  app_is_global_admin()
  OR "periodId" IN (
    SELECT id FROM "CoursePeriod"
    WHERE "organizerId" = app_current_organizer_id()
  )
);
```

### Membership Table

```sql
-- Enable RLS
ALTER TABLE "Membership" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Server can read org memberships" ON "Membership";
DROP POLICY IF EXISTS "Server can manage org memberships" ON "Membership";

-- SELECT: Server can read memberships from session organization
CREATE POLICY "Server can read org memberships"
ON "Membership"
FOR SELECT
TO postgres
USING (
  app_is_global_admin()
  OR "organizerId" = app_current_organizer_id()
);

-- INSERT/UPDATE/DELETE: Server can manage memberships
CREATE POLICY "Server can manage org memberships"
ON "Membership"
FOR ALL
TO postgres
USING (
  app_is_global_admin()
  OR "organizerId" = app_current_organizer_id()
)
WITH CHECK (
  app_is_global_admin()
  OR "organizerId" = app_current_organizer_id()
);
```

---

## Testing Queries

### Test 1: Verify Helper Functions

```sql
-- Test as authenticated user (replace with actual Supabase UID)
SELECT 
  current_user_org() as my_org,
  is_global_admin() as is_admin;

-- Test getting all org IDs
SELECT * FROM user_org_ids();
```

### Test 2: Test Order Access

```sql
-- This should only return orders from your organization
SELECT 
  id, 
  status, 
  "organizerId",
  "totalCents"
FROM "Order"
LIMIT 10;

-- Count orders (should match your org's order count)
SELECT COUNT(*) FROM "Order";
```

### Test 3: Test Cross-Organization Isolation

```sql
-- As SalsaNor Oslo admin, this should return 0 for Bergen Salsa Club orders
SELECT COUNT(*) 
FROM "Order"
WHERE "organizerId" = (
  SELECT id FROM "Organizer" WHERE slug = 'bergen-salsa-club'
);
```

### Test 4: Test Registration Access

```sql
-- Should only see registrations from your org's periods
SELECT 
  r.id,
  r.status,
  cp."organizerId",
  cp.name as period_name
FROM "Registration" r
JOIN "CoursePeriod" cp ON r."periodId" = cp.id
LIMIT 10;
```

---

## Rollback Instructions

If you need to disable RLS temporarily:

```sql
-- Disable RLS on all Tier 1 tables
ALTER TABLE "Order" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Registration" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Membership" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" DISABLE ROW LEVEL SECURITY;
```

To re-enable:

```sql
-- Re-enable RLS
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Registration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
```

---

## Performance Considerations

1. **Indexes**: Ensure all organizerId columns have indexes (already done in migration)
2. **Function Cost**: Helper functions use `STABLE` and `SECURITY DEFINER` for optimal performance
3. **Policy Complexity**: Policies use EXISTS and IN subqueries which PostgreSQL optimizes well
4. **Monitoring**: Track query performance after enabling RLS

---

## Security Notes

1. **Service Role**: Backend operations (webhooks, cron jobs) should use `service_role` key to bypass RLS
2. **User Context**: RLS policies use `auth.uid()` to identify the current user
3. **Multiple Orgs**: Helper functions support users with roles in multiple organizations
4. **Global Admin**: ADMIN role bypasses all organization-specific restrictions
5. **Audit Logging**: Platform-wide audit logs (organizerId IS NULL) only visible to global admins

---

## Next Steps

### ✅ Tier 1 Complete (Development Database)

1. ✅ Run helper function creation in Supabase SQL Editor (dev database)
2. ✅ Test helper functions with different user accounts
3. ✅ Enable RLS for Order table (4 policies: SELECT/INSERT/UPDATE/DELETE)
4. ✅ Test Order queries with different roles (org admin, finance, participant)
5. ✅ Verify isolation (SalsaNor Oslo admin can't see Bergen orders)
6. ✅ Enable RLS for CoursePeriod table (2 policies: SELECT/ALL)
7. ✅ Enable RLS for Registration table (2 policies: SELECT/ALL)
8. ✅ Enable RLS for Payment table (3 policies: SELECT/INSERT/UPDATE)
9. ✅ Enable RLS for Invoice table (2 policies: SELECT/INSERT)
10. ✅ Enable RLS for Membership table (2 policies: SELECT/ALL)

### ⏭️ Next: Stage & Production Deployment

11. ⏭️ Test membership pages with different org admins
12. ⏭️ Review all Tier 1 isolation with comprehensive testing
13. ⏭️ Apply to stage database (run all SQL from this doc)
14. ⏭️ Test stage environment thoroughly
15. ⏭️ Apply to production (with maintenance window)
16. ⏭️ Plan Tier 2 rollout (Track, Ticket, EventRegistration, etc.)

---

## Tier 2 RLS Policies (Events, Categories, Tags)

### Category Table (Global - Admin Only)

```sql
-- Enable RLS
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read categories" ON "Category";
DROP POLICY IF EXISTS "Admins can manage categories" ON "Category";

-- SELECT: Anyone can read categories (needed for filtering)
CREATE POLICY "Anyone can read categories"
ON "Category"
FOR SELECT
TO postgres
USING (true);

-- INSERT/UPDATE/DELETE: Only global admins can manage categories
CREATE POLICY "Admins can manage categories"
ON "Category"
FOR ALL
TO postgres
USING (app_is_global_admin())
WITH CHECK (app_is_global_admin());
```

---

### Tag Table (Per-Organizer)

```sql
-- Enable RLS
ALTER TABLE "Tag" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read tags" ON "Tag";
DROP POLICY IF EXISTS "Org admins can manage tags" ON "Tag";

-- SELECT: Anyone can read tags (needed for public event/period listings)
CREATE POLICY "Anyone can read tags"
ON "Tag"
FOR SELECT
TO postgres
USING (true);

-- INSERT/UPDATE/DELETE: Org admins can manage their organization's tags
CREATE POLICY "Org admins can manage tags"
ON "Tag"
FOR ALL
TO postgres
USING (
  app_is_global_admin()
  OR "organizerId" = app_current_organizer_id()
)
WITH CHECK (
  app_is_global_admin()
  OR "organizerId" = app_current_organizer_id()
);
```

---

### Event Table

```sql
-- Enable RLS
ALTER TABLE "Event" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read published events" ON "Event";
DROP POLICY IF EXISTS "Org admins can read org events" ON "Event";
DROP POLICY IF EXISTS "Org admins can manage events" ON "Event";

-- SELECT: Anyone can read published events, org admins can read all their events
CREATE POLICY "Anyone can read published events"
ON "Event"
FOR SELECT
TO postgres
USING (
  app_is_global_admin()
  OR "published" = true
  OR "organizerId" = app_current_organizer_id()
);

-- INSERT/UPDATE/DELETE: Org admins can manage their organization's events
CREATE POLICY "Org admins can manage events"
ON "Event"
FOR ALL
TO postgres
USING (
  app_is_global_admin()
  OR "organizerId" = app_current_organizer_id()
)
WITH CHECK (
  app_is_global_admin()
  OR "organizerId" = app_current_organizer_id()
);
```

---

### EventSession Table (for recurring events)

```sql
-- Enable RLS
ALTER TABLE "EventSession" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read event sessions" ON "EventSession";
DROP POLICY IF EXISTS "Org admins can manage event sessions" ON "EventSession";

-- SELECT: Anyone can read sessions for published events
CREATE POLICY "Anyone can read event sessions"
ON "EventSession"
FOR SELECT
TO postgres
USING (
  app_is_global_admin()
  OR "eventId" IN (
    SELECT id FROM "Event"
    WHERE "published" = true
    OR "organizerId" = app_current_organizer_id()
  )
);

-- INSERT/UPDATE/DELETE: Org admins can manage sessions for their events
CREATE POLICY "Org admins can manage event sessions"
ON "EventSession"
FOR ALL
TO postgres
USING (
  app_is_global_admin()
  OR "eventId" IN (
    SELECT id FROM "Event"
    WHERE "organizerId" = app_current_organizer_id()
  )
)
WITH CHECK (
  app_is_global_admin()
  OR "eventId" IN (
    SELECT id FROM "Event"
    WHERE "organizerId" = app_current_organizer_id()
  )
);
```

---

### EventRegistration Table

```sql
-- Enable RLS
ALTER TABLE "EventRegistration" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Server can read event registrations" ON "EventRegistration";
DROP POLICY IF EXISTS "Server can manage event registrations" ON "EventRegistration";

-- SELECT: Org admins can read their event registrations, users can read their own
CREATE POLICY "Server can read event registrations"
ON "EventRegistration"
FOR SELECT
TO postgres
USING (
  app_is_global_admin()
  OR "eventId" IN (
    SELECT id FROM "Event"
    WHERE "organizerId" = app_current_organizer_id()
  )
  OR "orderId" IN (
    SELECT id FROM "Order"
    WHERE "purchaserPersonId" IN (
      SELECT id FROM "PersonProfile"
      WHERE "userId" = (
        SELECT id FROM "UserAccount"
        WHERE "supabaseUid" = auth.uid()::text
      )
    )
  )
);

-- INSERT/UPDATE/DELETE: Server can manage event registrations
CREATE POLICY "Server can manage event registrations"
ON "EventRegistration"
FOR ALL
TO postgres
USING (
  app_is_global_admin()
  OR "eventId" IN (
    SELECT id FROM "Event"
    WHERE "organizerId" = app_current_organizer_id()
  )
)
WITH CHECK (
  app_is_global_admin()
  OR "eventId" IN (
    SELECT id FROM "Event"
    WHERE "organizerId" = app_current_organizer_id()
  )
);
```

---

### EventTicket Table

```sql
-- Enable RLS
ALTER TABLE "EventTicket" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own event tickets" ON "EventTicket";
DROP POLICY IF EXISTS "Org admins can read event tickets" ON "EventTicket";
DROP POLICY IF EXISTS "Server can manage event tickets" ON "EventTicket";

-- SELECT: Users can read their own tickets, org admins can read their event tickets
CREATE POLICY "Users can read event tickets"
ON "EventTicket"
FOR SELECT
TO postgres
USING (
  app_is_global_admin()
  OR "eventId" IN (
    SELECT id FROM "Event"
    WHERE "organizerId" = app_current_organizer_id()
  )
  OR "personId" IN (
    SELECT id FROM "PersonProfile"
    WHERE "userId" = (
      SELECT id FROM "UserAccount"
      WHERE "supabaseUid" = auth.uid()::text
    )
  )
);

-- INSERT/UPDATE/DELETE: Server can manage event tickets
CREATE POLICY "Server can manage event tickets"
ON "EventTicket"
FOR ALL
TO postgres
USING (
  app_is_global_admin()
  OR "eventId" IN (
    SELECT id FROM "Event"
    WHERE "organizerId" = app_current_organizer_id()
  )
)
WITH CHECK (
  app_is_global_admin()
  OR "eventId" IN (
    SELECT id FROM "Event"
    WHERE "organizerId" = app_current_organizer_id()
  )
);
```
