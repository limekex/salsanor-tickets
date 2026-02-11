# Troubleshooting Guide

## Development Server Issues

### Internal Server Error / Turbopack Corruption

**Symptoms:**
- `Error: Cannot find module '.../.next/dev/server/middleware-manifest.json'`
- Turbopack panic: `Failed to restore task data (corrupted database or bug)`
- Development server fails to start after recent changes

**Cause:**
Turbopack (Next.js 16.1+) can experience cache corruption, especially after:
- Significant code changes (navigation restructuring, new components)
- Switching branches
- Updating dependencies
- Stopping dev server unexpectedly

**Solution:**

#### Quick Fix (Recommended)
```bash
cd apps/web
npm run dev:clean
```

This cleans the `.next` directory and starts the dev server fresh.

#### Alternative: Use Webpack Instead of Turbopack
If Turbopack issues persist:
```bash
cd apps/web
npm run dev:webpack
```

#### Full Clean (If above doesn't work)
```bash
cd apps/web
npm run clean
rm -rf node_modules
cd ../..
npm install
cd apps/web
npm run dev
```

#### Manual Clean
```bash
# From repository root
rm -rf apps/web/.next
rm -rf .next
rm -rf node_modules/.cache
cd apps/web
npm run dev
```

### Middleware Deprecation Warning

**Warning Message:**
```
⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
```

**Note:** This is just a warning in Next.js 16.1.6. The `middleware.ts` file continues to work correctly. The warning can be safely ignored for now. Migration to "proxy" convention will be done in a future update.

## Database Issues

### Prisma Client Not Generated

**Symptoms:**
- Import errors for `@salsanor/database`
- Type errors related to Prisma models

**Solution:**
```bash
cd packages/database
npx prisma generate
```

Or reinstall dependencies (triggers postinstall hook):
```bash
npm install
```

## TypeScript Errors

### Module Not Found / Type Errors After Pull

**Solution:**
1. Clean TypeScript cache:
```bash
cd apps/web
rm -rf .next
npx tsc --build --clean
```

2. Restart TypeScript server in your IDE (VS Code: CMD+Shift+P → "TypeScript: Restart TS Server")

## Environment Issues

### Supabase Connection Errors

**Check:**
1. `.env.local` file exists in `apps/web/`
2. Required environment variables are set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

## Port Already in Use

**Error:** `Port 3000 is already in use`

**Solution:**
```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

## Package Installation Issues

### Lock File Conflicts

**Warning:**
```
Next.js inferred your workspace root... detected multiple lockfiles
```

**Solution:**
Delete extra `package-lock.json` files - keep only the one in repository root:
```bash
# From repository root
find . -name "package-lock.json" -not -path "./package-lock.json" -delete
npm install
```

## Still Having Issues?

1. Check the [GitHub Issues](https://github.com/limekex/salsanor-tickets/issues) for similar problems
2. Create a new issue with:
   - Error message (full stack trace)
   - Steps to reproduce
   - Your environment (OS, Node version, npm version)
   - Recent changes or actions taken

## Useful Commands

```bash
# Check Node and npm versions
node --version
npm --version

# View Next.js info
npx next info

# Check for outdated packages
npm outdated

# Clean everything and start fresh
npm run clean
rm -rf node_modules package-lock.json
npm install
cd apps/web
npm run dev
```
