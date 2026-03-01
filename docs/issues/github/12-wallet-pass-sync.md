# Wallet Pass Auto-Sync on Event Update

## Overview

Implement automatic synchronization of Google Wallet and Apple Wallet passes when event details are updated. Currently, when an organizer changes event information (venue, date/time, etc.), existing wallet passes are not updated automatically.

## Problem Statement

```
┌─────────────────────────────────────────────────────────────┐
│  Current State:                                             │
│                                                             │
│  1. User adds ticket to Google/Apple Wallet                 │
│  2. Organizer changes event venue or time                   │
│  3. User's wallet pass shows OLD information ❌              │
│                                                             │
│  Desired State:                                             │
│                                                             │
│  1. User adds ticket to Google/Apple Wallet                 │
│  2. Organizer changes event venue or time                   │
│  3. User's wallet pass auto-updates with new info ✅         │
└─────────────────────────────────────────────────────────────┘
```

## Technical Approach

### Google Wallet

Google Wallet supports updating passes via the REST API:

```typescript
// PATCH to update existing class
PATCH https://walletobjects.googleapis.com/walletobjects/v1/eventTicketClass/{classId}

// Class ID format: {issuerId}.event_{eventId}
// All tickets sharing this class will auto-update
```

**Advantage:** Since we use `event_{eventId}` as class ID, updating the class updates ALL tickets for that event automatically.

### Apple Wallet

Apple Wallet requires push notifications to trigger pass updates:

1. Store device tokens when pass is registered
2. Send push notification when event changes
3. Device fetches updated pass from our server

**Requires:**
- Apple Push Notification Service (APNs) certificate
- Web service endpoints for pass registration
- Database table to store device registrations

## Implementation Plan

### Phase 1: Database Schema

```prisma
/// Track Apple Wallet device registrations for push updates
model WalletPassRegistration {
  id              String    @id @default(uuid())
  ticketId        String
  platform        WalletPlatform  // APPLE, GOOGLE
  deviceLibraryId String?         // Apple only
  pushToken       String?         // Apple only - for push notifications
  serialNumber    String          // Pass serial number
  passTypeId      String?         // Apple only
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relations
  EventTicket     EventTicket @relation(fields: [ticketId], references: [id])
  
  @@unique([ticketId, platform])
  @@index([deviceLibraryId])
}

enum WalletPlatform {
  APPLE
  GOOGLE
}
```

### Phase 2: Event Update Hook

```typescript
// packages/domain/src/events/event-service.ts

async function updateEvent(eventId: string, data: UpdateEventInput) {
  const event = await prisma.event.update({
    where: { id: eventId },
    data,
  });
  
  // Trigger wallet pass sync if relevant fields changed
  const walletRelevantFields = ['title', 'startDateTime', 'endDateTime', 
    'timezone', 'locationName', 'locationAddress', 'city'];
  
  const hasWalletChanges = walletRelevantFields.some(
    field => data[field] !== undefined
  );
  
  if (hasWalletChanges) {
    await syncWalletPassesForEvent(eventId);
  }
  
  return event;
}
```

### Phase 3: Google Wallet Sync

```typescript
// apps/web/src/lib/wallet/google/sync-passes.ts

import { google } from 'googleapis';

export async function syncGoogleWalletClass(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { Organizer: true },
  });
  
  if (!event) return;
  
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
  const classId = `${issuerId}.event_${eventId}`;
  
  // Build updated class data
  const classData = buildEventTicketClass(event);
  
  // Get authenticated client
  const auth = await getGoogleWalletAuth();
  const walletObjects = google.walletobjects({ version: 'v1', auth });
  
  try {
    // Try to update existing class
    await walletObjects.eventticketclass.patch({
      resourceId: classId,
      requestBody: classData,
    });
    console.log(`[Google Wallet] Updated class ${classId}`);
  } catch (error: any) {
    if (error.code === 404) {
      // Class doesn't exist yet (no passes created)
      console.log(`[Google Wallet] Class ${classId} not found, skipping`);
    } else {
      throw error;
    }
  }
}
```

### Phase 4: Apple Wallet Sync

```typescript
// apps/web/src/lib/wallet/apple/sync-passes.ts

import apn from 'apn';

export async function syncAppleWalletPasses(eventId: string) {
  // Get all Apple Wallet registrations for this event's tickets
  const registrations = await prisma.walletPassRegistration.findMany({
    where: {
      platform: 'APPLE',
      EventTicket: {
        eventId: eventId,
      },
    },
  });
  
  if (registrations.length === 0) return;
  
  // Send push notifications to all registered devices
  const apnProvider = new apn.Provider({
    token: {
      key: process.env.APPLE_WALLET_APN_KEY!,
      keyId: process.env.APPLE_WALLET_APN_KEY_ID!,
      teamId: process.env.APPLE_WALLET_TEAM_ID!,
    },
    production: process.env.NODE_ENV === 'production',
  });
  
  const notification = new apn.Notification();
  notification.payload = {}; // Empty payload triggers pass update
  
  for (const reg of registrations) {
    if (reg.pushToken) {
      await apnProvider.send(notification, reg.pushToken);
      console.log(`[Apple Wallet] Sent push to device ${reg.deviceLibraryId}`);
    }
  }
  
  apnProvider.shutdown();
}
```

### Phase 5: Apple Wallet Web Service Endpoints

Required endpoints per Apple's spec:

```typescript
// apps/web/src/app/api/wallet/apple/v1/devices/[deviceLibraryId]/registrations/[passTypeId]/[serialNumber]/route.ts

// POST - Register device for push notifications
export async function POST(request: Request, { params }) {
  const { deviceLibraryId, passTypeId, serialNumber } = params;
  const { pushToken } = await request.json();
  
  // Store registration
  await prisma.walletPassRegistration.upsert({
    where: { 
      ticketId_platform: { ticketId: serialNumber, platform: 'APPLE' } 
    },
    create: {
      ticketId: serialNumber,
      platform: 'APPLE',
      deviceLibraryId,
      pushToken,
      serialNumber,
      passTypeId,
    },
    update: {
      deviceLibraryId,
      pushToken,
    },
  });
  
  return new Response(null, { status: 201 });
}

// DELETE - Unregister device
export async function DELETE(request: Request, { params }) {
  const { serialNumber } = params;
  
  await prisma.walletPassRegistration.deleteMany({
    where: { 
      serialNumber,
      platform: 'APPLE',
    },
  });
  
  return new Response(null, { status: 200 });
}
```

## API Changes

### New Environment Variables

```env
# Apple Wallet Push Notifications
APPLE_WALLET_APN_KEY=base64_encoded_p8_key
APPLE_WALLET_APN_KEY_ID=ABC123DEFG
APPLE_WALLET_WEB_SERVICE_URL=https://reginor.events/api/wallet/apple

# Google Wallet API (already have service account)
# No additional env vars needed
```

## Tasks

### Backend Tasks

- [ ] **Task 1**: Add `WalletPassRegistration` model to Prisma schema
- [ ] **Task 2**: Create event update hook to detect wallet-relevant changes
- [ ] **Task 3**: Implement Google Wallet class update function
- [ ] **Task 4**: Implement Apple Wallet push notification function
- [ ] **Task 5**: Create Apple Wallet web service endpoints (register/unregister)
- [ ] **Task 6**: Update Apple pass generator to include `webServiceURL` and `authenticationToken`
- [ ] **Task 7**: Add APNs configuration for Apple push notifications

### Testing Tasks

- [ ] **Task 8**: Test Google Wallet sync with real pass
- [ ] **Task 9**: Test Apple Wallet push notification flow
- [ ] **Task 10**: Test handling of deleted/expired passes

## Dependencies

- Google Wallet API access (already configured)
- Apple Push Notification Service (APNs) certificate
- `apn` npm package for Apple push notifications
- `googleapis` npm package for Google Wallet API

## Estimated Effort

| Phase | Effort | Priority |
|-------|--------|----------|
| Phase 1: Database Schema | 1 hour | High |
| Phase 2: Event Update Hook | 2 hours | High |
| Phase 3: Google Wallet Sync | 3 hours | High |
| Phase 4: Apple Wallet Sync | 4 hours | Medium |
| Phase 5: Apple Web Service | 3 hours | Medium |

**Total: ~13 hours**

## Notes

### Google Wallet Advantages

- Class-based architecture means one API call updates ALL tickets for an event
- No device registration needed - Google handles updates automatically
- Simpler implementation than Apple

### Apple Wallet Challenges

- Requires maintaining device registrations
- Push notifications can be unreliable
- Need APNs certificate (separate from signing certificate)
- Each device must be notified individually

### Fallback Strategy

If automatic sync fails, users can:
1. Delete the pass from their wallet
2. Re-add from the ticket page (always fetches latest data)

## References

- [Google Wallet REST API - Update Class](https://developers.google.com/wallet/tickets/events/rest/v1/eventticketclass/patch)
- [Apple Wallet Web Service Reference](https://developer.apple.com/library/archive/documentation/PassKit/Reference/PassKit_WebService/WebService.html)
- [APNs Provider API](https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server)
