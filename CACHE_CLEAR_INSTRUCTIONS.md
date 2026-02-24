# Next.js Cache Issues - Troubleshooting Guide

## Issue 1: 500 Error on `/api/user/account`

### Symptoms
- API endpoint returns 500 Internal Server Error
- Console shows errors like:
  ```
  ENOENT: no such file or directory, open '.next/dev/server/app/api/user/account/[__metadata_id__]/route/app-paths-manifest.json'
  ```
- Next.js treats the route as having a dynamic segment `[__metadata_id__]` when it shouldn't

### Root Cause
Next.js Turbopack cache corruption where the build cache incorrectly treats a static API route as having dynamic segments.

## Issue 2: Workspace Root Warnings and ENOENT Errors

### Symptoms
- Warning: `Next.js inferred your workspace root, but it may not be correct`
- Detected multiple lockfiles warning
- ENOENT errors for pages-manifest.json
- ENOENT errors for build-manifest files
- Errors after clearing `.next` cache

### Root Cause
This is a **monorepo** with workspaces. Next.js Turbopack was incorrectly inferring the workspace root due to multiple `package-lock.json` files (one at monorepo root, one in `apps/web`).

### Fix Applied
The `next.config.ts` has been updated to explicitly set the Turbopack root:

```typescript
experimental: {
  turbo: {
    root: path.resolve(__dirname, "../.."),
  },
}
```

This configuration:
- ✅ Prevents workspace root inference warnings
- ✅ Ensures correct manifest file paths
- ✅ Fixes ENOENT errors for pages-manifest.json

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
5. Modifying wallet API routes or other complex features

**Best Practice:** Clear the `.next` cache after any significant file structure changes:

```bash
# Add to your workflow
git pull && cd apps/web && rm -rf .next && npm run dev
```

## Verification

After clearing the cache and with the updated config, verify:

1. Navigate to the app in your browser
2. Open browser DevTools → Network tab
3. Look for the `/api/user/account` request
4. Status should be 200 (or 401 if not logged in, which is expected)
5. No 500 errors should appear
6. **No workspace root warnings** in the terminal
7. **No ENOENT errors** for manifest files

## Related Files

- `/apps/web/next.config.ts` - **Updated** with Turbopack root configuration
- `/apps/web/src/app/api/user/account/route.ts` - The API route
- `/apps/web/src/hooks/use-user.ts` - Hook that calls this API
- `/apps/web/.next/` - Next.js build cache (should be in .gitignore)
- `/package.json` - Monorepo root with workspaces
- `/apps/web/package.json` - Web app package

## Additional Notes

The errors appear as 500 status codes or ENOENT file errors, but the actual issue is Next.js routing/caching, not the application code. The route files are correct - it's the build system's understanding that needs to be reset.

After clearing cache with the updated config, endpoints should work normally and return:
- 200 + user account data (when authenticated)
- 401 + error message (when not authenticated)
- 404 + error message (when user exists in auth but not in database)

And you should **not** see:
- ❌ Workspace root warnings
- ❌ Multiple lockfiles detection messages
- ❌ ENOENT errors for manifest files
