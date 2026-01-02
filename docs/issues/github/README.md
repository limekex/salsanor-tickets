# GitHub Issues Roadmap - Implementation Priority

This directory contains detailed implementation issues for the SalsaNor Tickets platform, organized by priority and dependencies.

## 🚨 CRITICAL (Must Have for MVP)

### 1. [Stripe Webhook Handler](./08-implement-stripe-webhooks.md)
**Why:** Automatic order fulfillment depends on this
- Verify webhook signatures
- Process payment success events
- Trigger fulfillment pipeline
- Handle refunds and failures
- **Blocks:** Ticket generation, order completion

### 2. [Ticket Fulfillment System](./02-implement-ticket-fulfillment.md)
**Why:** No tickets = no check-in
- Generate secure JWT-based QR tokens
- Hash and store tokens
- Send confirmation emails
- **Blocks:** Check-in functionality, participant experience

### 3. [Check-in Validation API](./03-implement-checkin-validation.md)
**Why:** Scanner UI exists but has no backend
- Validate QR tokens
- Record check-ins
- Add CheckIn model to database
- **Blocks:** Door operations, attendance tracking

### 4. [Waitlist System](./04-implement-waitlist-system.md)
**Why:** Capacity management is core to registration
- Seat allocation logic
- Waitlist queue
- Add WaitlistEntry model
- Promotion workflows
- **Blocks:** Registration accuracy, overselling prevention

## 🔥 HIGH Priority (Needed Soon)

### 5. [Explainable Pricing System](./05-implement-pricing-explanations.md)
**Why:** Transparency builds trust, discounts need to work correctly
- Discount rule engine
- Multi-course discounts
- Membership-based pricing
- Pricing breakdown UI
- Admin discount management
- **Enhances:** Checkout experience, admin control

### 6. [Global Admin Portal](./06-implement-global-admin-portal.md)
**Why:** System needs management interface
- Organization CRUD
- Global user management
- Cross-org views
- System configuration
- **Enables:** Multi-org management, system administration

### 7. [PWA Configuration](./01-implement-pwa-configuration.md)
**Why:** Mobile experience and offline capability
- Manifest and service worker
- Installable app
- Offline check-in support
- **Enhances:** Mobile UX, reliability at events

## 🟡 MEDIUM Priority (Important but Can Wait)

### 8. [Membership Management](./07-implement-membership-management.md)
**Why:** Enables membership discounts
- CSV import
- Membership lookup
- Admin management UI
- **Enables:** Membership pricing, better discounts

## Implementation Order & Dependencies

```
┌─────────────────────────┐
│   Week 1: Fulfillment   │
├─────────────────────────┤
│ 1. Stripe Webhooks      │ ← Start here (critical path)
│ 2. Ticket Fulfillment   │ ← Depends on #1
└─────────────────────────┘
           │
           ▼
┌─────────────────────────┐
│   Week 2: Check-in      │
├─────────────────────────┤
│ 3. Check-in Validation  │ ← Depends on #2
│ 7. PWA Configuration    │ ← Can parallel with #3
└─────────────────────────┘
           │
           ▼
┌─────────────────────────┐
│   Week 3: Registration  │
├─────────────────────────┤
│ 4. Waitlist System      │ ← Critical for capacity
└─────────────────────────┘
           │
           ▼
┌─────────────────────────┐
│   Week 4: Pricing       │
├─────────────────────────┤
│ 5. Pricing Explanations │ ← Better user experience
│ 8. Membership System    │ ← Can parallel with #5
└─────────────────────────┘
           │
           ▼
┌─────────────────────────┐
│   Week 5: Admin         │
├─────────────────────────┤
│ 6. Global Admin Portal  │ ← System management
└─────────────────────────┘
```

## Issue Status Summary

| Issue | Priority | Blocks MVP | Estimated | Dependencies |
|-------|----------|------------|-----------|--------------|
| [08-stripe-webhooks](./08-implement-stripe-webhooks.md) | CRITICAL | Yes | 2-3 days | Stripe integration |
| [02-ticket-fulfillment](./02-implement-ticket-fulfillment.md) | CRITICAL | Yes | 3-4 days | Webhook (#8) |
| [03-checkin-validation](./03-implement-checkin-validation.md) | CRITICAL | Yes | 4-5 days | Tickets (#2) |
| [04-waitlist-system](./04-implement-waitlist-system.md) | CRITICAL | Yes | 5-7 days | Registration flow |
| [05-pricing-explanations](./05-implement-pricing-explanations.md) | HIGH | No | 5-7 days | Discount rules |
| [06-global-admin-portal](./06-global-admin-portal.md) | HIGH | No | 7-10 days | None |
| [01-pwa-configuration](./01-implement-pwa-configuration.md) | HIGH | No | 2-3 days | None |
| [08-membership-management](./07-implement-membership-management.md) | MEDIUM | No | 3-5 days | PersonProfile |

**Total Estimated Time:** 4-6 weeks for MVP (issues #8, #2, #3, #4)

## Quick Start: First Sprint

### Sprint 1 (Week 1): Payment & Fulfillment
**Goal:** Complete the payment → ticket flow

1. **Day 1-2:** Implement Stripe webhook handler (#8)
   - Set up webhook endpoint
   - Verify signatures
   - Process payment_intent.succeeded
   
2. **Day 3-5:** Implement ticket fulfillment (#2)
   - Generate JWT tokens
   - Hash and store
   - Send confirmation emails
   
**Outcome:** Payments trigger automatic ticket generation

### Sprint 2 (Week 2): Check-in System
**Goal:** Enable door scanning

1. **Day 1-3:** Implement check-in validation API (#3)
   - Add CheckIn model
   - Validate tickets
   - Record attendance
   
2. **Day 4-5:** Configure PWA (#1)
   - Add manifest.json
   - Configure service worker
   - Test offline capability
   
**Outcome:** Check-in system is operational

### Sprint 3 (Week 3): Capacity Management
**Goal:** Prevent overselling

1. **Day 1-5:** Implement waitlist system (#4)
   - Add WaitlistEntry model
   - Seat allocation logic
   - Promotion workflows
   
**Outcome:** Registration respects capacity, waitlist works

### Sprint 4 (Week 4): Enhanced UX
**Goal:** Better pricing transparency

1. **Day 1-5:** Implement pricing explanations (#5)
   - Rule evaluation engine
   - Discount breakdown UI
   - Admin rule management
   
**Outcome:** Users see clear pricing explanations

## Testing Strategy

Each issue includes:
- ✅ Unit tests for business logic
- ✅ Integration tests for API endpoints
- ✅ E2E tests for critical user flows

**Priority for E2E tests:**
1. Complete registration flow (browse → cart → payment → ticket)
2. Check-in flow (scan → validate → mark)
3. Waitlist flow (full track → waitlist → promote)
4. Admin workflows (create period → create track → view registrations)

## Current Implementation Gap

Based on spec.md analysis:

- **Phase 1 (Foundations):** 90% complete ✅
- **Phase 2 (Admin CRUD):** 80% complete ✅
- **Phase 3 (Registration):** 40% complete 🟡
- **Phase 4 (Pricing):** 30% complete 🟡
- **Phase 5 (Payments):** 50% complete 🟡
- **Phase 6 (Check-in):** 10% complete ⚠️
- **Phase 7 (Waitlist):** 0% complete ⚠️
- **Phase 8 (Membership):** 0% complete ⚠️

**Total Progress:** ~35% of MVP scope

## Success Metrics

### MVP Launch Checklist
- [ ] Users can register and pay for courses
- [ ] Payment triggers automatic ticket generation
- [ ] Tickets display correct QR codes
- [ ] Check-in staff can scan and validate tickets
- [ ] Capacity limits are enforced
- [ ] Waitlist works when tracks are full
- [ ] Pricing discounts apply correctly
- [ ] Admin can manage all aspects via portal

### Performance Targets
- Registration flow: < 30 seconds
- Payment confirmation: < 10 seconds
- Ticket generation: < 5 seconds
- QR validation: < 500ms
- Check-in marking: < 1 second

### Quality Targets
- Test coverage: > 80% for business logic
- Lighthouse score: > 90
- Error rate: < 1% of transactions
- Webhook success rate: > 99.9%

## Related Documentation

- [specs.md](../spec.md) - Complete technical specification
- [Role Implementation Issues](../issues/) - Role-specific feature details
- [README.md](../../README.md) - Project overview

## Notes

- Issues are written to be actionable and self-contained
- Each issue includes: requirements, technical implementation, testing checklist, success criteria
- Dependencies are clearly marked
- Estimates are conservative (account for testing and bug fixes)
- Issues can be converted to GitHub Issues directly
