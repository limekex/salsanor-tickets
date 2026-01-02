# Implement Waitlist System with Seat Allocation

## Priority
**HIGH** - Core registration functionality

## Description
Implement the complete waitlist system that handles capacity management, automatic waitlist placement, and promotion workflows when spots become available.

## Current Status
- ⚠️ No WaitlistEntry model in database (exists in specs but not implemented)
- ⚠️ No seat allocation logic
- ⚠️ Capacity checking not enforced
- ⚠️ No leader/follower capacity split handling
- ✅ CourseTrack has capacity fields

## Requirements

### Database Schema
- [ ] Add `WaitlistEntry` model to Prisma schema:
```prisma
enum WaitlistStatus {
  ON_WAITLIST
  OFFERED
  EXPIRED
  ACCEPTED
  REMOVED
}

model WaitlistEntry {
  id            String   @id @default(uuid())
  registrationId String @unique
  status        WaitlistStatus @default(ON_WAITLIST)
  position      Int      // queue position
  offeredUntil  DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  registration  Registration @relation(fields: [registrationId], references: [id])
  
  @@index([registrationId])
  @@index([status, createdAt])
}
```
- [ ] Run migration to add WaitlistEntry table
- [ ] Add position tracking for queue ordering

### Seat Allocation Logic
- [ ] Implement `allocateSeat()` function:
  ```typescript
  interface AllocationRequest {
    trackId: string
    chosenRole: 'LEADER' | 'FOLLOWER' | 'ANY'
    pairGroupId?: string
  }
  
  interface AllocationResult {
    status: 'ACTIVE' | 'WAITLIST'
    reason: string
    position?: number // if waitlisted
  }
  ```
- [ ] Check total capacity first
- [ ] If using role-based capacity (leader/follower split):
  - Count current leaders/followers separately
  - Allocate to appropriate slot
  - Return WAITLIST if role-specific capacity reached
- [ ] For pair registrations:
  - Allocate both seats atomically
  - If can't allocate both, waitlist both
  - Ensure both have same pairGroupId

### Capacity Tracking
- [ ] Create efficient capacity query:
  ```typescript
  async function getTrackCapacity(trackId: string) {
    const track = await prisma.courseTrack.findUnique({
      where: { id: trackId },
      include: {
        registrations: {
          where: { status: 'ACTIVE' }
        }
      }
    })
    
    const activeCount = track.registrations.length
    const leaderCount = track.registrations.filter(r => r.chosenRole === 'LEADER').length
    const followerCount = track.registrations.filter(r => r.chosenRole === 'FOLLOWER').length
    
    return {
      total: activeCount,
      leaders: leaderCount,
      followers: followerCount,
      available: track.capacityTotal - activeCount,
      leadersAvailable: track.capacityLeaders ? track.capacityLeaders - leaderCount : null,
      followersAvailable: track.capacityFollowers ? track.capacityFollowers - followerCount : null
    }
  }
  ```

### Registration Flow Updates
- [ ] Update registration creation to use seat allocation
- [ ] If allocated → set status to PENDING_PAYMENT
- [ ] If waitlisted → set status to WAITLIST and create WaitlistEntry
- [ ] Calculate and store waitlist position
- [ ] Send appropriate email (confirmation or waitlist notification)

### Waitlist Promotion (Admin)
- [ ] Create admin action: `promoteFromWaitlist(trackId, offerId)`
- [ ] Find next person in waitlist (oldest ON_WAITLIST entry)
- [ ] Create offer with expiration (e.g., 24 hours)
- [ ] Update WaitlistEntry:
  - status: OFFERED
  - offeredUntil: now + 24 hours
- [ ] Send email with payment link and deadline
- [ ] Lock the spot during offer period

### Automatic Promotion (When Spot Opens)
- [ ] Trigger on cancellation/refund
- [ ] Check if waitlist exists for track
- [ ] Automatically promote next person
- [ ] Create offer as above
- [ ] Log promotion for audit

### Offer Acceptance
- [ ] When participant pays within offer window:
  - Update Registration status to ACTIVE
  - Update WaitlistEntry status to ACCEPTED
  - Release any locked spot
- [ ] If offer expires:
  - Update WaitlistEntry status to EXPIRED
  - Move to next person in queue
  - Repeat promotion process

### Participant Waitlist View
- [ ] Show waitlist status in profile
- [ ] Display queue position (e.g., "You are #3 in line")
- [ ] Show offer countdown if offer is active
- [ ] Show offer acceptance UI with payment button

## Technical Implementation

### Seat Allocation Example
```typescript
async function allocateSeat(request: AllocationRequest): Promise<AllocationResult> {
  const track = await prisma.courseTrack.findUnique({
    where: { id: request.trackId },
    include: {
      registrations: {
        where: { status: 'ACTIVE' }
      }
    }
  })
  
  if (!track) {
    throw new Error('Track not found')
  }
  
  const activeCount = track.registrations.length
  
  // Check total capacity
  if (activeCount >= track.capacityTotal) {
    if (!track.waitlistEnabled) {
      return { status: 'WAITLIST', reason: 'Track is full and waitlist is disabled' }
    }
    
    const position = await getNextWaitlistPosition(request.trackId)
    return { 
      status: 'WAITLIST', 
      reason: 'Track is full', 
      position 
    }
  }
  
  // Check role-specific capacity if applicable
  if (track.capacityLeaders && track.capacityFollowers) {
    const roleCount = track.registrations.filter(
      r => r.chosenRole === request.chosenRole
    ).length
    
    const roleCapacity = request.chosenRole === 'LEADER' 
      ? track.capacityLeaders 
      : track.capacityFollowers
    
    if (roleCount >= roleCapacity) {
      const position = await getNextWaitlistPosition(request.trackId)
      return { 
        status: 'WAITLIST', 
        reason: `${request.chosenRole} capacity reached`, 
        position 
      }
    }
  }
  
  return { status: 'ACTIVE', reason: 'Seat allocated' }
}
```

### Pair Registration Handling
```typescript
async function allocatePairSeats(trackId: string, role1: string, role2: string) {
  const track = await getTrackCapacity(trackId)
  
  // Need 2 available seats
  if (track.available < 2) {
    return { status: 'WAITLIST', reason: 'Not enough capacity for pair' }
  }
  
  // If role-based, check both roles have capacity
  if (track.leadersAvailable !== null && track.followersAvailable !== null) {
    if (role1 === 'LEADER' && role2 === 'FOLLOWER') {
      if (track.leadersAvailable < 1 || track.followersAvailable < 1) {
        return { status: 'WAITLIST', reason: 'Role-specific capacity not available' }
      }
    }
  }
  
  return { status: 'ACTIVE', reason: 'Pair seats allocated' }
}
```

## Testing Checklist
- [ ] Unit test: total capacity checking
- [ ] Unit test: role-based capacity checking
- [ ] Unit test: pair seat allocation (atomic)
- [ ] Unit test: waitlist position calculation
- [ ] Integration test: registration with full track
- [ ] Integration test: promotion flow
- [ ] Integration test: offer expiration
- [ ] Integration test: cancellation triggers promotion
- [ ] Test: concurrent registrations don't exceed capacity
- [ ] Test: race condition handling

## Race Condition Handling
- [ ] Use database transactions for seat allocation
- [ ] Use row-level locking during allocation
- [ ] Implement optimistic locking with version field
- [ ] Handle concurrent registration attempts gracefully
- [ ] Test with concurrent requests

## Success Criteria
- [ ] Registrations cannot exceed capacity
- [ ] Waitlist is created when full
- [ ] Position in queue is accurate
- [ ] Promotions work automatically
- [ ] Offers expire correctly
- [ ] Pair registrations are atomic
- [ ] Leader/follower split is enforced
- [ ] No race conditions in allocation

## Dependencies
- Registration creation flow
- Email notification system
- Payment link generation
- Admin UI for manual promotion

## Related Issues
- #[registration-flow] - Registration creation
- #[email-notifications] - Waitlist emails
- #[admin-waitlist-ui] - Admin promotion interface

## References
- Specs: Phase 3 — Registration engine
- Specs: Phase 7 — Waitlist automation
- Specs: Seat Allocation Contract
