# Next.js Cache Issues - Troubleshooting Guide

## Issue: 500 Error on `/api/user/account`

### Symptoms
- API endpoint returns 500 Internal Server Error
- Console shows errors like:
  ```
  ENOENT: no such file or directory, open '.next/dev/server/app/api/user/account/[__metadata_id__]/route/app-paths-manifest.json'
  ```
- Next.js treats the route as having a dynamic segment `[__metadata_id__]` when it shouldn't

### Root Cause
Next.js Turbopack cache corruption where the build cache incorrectly treats a static API route as having dynamic segments.

## Solution: Clear Next.js Cache

### Method 1: Delete .next Directory (Recommended)

```bash
# From the project root
cd apps/web
rm -rf .next
npm run dev
```

### Method 2: Use Next.js Clean Command

```bash
# From the project root
cd apps/web
npx next clean
npm run dev
```

### Method 3: Complete Clean (Nuclear Option)

If the above doesn't work, clear everything:

```bash
# From the project root
cd apps/web
rm -rf .next
rm -rf node_modules
cd ../..
npm install
cd apps/web
npm run dev
```

## Prevention

This issue typically occurs after:
1. Git operations (checkout, merge, rebase)
2. Adding/removing API routes
3. Changing file structure in the `app` directory
4. Next.js version updates

**Best Practice:** Clear the `.next` cache after any significant file structure changes:

```bash
# Add to your workflow
git pull && cd apps/web && rm -rf .next && npm run dev
```

## Verification

After clearing the cache, verify the API works:

1. Navigate to the app in your browser
2. Open browser DevTools → Network tab
3. Look for the `/api/user/account` request
4. Status should be 200 (or 401 if not logged in, which is expected)
5. No 500 errors should appear

## Related Files

- `/apps/web/src/app/api/user/account/route.ts` - The API route
- `/apps/web/src/hooks/use-user.ts` - Hook that calls this API
- `/apps/web/.next/` - Next.js build cache (should be in .gitignore)

## Additional Notes

The error appears as a 500 status code but the actual issue is Next.js routing, not the application code. The route file itself is correct - it's the build system's understanding of it that's broken.

After clearing cache, the endpoint should work normally and return:
- 200 + user account data (when authenticated)
- 401 + error message (when not authenticated)
- 404 + error message (when user exists in auth but not in database)
