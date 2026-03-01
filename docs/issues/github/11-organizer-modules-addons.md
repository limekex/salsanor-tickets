# Organizer Modules & Add-Ons System

## Overview

Implement a modular feature system that allows the platform (RegiNor.events) to sell and enable specific functionality per organizer. This enables:

- **Tiered pricing** - Different subscription levels with different features
- **À la carte add-ons** - Organizers can purchase individual modules
- **Feature gating** - Only show UI/functionality for enabled modules
- **Usage tracking** - Monitor which features are used for billing purposes

## Business Model

```
┌─────────────────────────────────────────────────────────────┐
│                    RegiNor.events Platform                  │
├─────────────────────────────────────────────────────────────┤
│  Subscription Tiers:                                        │
│  ├── Starter (free)     → Events only, limited capacity     │
│  ├── Professional       → + Courses, Memberships, Invoicing │
│  └── Enterprise         → + API Access, White-label, Custom │
│                                                             │
│  À la carte Add-ons:                                        │
│  ├── Wallet Passes (Apple/Google)                           │
│  ├── Waitlist Management                                    │
│  ├── Advanced Discounts                                     │
│  ├── Email Marketing                                        │
│  └── Custom Domain                                          │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### New Models

```prisma
/// Platform modules that can be enabled per organizer
model PlatformModule {
  id            String    @id @default(uuid())
  code          String    @unique  // e.g., "EVENTS", "COURSES", "WALLET_PASSES"
  name          String             // Display name
  description   String?            // What this module provides
  category      ModuleCategory
  isCore        Boolean   @default(false)  // Core modules can't be disabled
  monthlyPrice  Int?               // Price in cents (null = included in tier)
  createdAt     DateTime  @default(now())
  
  // Relations
  OrganizerModule OrganizerModule[]
  TierModule      TierModule[]
}

/// Subscription tiers available to organizers
model SubscriptionTier {
  id              String    @id @default(uuid())
  code            String    @unique  // e.g., "STARTER", "PROFESSIONAL", "ENTERPRISE"
  name            String
  description     String?
  monthlyPrice    Int       // Price in cents
  yearlyPrice     Int?      // Discounted yearly price in cents
  maxEvents       Int?      // null = unlimited
  maxCourses      Int?
  maxMembers      Int?
  priority        Int       @default(0)  // Display order
  isPublic        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  
  // Relations
  TierModule           TierModule[]
  OrganizerSubscription OrganizerSubscription[]
}

/// Modules included in each tier
model TierModule {
  id        String    @id @default(uuid())
  tierId    String
  moduleId  String
  
  Tier      SubscriptionTier @relation(fields: [tierId], references: [id])
  Module    PlatformModule   @relation(fields: [moduleId], references: [id])
  
  @@unique([tierId, moduleId])
}

/// Modules explicitly enabled/disabled per organizer (overrides tier)
model OrganizerModule {
  id            String    @id @default(uuid())
  organizerId   String
  moduleId      String
  enabled       Boolean   @default(true)
  enabledAt     DateTime  @default(now())
  enabledBy     String?   // UserAccount ID who enabled it
  expiresAt     DateTime? // For time-limited trials or add-ons
  notes         String?   // Admin notes
  
  Organizer     Organizer       @relation(fields: [organizerId], references: [id])
  Module        PlatformModule  @relation(fields: [moduleId], references: [id])
  
  @@unique([organizerId, moduleId])
  @@index([organizerId])
}

/// Organizer's active subscription
model OrganizerSubscription {
  id                String    @id @default(uuid())
  organizerId       String    @unique
  tierId            String
  status            SubscriptionStatus @default(ACTIVE)
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime
  cancelAtPeriodEnd  Boolean   @default(false)
  stripeSubscriptionId String? @unique
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  Organizer         Organizer        @relation(fields: [organizerId], references: [id])
  Tier              SubscriptionTier @relation(fields: [tierId], references: [id])
}

enum ModuleCategory {
  CORE           // Events, basic functionality
  PRODUCTS       // Courses, Memberships
  ENGAGEMENT     // Waitlist, Discounts, Email
  INTEGRATION    // Wallet Passes, API, Webhooks
  PREMIUM        // White-label, Custom domain
}

enum SubscriptionStatus {
  ACTIVE
  PAST_DUE
  CANCELED
  TRIALING
  PAUSED
}
```

### Organizer Model Extension

```prisma
model Organizer {
  // ... existing fields ...
  
  // New relations
  OrganizerModule       OrganizerModule[]
  OrganizerSubscription OrganizerSubscription?
}
```

## Module Definitions

| Code | Name | Category | Description |
|------|------|----------|-------------|
| `EVENTS` | Events | CORE | Single events with tickets, check-in |
| `COURSES` | Course Periods | PRODUCTS | Multi-week courses with tracks |
| `MEMBERSHIPS` | Memberships | PRODUCTS | Annual memberships with tiers |
| `INVOICING` | Invoicing | CORE | Invoice generation and management |
| `WALLET_PASSES` | Wallet Passes | INTEGRATION | Apple Wallet & Google Pay passes |
| `WAITLIST` | Waitlist | ENGAGEMENT | Waitlist when events/tracks are full |
| `DISCOUNTS` | Advanced Discounts | ENGAGEMENT | Multi-course, member, promo discounts |
| `EMAIL_TEMPLATES` | Email Templates | ENGAGEMENT | Custom email templates |
| `EMAIL_MARKETING` | Email Marketing | ENGAGEMENT | Bulk email campaigns |
| `API_ACCESS` | API Access | INTEGRATION | REST API for integrations |
| `WEBHOOKS` | Webhooks | INTEGRATION | Outgoing webhooks on events |
| `WHITE_LABEL` | White Label | PREMIUM | Remove RegiNor branding |
| `CUSTOM_DOMAIN` | Custom Domain | PREMIUM | Use own domain |

## Subscription Tiers

| Tier | Monthly | Included Modules | Limits |
|------|---------|------------------|--------|
| **Starter** | Free | EVENTS | 3 events/month, 100 attendees |
| **Professional** | 499 NOK | + COURSES, MEMBERSHIPS, INVOICING, WALLET_PASSES, WAITLIST, DISCOUNTS | 20 events, 5 courses, 500 members |
| **Enterprise** | 1499 NOK | + All modules | Unlimited |

## Implementation

### 1. Helper Functions

```typescript
// lib/modules/index.ts

import { prisma } from '@/lib/db'

export type ModuleCode = 
  | 'EVENTS' 
  | 'COURSES' 
  | 'MEMBERSHIPS' 
  | 'INVOICING'
  | 'WALLET_PASSES'
  | 'WAITLIST'
  | 'DISCOUNTS'
  | 'EMAIL_TEMPLATES'
  | 'EMAIL_MARKETING'
  | 'API_ACCESS'
  | 'WEBHOOKS'
  | 'WHITE_LABEL'
  | 'CUSTOM_DOMAIN'

/**
 * Check if an organizer has a specific module enabled
 */
export async function hasModule(organizerId: string, moduleCode: ModuleCode): Promise<boolean> {
  // First check explicit OrganizerModule override
  const explicitModule = await prisma.organizerModule.findFirst({
    where: {
      organizerId,
      Module: { code: moduleCode },
    },
    include: { Module: true }
  })

  if (explicitModule) {
    // Check if expired
    if (explicitModule.expiresAt && explicitModule.expiresAt < new Date()) {
      return false
    }
    return explicitModule.enabled
  }

  // Fall back to subscription tier
  const subscription = await prisma.organizerSubscription.findUnique({
    where: { organizerId },
    include: {
      Tier: {
        include: {
          TierModule: {
            include: { Module: true }
          }
        }
      }
    }
  })

  if (!subscription || subscription.status !== 'ACTIVE') {
    // No subscription = only core modules
    const module = await prisma.platformModule.findUnique({
      where: { code: moduleCode }
    })
    return module?.isCore ?? false
  }

  return subscription.Tier.TierModule.some(tm => tm.Module.code === moduleCode)
}

/**
 * Get all enabled modules for an organizer
 */
export async function getEnabledModules(organizerId: string): Promise<ModuleCode[]> {
  const modules: ModuleCode[] = []
  
  // Get all modules
  const allModules = await prisma.platformModule.findMany()
  
  for (const module of allModules) {
    if (await hasModule(organizerId, module.code as ModuleCode)) {
      modules.push(module.code as ModuleCode)
    }
  }
  
  return modules
}

/**
 * Require a module - throws if not enabled
 */
export async function requireModule(organizerId: string, moduleCode: ModuleCode): Promise<void> {
  const enabled = await hasModule(organizerId, moduleCode)
  if (!enabled) {
    throw new Error(`Module "${moduleCode}" is not enabled for this organization. Please upgrade your subscription.`)
  }
}
```

### 2. React Hook

```typescript
// hooks/use-modules.ts

import { useEffect, useState } from 'react'
import type { ModuleCode } from '@/lib/modules'

export function useOrganizerModules(organizerId: string) {
  const [modules, setModules] = useState<ModuleCode[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/organizers/${organizerId}/modules`)
      .then(res => res.json())
      .then(data => {
        setModules(data.modules)
        setLoading(false)
      })
  }, [organizerId])

  const hasModule = (code: ModuleCode) => modules.includes(code)

  return { modules, loading, hasModule }
}
```

### 3. Feature Guard Component

```tsx
// components/module-guard.tsx

import { useOrganizerModules, type ModuleCode } from '@/hooks/use-modules'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Lock } from 'lucide-react'
import Link from 'next/link'

interface ModuleGuardProps {
  organizerId: string
  module: ModuleCode
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ModuleGuard({ organizerId, module, children, fallback }: ModuleGuardProps) {
  const { hasModule, loading } = useOrganizerModules(organizerId)

  if (loading) return null
  
  if (!hasModule(module)) {
    if (fallback) return <>{fallback}</>
    
    return (
      <Alert className="border-amber-500 bg-amber-50">
        <Lock className="h-4 w-4" />
        <AlertTitle>Feature Not Available</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>This feature requires the {module} module.</p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/staffadmin/settings/subscription">
              Upgrade Subscription
            </Link>
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return <>{children}</>
}
```

### 4. Usage Example

```tsx
// In a page component
import { ModuleGuard } from '@/components/module-guard'
import { WalletButtons } from '@/components/wallet-buttons'

export function TicketPage({ organizerId, ticketId }) {
  return (
    <div>
      <h1>Your Ticket</h1>
      
      {/* Wallet buttons only shown if module enabled */}
      <ModuleGuard organizerId={organizerId} module="WALLET_PASSES">
        <WalletButtons ticketId={ticketId} />
      </ModuleGuard>
    </div>
  )
}
```

### 5. API Route Protection

```typescript
// In an API route
import { requireModule } from '@/lib/modules'

export async function GET(request: NextRequest) {
  const organizerId = // ... get from context
  
  // This will throw if module not enabled
  await requireModule(organizerId, 'WALLET_PASSES')
  
  // Continue with wallet pass generation...
}
```

## Admin UI

### Global Admin: Manage Organizer Modules

**Route:** `/admin/organizers/[organizerId]/modules`

Features:
- View current subscription tier
- See all available modules with status (enabled/disabled)
- Toggle individual modules on/off (override tier)
- Set expiration dates for trials
- Add admin notes

### Global Admin: Manage Platform Modules

**Route:** `/admin/settings/modules`

Features:
- List all platform modules
- Create new modules
- Edit module details and pricing
- Assign modules to tiers

### Global Admin: Manage Subscription Tiers

**Route:** `/admin/settings/tiers`

Features:
- List all subscription tiers
- Create/edit tiers
- Assign modules to tiers
- Set pricing and limits

## Migration Path

1. **Add database models** - Create new tables
2. **Seed default modules and tiers** - Set up initial data
3. **Migrate existing organizers** - Assign appropriate tier based on current usage
4. **Add feature guards** - Wrap existing features with module checks
5. **Build admin UI** - Global admin can manage modules
6. **Add subscription management** - Stripe subscription integration

## Acceptance Criteria

- [ ] Database schema for modules, tiers, and organizer subscriptions
- [ ] Seed script with default modules and tiers
- [ ] `hasModule()` helper function works correctly
- [ ] `requireModule()` throws appropriate error
- [ ] `ModuleGuard` component hides/shows features
- [ ] Global admin can view organizer's enabled modules
- [ ] Global admin can toggle modules per organizer
- [ ] Global admin can assign subscription tiers
- [ ] API routes check module access before executing
- [ ] Navigation items hidden for disabled modules
- [ ] Upgrade prompts shown for disabled features

## Future Enhancements

- [ ] Self-service subscription upgrade via Stripe
- [ ] Usage metering for usage-based billing
- [ ] Trial periods for modules
- [ ] Referral/discount codes
- [ ] Annual billing discounts
- [ ] Module usage analytics dashboard

## Related Files

- [schema.prisma](../../packages/database/prisma/schema.prisma) - Database schema
- [organizers.ts](../../apps/web/src/app/actions/organizers.ts) - Organizer actions
- [06-implement-global-admin-portal.md](./06-implement-global-admin-portal.md) - Global admin features
