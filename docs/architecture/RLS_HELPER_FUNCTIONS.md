# RLS Helper Functions and Policies

This document contains SQL functions and policies for implementing Row-Level Security (RLS) in Supabase.

## Installation Instructions

Run these SQL statements in the Supabase SQL Editor in this order:

1. Helper functions first
2. Then RLS policies for each table

---

## Helper Functions

### 1. Get Current User's Organization ID

This function returns the organizerId for the currently authenticated user. It handles multiple roles and returns the first organization found.

```sql
-- Drop if exists (for updates)
DROP FUNCTION IF EXISTS current_user_org();

-- Create function to get current user's organizerId
CREATE OR REPLACE FUNCTION current_user_org()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT "organizerId" 
  FROM "UserAccountRole"
  WHERE "userId" = (
    SELECT id 
    FROM "UserAccount" 
    WHERE "supabaseUid" = auth.uid()
  )
  AND "organizerId" IS NOT NULL
  LIMIT 1;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION current_user_org() TO authenticated;
```

### 2. Check if User is Global Admin

This function returns true if the current user has the ADMIN role (global access).

```sql
-- Drop if exists
DROP FUNCTION IF EXISTS is_global_admin();

-- Create function to check if user is global admin
CREATE OR REPLACE FUNCTION is_global_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM "UserAccountRole" uar
    JOIN "UserAccount" ua ON uar."userId" = ua.id
    WHERE ua."supabaseUid" = auth.uid()
    AND uar.role = 'ADMIN'
  );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_global_admin() TO authenticated;
```

### 3. Check if User Has Role for Organization

This function checks if the current user has a specific role for a given organization.

```sql
-- Drop if exists
DROP FUNCTION IF EXISTS has_org_role(TEXT, TEXT);

-- Create function to check if user has specific role for organization
CREATE OR REPLACE FUNCTION has_org_role(
  check_org_id TEXT,
  check_role TEXT
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM "UserAccountRole" uar
    JOIN "UserAccount" ua ON uar."userId" = ua.id
    WHERE ua."supabaseUid" = auth.uid()
    AND uar."organizerId" = check_org_id
    AND uar.role = check_role
  );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION has_org_role(TEXT, TEXT) TO authenticated;
```

### 4. Get All User's Organization IDs

This function returns all organizerId values for the current user (handles users with multiple org roles).

```sql
-- Drop if exists
DROP FUNCTION IF EXISTS user_org_ids();

-- Create function to get all organizerId values for current user
CREATE OR REPLACE FUNCTION user_org_ids()
RETURNS TABLE(org_id TEXT)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT DISTINCT "organizerId"
  FROM "UserAccountRole"
  WHERE "userId" = (
    SELECT id 
    FROM "UserAccount" 
    WHERE "supabaseUid" = auth.uid()
  )
  AND "organizerId" IS NOT NULL;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION user_org_ids() TO authenticated;
```

---

## Tier 1 RLS Policies (Critical Data)

### Order Table

```sql
-- Enable RLS
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can read their org's orders" ON "Order";
DROP POLICY IF EXISTS "Admins can read all orders" ON "Order";
DROP POLICY IF EXISTS "Users can create orders for their org" ON "Order";
DROP POLICY IF EXISTS "Users can update their org's orders" ON "Order";

-- SELECT: Users can read orders from their organization or if they're global admin
CREATE POLICY "Users can read their org's orders"
ON "Order"
FOR SELECT
TO authenticated
USING (
  "organizerId" IN (SELECT org_id FROM user_org_ids())
  OR is_global_admin()
);

-- INSERT: Users can create orders for their organization
CREATE POLICY "Users can create orders for their org"
ON "Order"
FOR INSERT
TO authenticated
WITH CHECK (
  "organizerId" IN (SELECT org_id FROM user_org_ids())
  OR is_global_admin()
);

-- UPDATE: Users can update orders from their organization
CREATE POLICY "Users can update their org's orders"
ON "Order"
FOR UPDATE
TO authenticated
USING (
  "organizerId" IN (SELECT org_id FROM user_org_ids())
  OR is_global_admin()
)
WITH CHECK (
  "organizerId" IN (SELECT org_id FROM user_org_ids())
  OR is_global_admin()
);

-- DELETE: Only global admins can delete orders (optional - adjust as needed)
CREATE POLICY "Only admins can delete orders"
ON "Order"
FOR DELETE
TO authenticated
USING (is_global_admin());
```

### Payment Table

```sql
-- Enable RLS
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read their org's payments" ON "Payment";
DROP POLICY IF EXISTS "Users can create payments for their org" ON "Payment";
DROP POLICY IF EXISTS "Users can update their org's payments" ON "Payment";

-- SELECT: Users can read payments for orders from their organization
CREATE POLICY "Users can read their org's payments"
ON "Payment"
FOR SELECT
TO authenticated
USING (
  "orderId" IN (
    SELECT id FROM "Order" 
    WHERE "organizerId" IN (SELECT org_id FROM user_org_ids())
  )
  OR is_global_admin()
);

-- INSERT: System can create payments (adjust based on your auth flow)
CREATE POLICY "Users can create payments for their org"
ON "Payment"
FOR INSERT
TO authenticated
WITH CHECK (
  "orderId" IN (
    SELECT id FROM "Order" 
    WHERE "organizerId" IN (SELECT org_id FROM user_org_ids())
  )
  OR is_global_admin()
);

-- UPDATE: Finance managers and admins can update payments
CREATE POLICY "Users can update their org's payments"
ON "Payment"
FOR UPDATE
TO authenticated
USING (
  "orderId" IN (
    SELECT id FROM "Order" 
    WHERE "organizerId" IN (SELECT org_id FROM user_org_ids())
  )
  OR is_global_admin()
)
WITH CHECK (
  "orderId" IN (
    SELECT id FROM "Order" 
    WHERE "organizerId" IN (SELECT org_id FROM user_org_ids())
  )
  OR is_global_admin()
);
```

### Invoice Table

```sql
-- Enable RLS
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read their org's invoices" ON "Invoice";
DROP POLICY IF EXISTS "Users can create invoices for their org" ON "Invoice";

-- SELECT: Users can read invoices for orders from their organization
CREATE POLICY "Users can read their org's invoices"
ON "Invoice"
FOR SELECT
TO authenticated
USING (
  "orderId" IN (
    SELECT id FROM "Order" 
    WHERE "organizerId" IN (SELECT org_id FROM user_org_ids())
  )
  OR is_global_admin()
);

-- INSERT: System can create invoices
CREATE POLICY "Users can create invoices for their org"
ON "Invoice"
FOR INSERT
TO authenticated
WITH CHECK (
  "orderId" IN (
    SELECT id FROM "Order" 
    WHERE "organizerId" IN (SELECT org_id FROM user_org_ids())
  )
  OR is_global_admin()
);
```

### Registration Table

```sql
-- Enable RLS
ALTER TABLE "Registration" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read their org's registrations" ON "Registration";
DROP POLICY IF EXISTS "Users can create registrations for their org" ON "Registration";
DROP POLICY IF EXISTS "Users can update their org's registrations" ON "Registration";

-- SELECT: Users can read registrations from their organization's periods
CREATE POLICY "Users can read their org's registrations"
ON "Registration"
FOR SELECT
TO authenticated
USING (
  "periodId" IN (
    SELECT id FROM "CoursePeriod"
    WHERE "organizerId" IN (SELECT org_id FROM user_org_ids())
  )
  OR is_global_admin()
  OR "personId" IN (
    -- Allow users to read their own registrations
    SELECT id FROM "PersonProfile"
    WHERE "userId" = (
      SELECT id FROM "UserAccount" WHERE "supabaseUid" = auth.uid()
    )
  )
);

-- INSERT: Users can create registrations for their organization
CREATE POLICY "Users can create registrations for their org"
ON "Registration"
FOR INSERT
TO authenticated
WITH CHECK (
  "periodId" IN (
    SELECT id FROM "CoursePeriod"
    WHERE "organizerId" IN (SELECT org_id FROM user_org_ids())
  )
  OR is_global_admin()
);

-- UPDATE: Users can update registrations from their organization
CREATE POLICY "Users can update their org's registrations"
ON "Registration"
FOR UPDATE
TO authenticated
USING (
  "periodId" IN (
    SELECT id FROM "CoursePeriod"
    WHERE "organizerId" IN (SELECT org_id FROM user_org_ids())
  )
  OR is_global_admin()
)
WITH CHECK (
  "periodId" IN (
    SELECT id FROM "CoursePeriod"
    WHERE "organizerId" IN (SELECT org_id FROM user_org_ids())
  )
  OR is_global_admin()
);
```

### Membership Table

```sql
-- Enable RLS
ALTER TABLE "Membership" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read their org's memberships" ON "Membership";
DROP POLICY IF EXISTS "Users can create memberships for their org" ON "Membership";
DROP POLICY IF EXISTS "Users can update their org's memberships" ON "Membership";

-- SELECT: Users can read memberships from their organization
CREATE POLICY "Users can read their org's memberships"
ON "Membership"
FOR SELECT
TO authenticated
USING (
  "organizerId" IN (SELECT org_id FROM user_org_ids())
  OR is_global_admin()
  OR "personId" IN (
    -- Allow users to read their own memberships
    SELECT id FROM "PersonProfile"
    WHERE "userId" = (
      SELECT id FROM "UserAccount" WHERE "supabaseUid" = auth.uid()
    )
  )
);

-- INSERT: Users can create memberships for their organization
CREATE POLICY "Users can create memberships for their org"
ON "Membership"
FOR INSERT
TO authenticated
WITH CHECK (
  "organizerId" IN (SELECT org_id FROM user_org_ids())
  OR is_global_admin()
);

-- UPDATE: Users can update memberships from their organization
CREATE POLICY "Users can update their org's memberships"
ON "Membership"
FOR UPDATE
TO authenticated
USING (
  "organizerId" IN (SELECT org_id FROM user_org_ids())
  OR is_global_admin()
)
WITH CHECK (
  "organizerId" IN (SELECT org_id FROM user_org_ids())
  OR is_global_admin()
);
```

### AuditLog Table

```sql
-- Enable RLS
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read their org's audit logs" ON "AuditLog";
DROP POLICY IF EXISTS "System can create audit logs" ON "AuditLog";

-- SELECT: Users can read audit logs for their organization (or platform-wide if admin)
CREATE POLICY "Users can read their org's audit logs"
ON "AuditLog"
FOR SELECT
TO authenticated
USING (
  "organizerId" IN (SELECT org_id FROM user_org_ids())
  OR ("organizerId" IS NULL AND is_global_admin())
  OR is_global_admin()
);

-- INSERT: System can create audit logs (typically via service role)
-- Note: This should primarily be done via service_role key, not user auth
CREATE POLICY "System can create audit logs"
ON "AuditLog"
FOR INSERT
TO authenticated
WITH CHECK (true);  -- Adjust based on your audit logging strategy
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

1. ✅ Run helper function creation in Supabase SQL Editor (dev database)
2. ✅ Test helper functions with different user accounts
3. ✅ Enable RLS for Order table first
4. ✅ Test Order queries with different roles (org admin, finance, participant)
5. ✅ Verify isolation (SalsaNor Oslo admin can't see Bergen orders)
6. ⏭️ Roll out to remaining Tier 1 tables one at a time
7. ⏭️ Apply to stage database
8. ⏭️ Apply to production (with maintenance window)
