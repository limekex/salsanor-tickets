# Implement Automatic Refund Policy Grades

## Priority
**MEDIUM** - Quality of life improvement for org admins

## Description
Implement configurable refund policy grades that automatically calculate the refund percentage based on how many days before the event/course start date a cancellation is requested. Org admins can define their own policy tiers in organization settings.

## Current Status
**NOT STARTED**

### Current Behavior
- Admin manually selects refund percentage (0%, partial, or 100%) when cancelling a registration
- No automatic calculation based on cancellation timing
- No configurable policy per organizer

### Desired Behavior
- Org admin defines refund policy grades in organization settings
- When cancelling a registration, the system auto-suggests the appropriate refund percentage
- Admin can override the suggested percentage if needed
- Policy displayed to participants during registration (transparency)

## Requirements

### Database Model

```prisma
model RefundPolicy {
  id           String   @id @default(uuid())
  organizerId  String
  name         String   // e.g., "Standard Policy", "Strict Policy"
  isDefault    Boolean  @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  Organizer    Organizer @relation(fields: [organizerId], references: [id])
  grades       RefundPolicyGrade[]
  
  @@unique([organizerId, isDefault]) // Only one default per organizer
  @@index([organizerId])
}

model RefundPolicyGrade {
  id              String   @id @default(uuid())
  policyId        String
  minDaysBefore   Int      // Minimum days before event (inclusive)
  maxDaysBefore   Int?     // Maximum days before event (null = unlimited)
  refundPercent   Int      // 0-100
  description     String?  // e.g., "Full refund", "50% refund", "No refund"
  
  Policy          RefundPolicy @relation(fields: [policyId], references: [id], onDelete: Cascade)
  
  @@index([policyId])
}
```

### Example Policy Configuration

**Standard Dance School Policy:**
| Days Before Start | Refund % | Description |
|-------------------|----------|-------------|
| 14+ days | 100% | Full refund |
| 7-13 days | 50% | Partial refund |
| 1-6 days | 25% | Late cancellation |
| 0 days (same day) | 0% | No refund |

**Strict Event Policy:**
| Days Before Start | Refund % | Description |
|-------------------|----------|-------------|
| 30+ days | 100% | Full refund |
| 14-29 days | 50% | Partial refund |
| 0-13 days | 0% | No refund |

### Org Admin Settings UI

#### Location
`/staffadmin/settings/refund-policy` or within `/staffadmin/settings` page

#### Features
- [ ] View current refund policy grades
- [ ] Add new grade tier
- [ ] Edit existing grade tier
- [ ] Delete grade tier
- [ ] Reorder/validate tiers (no gaps, no overlaps)
- [ ] Set a policy as default
- [ ] Create multiple named policies (optional: for different event types)
- [ ] Preview how policy applies to sample dates

### Cancellation Flow Enhancement

#### Keep Existing Dialog - Add Policy Info
The current cancellation dialog remains the same (Full/Partial/None radio buttons + percentage input), but enhanced with:
- Informational banner explaining the auto-calculated refund
- Pre-filled percentage based on policy
- Clear messaging that admin can override

**Example UX:**
```
┌─────────────────────────────────────────────────────────────┐
│  Cancel Registration                                         │
├─────────────────────────────────────────────────────────────┤
│  Cancel registration for John Doe in Salsa Intro            │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ℹ️ Policy Suggestion                                     ││
│  │                                                          ││
│  │ There are 14+ days until course start.                  ││
│  │ According to your cancellation policy, this qualifies   ││
│  │ for 100% refund (Full refund).                          ││
│  │                                                          ││
│  │ The refund amount has been pre-filled below.            ││
│  │ Change the value to override this.                      ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  Refund Option                                               │
│  ○ Full refund (100%)        ← Pre-selected based on policy │
│  ○ Partial refund                                            │
│  ○ No refund (0%)                                            │
│                                                              │
│  [Reason input...]                                           │
│                                                              │
│  [Cancel] [Confirm Cancellation]                             │
└─────────────────────────────────────────────────────────────┘
```

**Another example (late cancellation):**
```
┌─────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ⚠️ Policy Suggestion                                     ││
│  │                                                          ││
│  │ There are only 3 days until course start.               ││
│  │ According to your cancellation policy, this qualifies   ││
│  │ for 25% refund (Late cancellation fee).                 ││
│  │                                                          ││
│  │ The refund amount has been pre-filled below.            ││
│  │ Change the value to override this.                      ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  Refund Option                                               │
│  ○ Full refund (100%)                                        │
│  ○ Partial refund            ← Pre-selected                  │
│      Refund Percentage: [25] %                               │
│  ○ No refund (0%)                                            │
└─────────────────────────────────────────────────────────────┘
```

#### Auto-Calculate Refund Percentage
```typescript
// lib/refund/calculate-refund.ts
export async function calculateRefundPercentage(
  organizerId: string,
  eventStartDate: Date,
  cancellationDate: Date = new Date()
): Promise<{
  percentage: number
  grade: RefundPolicyGrade
  daysBeforeStart: number
}> {
  const policy = await prisma.refundPolicy.findFirst({
    where: { organizerId, isDefault: true },
    include: { grades: { orderBy: { minDaysBefore: 'desc' } } }
  })
  
  if (!policy || policy.grades.length === 0) {
    // No policy defined - default to 100% (org admin decides)
    return { percentage: 100, grade: null, daysBeforeStart }
  }
  
  const daysBeforeStart = differenceInDays(eventStartDate, cancellationDate)
  
  // Find matching grade
  for (const grade of policy.grades) {
    const minOk = daysBeforeStart >= grade.minDaysBefore
    const maxOk = grade.maxDaysBefore === null || daysBeforeStart <= grade.maxDaysBefore
    
    if (minOk && maxOk) {
      return { percentage: grade.refundPercent, grade, daysBeforeStart }
    }
  }
  
  // No matching grade - default to 0%
  return { percentage: 0, grade: null, daysBeforeStart }
}
```

#### Enhanced Cancel Registration Dialog
- **Keep existing UI structure** (radio buttons: Full/Partial/None)
- Add info banner at top explaining policy calculation
- Pre-select appropriate radio button based on policy
- Pre-fill percentage for partial refunds
- Clear message: "Change the value to override this"
- Admin can always override the suggested amount

**No policy defined fallback:**
```
┌─────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ℹ️ No cancellation policy defined                        ││
│  │                                                          ││
│  │ You haven't set up a cancellation policy yet.           ││
│  │ Please select the refund amount manually.               ││
│  │                                                          ││
│  │ Set up a policy in Settings → Cancellation Policy       ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**Component changes to `cancel-registration-button.tsx`:**
```tsx
// Fetch suggested refund on dialog open
const [policyInfo, setPolicyInfo] = useState<{
  percentage: number
  daysBeforeStart: number
  gradeDescription: string | null
  hasPolicy: boolean
} | null>(null)

useEffect(() => {
  if (isOpen && eventStartDate) {
    calculateRefundPercentage(organizerId, eventStartDate)
      .then(setPolicyInfo)
  }
}, [isOpen, organizerId, eventStartDate])

// Pre-select based on policy
useEffect(() => {
  if (policyInfo?.hasPolicy) {
    if (policyInfo.percentage === 100) {
      setRefundType('full')
    } else if (policyInfo.percentage === 0) {
      setRefundType('none')
    } else {
      setRefundType('partial')
      setRefundPercentage(policyInfo.percentage)
    }
  }
}, [policyInfo])
```

### API Endpoints / Server Actions

#### Policy Management
- [ ] `getOrgRefundPolicies(organizerId)` - List all policies
- [ ] `getDefaultRefundPolicy(organizerId)` - Get active default policy
- [ ] `createRefundPolicy(organizerId, data)` - Create new policy
- [ ] `updateRefundPolicy(policyId, data)` - Update policy and grades
- [ ] `deleteRefundPolicy(policyId)` - Delete policy (if not default)
- [ ] `setDefaultRefundPolicy(policyId)` - Set as default

#### Refund Calculation
- [ ] `calculateRefundPercentage(organizerId, eventStartDate)` - Calculate suggested %
- [ ] `getRefundPolicyPreview(policyId, sampleDates[])` - Preview policy application

### Participant Transparency (Optional)

#### Display Policy During Registration
- Show refund policy summary on checkout page
- Link to full cancellation policy terms
- Require acknowledgment checkbox for strict policies

#### My Registrations Page
- Show refund eligibility for each registration
- "Cancel" button shows current refund % before confirming

## Implementation Phases

### Phase 1: Database & Core Logic
- [ ] Add `RefundPolicy` and `RefundPolicyGrade` models to schema
- [ ] Run migration
- [ ] Implement `calculateRefundPercentage()` function
- [ ] Unit tests for calculation logic

### Phase 2: Admin Settings UI
- [ ] Create refund policy settings page
- [ ] CRUD operations for policy grades
- [ ] Validation (no overlaps, no gaps)
- [ ] Policy preview tool

### Phase 3: Cancel Flow Integration
- [ ] Fetch suggested refund in cancel dialog
- [ ] Display explanation and days calculation
- [ ] Override option with audit trail
- [ ] Update `cancelRegistration` action to log policy used

### Phase 4: Participant Display (Optional)
- [ ] Show policy on checkout page
- [ ] Show refund eligibility on my registrations
- [ ] Cancellation terms acknowledgment

## Edge Cases

1. **No policy defined** → Default to manual selection (current behavior)
2. **Event already started** → 0% refund (unless override)
3. **Free registration** → No refund needed
4. **Policy changed after registration** → Use policy at time of registration? Or current policy?
5. **Multiple events in one order** → Use earliest event date for calculation

## Success Criteria

- [ ] Org admin can configure refund policy grades
- [ ] Cancel dialog shows auto-calculated refund percentage
- [ ] Calculation based on days before event/course start
- [ ] Admin can override suggested percentage
- [ ] Policy changes don't affect past cancellations
- [ ] Works for both courses (CoursePeriod) and events (Event)

## Related Issues
- Stripe Webhooks (#08) - Refund handler uses calculated percentage
- ORG_ADMIN role (#02) - Settings management
- ORG_FINANCE role (#03) - Financial compliance

## Technical Notes

- Use `date-fns` for date calculations (`differenceInDays`)
- Consider timezone handling (use organizer's timezone)
- Store which policy/grade was applied on CreditNote for audit
- Consider caching policy lookup for performance

## References
- Norwegian consumer law (angrerett) for minimum refund requirements
- Standard industry practices for event cancellation policies
