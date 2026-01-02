# Implement Explainable Pricing System with Discount Rules

## Priority
**HIGH** - Critical for transparency and trust

## Description
Build the complete pricing engine with explainable discount rules that shows users exactly why they're paying what they're paying. Display rule-by-rule breakdown in checkout.

## Current Status
- ✅ Basic pricing engine exists (`/lib/pricing/engine.ts`)
- ✅ DiscountRule model in Prisma schema
- ⚠️ No rule evaluation implementation
- ⚠️ No UI display of pricing breakdown
- ⚠️ No admin UI for managing discount rules
- ⚠️ No membership integration
- ⚠️ No multi-course discount logic

## Requirements

### Discount Rule Types (Phase 1)
- [ ] **MEMBERSHIP_PERCENT**: Percentage discount for members
  ```json
  {
    "percent": 15,
    "membershipRequired": true
  }
  ```
- [ ] **MULTI_COURSE_TIERED**: Discount based on number of courses
  ```json
  {
    "tiers": [
      { "minCourses": 2, "percent": 10 },
      { "minCourses": 3, "percent": 15 },
      { "minCourses": 4, "percent": 20 }
    ]
  }
  ```
- [ ] **PAIR_FIXED_PRICE**: Fixed price per track when registering as pair
  ```json
  {
    "priceCents": 280000,
    "trackId": "optional-specific-track"
  }
  ```
- [ ] **PROMO_CODE**: Promo code discount
  ```json
  {
    "code": "SUMMER2025",
    "percent": 20,
    "maxUses": 100,
    "validFrom": "2025-01-01",
    "validTo": "2025-03-31"
  }
  ```

### Rule Evaluation Engine
- [ ] Implement deterministic rule evaluation:
  ```typescript
  interface PricingRequest {
    periodCode: string
    cart: CartItem[]
    purchaser: PersonInfo
    membership?: MembershipInfo
    promoCode?: string
  }
  
  interface PricingBreakdown {
    currency: string
    subtotalCents: number
    discountCents: number
    totalCents: number
    appliedRules: AppliedRule[]
    lineItems: LineItem[]
    explanation: string[]
  }
  ```
- [ ] Sort rules by priority (ascending)
- [ ] Apply rules in order
- [ ] Track which rules were applied
- [ ] Generate human-readable explanations

### Membership Integration
- [ ] Check for active membership during pricing
- [ ] Look up by email or phone
- [ ] Verify membership validity dates
- [ ] Apply membership discounts if valid
- [ ] Show "Member" badge in checkout

### Multi-Course Detection
- [ ] Count unique tracks in cart
- [ ] Apply appropriate tier discount
- [ ] Show tier progression (e.g., "Add 1 more course for 15% off!")

### Pricing API Updates
- [ ] Update `POST /api/public/pricing/quote` to use new engine
- [ ] Return complete breakdown
- [ ] Include all applied rules
- [ ] Return explanations array
- [ ] Cache results briefly (1 minute)

### Checkout UI Enhancement
- [ ] Display pricing breakdown card
- [ ] Show each line item with base and final price
- [ ] List applied discount rules
- [ ] Show explanations in friendly language
- [ ] Highlight savings amount
- [ ] Show "Add another course" suggestion if near discount tier

### Admin Discount Rules UI
- [ ] Create `/staffadmin/periods/[periodId]/discounts` page
- [ ] List all rules for period
- [ ] Create new rule with form:
  - Rule type selector
  - Priority input
  - Enabled toggle
  - Type-specific config fields
- [ ] Edit existing rules
- [ ] Delete rules (with confirmation)
- [ ] Reorder by priority (drag & drop?)
- [ ] Test rule preview feature

### Rule Validation
- [ ] Validate rule config JSON structure
- [ ] Ensure priority is unique per period
- [ ] Validate date ranges for promo codes
- [ ] Check for conflicting rules
- [ ] Warn about rule interactions

## Technical Implementation

### Rule Evaluation Example
```typescript
async function evaluateRules(request: PricingRequest): Promise<PricingBreakdown> {
  const period = await prisma.coursePeriod.findUnique({
    where: { code: request.periodCode },
    include: {
      discountRules: {
        where: { enabled: true },
        orderBy: { priority: 'asc' }
      }
    }
  })
  
  let subtotal = 0
  const lineItems: LineItem[] = []
  
  // Calculate subtotal
  for (const item of request.cart) {
    const track = await getTrack(item.trackId)
    const price = item.mode === 'PAIR' 
      ? track.pricePairCents || track.priceSingleCents 
      : track.priceSingleCents
    
    subtotal += price
    lineItems.push({
      trackId: item.trackId,
      trackTitle: track.title,
      baseCents: price,
      finalCents: price // will be updated
    })
  }
  
  const appliedRules: AppliedRule[] = []
  const explanations: string[] = []
  let totalDiscount = 0
  
  // Apply rules in priority order
  for (const rule of period.discountRules) {
    const result = await applyRule(rule, request, lineItems, subtotal)
    
    if (result.applied) {
      appliedRules.push({
        code: rule.code,
        name: rule.name,
        amountCents: result.discountAmount
      })
      
      explanations.push(result.explanation)
      totalDiscount += result.discountAmount
      
      // Update line items if rule affects them
      if (result.updatedLineItems) {
        lineItems = result.updatedLineItems
      }
    }
  }
  
  return {
    currency: 'NOK',
    subtotalCents: subtotal,
    discountCents: totalDiscount,
    totalCents: subtotal - totalDiscount,
    appliedRules,
    lineItems,
    explanation: explanations
  }
}
```

### Rule Application Example
```typescript
async function applyRule(
  rule: DiscountRule, 
  request: PricingRequest,
  lineItems: LineItem[],
  subtotal: number
): Promise<RuleResult> {
  switch (rule.ruleType) {
    case 'MEMBERSHIP_PERCENT':
      if (request.membership?.isActive) {
        const config = rule.config as MembershipConfig
        const discount = Math.floor(subtotal * config.percent / 100)
        
        return {
          applied: true,
          discountAmount: discount,
          explanation: `Du får ${config.percent}% medlemsrabatt (gyldig medlemskap)`
        }
      }
      break
      
    case 'MULTI_COURSE_TIERED':
      const config = rule.config as MultiCourseConfig
      const courseCount = request.cart.length
      const applicableTier = config.tiers
        .filter(t => courseCount >= t.minCourses)
        .sort((a, b) => b.minCourses - a.minCourses)[0]
      
      if (applicableTier) {
        const discount = Math.floor(subtotal * applicableTier.percent / 100)
        
        return {
          applied: true,
          discountAmount: discount,
          explanation: `Du får ${applicableTier.percent}% rabatt for påmelding til ${courseCount} kurs`
        }
      }
      break
      
    case 'PAIR_FIXED_PRICE':
      // Apply pair pricing logic
      break
      
    case 'PROMO_CODE':
      if (request.promoCode === rule.config.code) {
        // Validate and apply promo code
      }
      break
  }
  
  return { applied: false }
}
```

### Checkout Display Component
```tsx
function PricingBreakdown({ breakdown }: { breakdown: PricingBreakdown }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Price Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Line items */}
        <div className="space-y-2">
          {breakdown.lineItems.map(item => (
            <div key={item.trackId} className="flex justify-between">
              <span>{item.trackTitle}</span>
              <div className="text-right">
                {item.baseCents !== item.finalCents && (
                  <span className="line-through text-muted-foreground mr-2">
                    {formatNOK(item.baseCents)}
                  </span>
                )}
                <span className="font-medium">
                  {formatNOK(item.finalCents)}
                </span>
              </div>
            </div>
          ))}
        </div>
        
        <Separator />
        
        {/* Subtotal */}
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatNOK(breakdown.subtotalCents)}</span>
        </div>
        
        {/* Applied discounts */}
        {breakdown.appliedRules.length > 0 && (
          <div className="space-y-2 bg-green-50 dark:bg-green-900/20 p-3 rounded">
            <div className="font-medium text-green-800 dark:text-green-200">
              Applied Discounts:
            </div>
            {breakdown.appliedRules.map(rule => (
              <div key={rule.code} className="flex justify-between text-sm">
                <span>{rule.name}</span>
                <span className="text-green-700 dark:text-green-300">
                  -{formatNOK(rule.amountCents)}
                </span>
              </div>
            ))}
          </div>
        )}
        
        {/* Explanations */}
        {breakdown.explanation.length > 0 && (
          <div className="space-y-1 text-sm text-muted-foreground">
            {breakdown.explanation.map((exp, i) => (
              <div key={i}>• {exp}</div>
            ))}
          </div>
        )}
        
        <Separator />
        
        {/* Total */}
        <div className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span>{formatNOK(breakdown.totalCents)}</span>
        </div>
        
        {breakdown.discountCents > 0 && (
          <div className="text-center text-green-700 dark:text-green-300 font-medium">
            You save {formatNOK(breakdown.discountCents)}!
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

## Testing Checklist
- [ ] Unit test: each rule type evaluation
- [ ] Unit test: rule priority ordering
- [ ] Unit test: multiple rules combination
- [ ] Unit test: membership validation
- [ ] Integration test: full pricing flow
- [ ] Test: invalid promo code
- [ ] Test: expired promo code
- [ ] Test: membership discount + multi-course
- [ ] Test: pair pricing
- [ ] E2E test: checkout with all discount types

## Success Criteria
- [ ] Pricing quote returns complete breakdown
- [ ] All explanations are human-readable
- [ ] UI displays applied rules clearly
- [ ] Admin can create and manage rules
- [ ] Rules are evaluated in correct priority
- [ ] Total savings are highlighted
- [ ] Membership discounts work
- [ ] Multi-course discounts work
- [ ] Pair pricing works
- [ ] Promo codes work

## Dependencies
- Membership lookup system (or placeholder)
- Checkout UI updates
- Admin staffadmin UI

## Related Issues
- #[membership-import] - Membership data
- #[admin-discount-ui] - Rule management UI
- #[checkout-flow] - Checkout integration

## References
- Specs: Phase 4 — Pricing & discount rules engine
- Specs: Pricing Quote Contract
- `/apps/web/src/lib/pricing/engine.ts` (current basic engine)
