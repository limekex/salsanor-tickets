# MVA Split Implementation - Line Item Level Tax Handling

## Status: Not Started
**Priority:** Medium  
**Complexity:** High  
**Estimated Effort:** 3-5 days  
**Created:** 2026-01-13

---

## Background & Motivation

### Business Need
Norwegian VAT (MVA) regulations require accurate categorization of products and services with different tax rates. Many events and courses include multiple components that fall under different VAT categories:

- **Food/Catering:** 15% or 25% VAT (depending on service type)
- **Cultural events (concerts, performances):** 0% VAT (exempt)
- **Sports/Training courses:** 0% VAT (exempt)  
- **Social events/entertainment:** 25% VAT
- **Educational services:** Often 0% VAT (exempt)

### Current Limitation
Currently, the system applies a single MVA rate at the organization level to all products. This creates accounting issues when a single ticket/product contains multiple components with different VAT rates.

### Example Use Case
**SalsaNor Event Ticket - 300 NOK:**
- 100 NOK: Dinner (15% VAT = 15 NOK)
- 200 NOK: Concert performance (0% VAT = 0 NOK)
- **Total VAT:** 15 NOK
- **Total including VAT:** 300 NOK (already inclusive)

Without MVA split, the entire 300 NOK would be taxed at one rate, causing incorrect VAT reporting.

---

## Requirements

### Functional Requirements

1. **Organization Level**
   - Keep existing `mvaRate` field as default (currently 0-25%)
   - Use as fallback when product doesn't specify custom rate
   - Pre-select 25% as default for new organizations

2. **Product Level (Course Periods, Events)**
   - Add optional `mvaRate` field to override organization default
   - Add toggle: "Split MVA components" (boolean flag)
   - If split enabled, allow defining line items with individual rates

3. **Line Item Level**
   - Support multiple VAT components per product
   - Each component specifies:
     - Description (e.g., "Dinner", "Concert", "Course materials")
     - Amount in NOK (ex. VAT)
     - VAT rate (0%, 12%, 15%, 25%)
   - System calculates VAT amount automatically
   - Total must equal product price

4. **Exclusions**
   - Membership products do NOT need MVA split (simple single rate)

### Non-Functional Requirements

1. **Data Integrity**
   - Line item amounts must sum to product price
   - Prevent orphaned line items
   - Maintain audit trail of MVA changes

2. **Performance**
   - MVA calculations should not impact checkout performance
   - Index on product/order relationships

3. **Compliance**
   - Follow Norwegian VAT reporting standards
   - Support MVA report generation with proper categorization
   - Store enough data for audit purposes (7 years)

---

## Database Schema Changes

### New Tables

#### `ProductVatComponent` (Line Items)
```prisma
model ProductVatComponent {
  id          String   @id @default(uuid())
  productType String   // 'COURSE_PERIOD' | 'EVENT' | 'TRACK'
  productId   String   // References the parent product
  description String   // E.g., "Dinner", "Concert", "Course materials"
  amountCents Int      // Amount ex. VAT in cents
  vatRate     Decimal  // 0, 12, 15, 25
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([productType, productId])
  @@index([sortOrder])
}
```

#### `OrderLineItemVat` (Order-level breakdown)
```prisma
model OrderLineItemVat {
  id            String      @id @default(uuid())
  orderItemId   String      // FK to OrderItem
  description   String
  amountCents   Int         // Amount ex. VAT
  vatRate       Decimal
  vatAmountCents Int        // Calculated VAT
  createdAt     DateTime    @default(now())
  
  OrderItem     OrderItem   @relation(fields: [orderItemId], references: [id])

  @@index([orderItemId])
}
```

### Modified Tables

#### `CoursePeriod`
```prisma
model CoursePeriod {
  // ... existing fields ...
  mvaRate          Decimal?  // Optional override of org default
  enableVatSplit   Boolean   @default(false)
  ProductVatComponent ProductVatComponent[] @relation("CoursePeriodVatComponents")
}
```

#### `Event`
```prisma
model Event {
  // ... existing fields ...
  mvaRate          Decimal?  // Optional override
  enableVatSplit   Boolean   @default(false)
  ProductVatComponent ProductVatComponent[] @relation("EventVatComponents")
}
```

#### `CourseTrack`
```prisma
model CourseTrack {
  // ... existing fields ...
  mvaRate          Decimal?  // Optional override
  enableVatSplit   Boolean   @default(false)
  ProductVatComponent ProductVatComponent[] @relation("TrackVatComponents")
}
```

#### `OrderItem`
```prisma
model OrderItem {
  // ... existing fields ...
  OrderLineItemVat OrderLineItemVat[] // VAT breakdown for reporting
}
```

---

## Implementation Plan

### Phase 1: Database & Backend (2 days)

**Tasks:**
1. Create Prisma migration for new tables and fields
2. Update seed scripts with example VAT components
3. Create utility functions:
   - `calculateVatBreakdown(components: VatComponent[])` 
   - `validateVatComponentTotal(components, productPrice)`
   - `getEffectiveVatRate(product, organizer)` // Resolves org default or product override

**Files to create/modify:**
- `packages/database/prisma/schema.prisma`
- `packages/database/prisma/migrations/YYYYMMDD_add_vat_components.sql`
- `packages/domain/src/vat/calculator.ts` (new)
- `packages/domain/src/vat/validator.ts` (new)

### Phase 2: Product Setup UI (1.5 days)

**Admin Interface Changes:**

#### Course Period / Event Edit Form
Add new section: **"VAT Configuration"**

```tsx
<Card>
  <CardHeader>
    <CardTitle>VAT (MVA) Configuration</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Simple rate selector */}
    <FormField name="mvaRate">
      <FormLabel>VAT Rate</FormLabel>
      <Select>
        <SelectItem value="0">0% (Exempt - Culture/Sport)</SelectItem>
        <SelectItem value="12">12% (Reduced - Transport)</SelectItem>
        <SelectItem value="15">15% (Reduced - Food service)</SelectItem>
        <SelectItem value="25">25% (Standard)</SelectItem>
      </Select>
      <FormDescription>
        Leave empty to use organization default ({organizer.mvaRate}%)
      </FormDescription>
    </FormField>

    {/* Split toggle */}
    <FormField name="enableVatSplit">
      <Checkbox />
      <FormLabel>Split VAT into multiple components</FormLabel>
      <FormDescription>
        Enable if this product includes items with different VAT rates (e.g., dinner + concert)
      </FormDescription>
    </FormField>

    {/* VAT Components (shown only if split enabled) */}
    {form.watch('enableVatSplit') && (
      <div className="space-y-4 mt-4">
        <h4 className="font-semibold">VAT Components</h4>
        {vatComponents.map((component, index) => (
          <div key={index} className="grid grid-cols-4 gap-4 p-4 border rounded">
            <Input 
              placeholder="Description (e.g., Dinner)" 
              value={component.description}
              onChange={(e) => updateComponent(index, 'description', e.target.value)}
            />
            <Input 
              type="number" 
              placeholder="Amount (ex. VAT)" 
              value={component.amountCents / 100}
              onChange={(e) => updateComponent(index, 'amountCents', e.target.value * 100)}
            />
            <Select 
              value={component.vatRate}
              onChange={(val) => updateComponent(index, 'vatRate', val)}
            >
              <SelectItem value="0">0%</SelectItem>
              <SelectItem value="12">12%</SelectItem>
              <SelectItem value="15">15%</SelectItem>
              <SelectItem value="25">25%</SelectItem>
            </Select>
            <Button variant="ghost" onClick={() => removeComponent(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        
        <Button type="button" variant="outline" onClick={addComponent}>
          + Add Component
        </Button>

        {/* Validation feedback */}
        <div className="p-4 bg-muted rounded">
          <p>Total components: {totalComponents} NOK</p>
          <p>Product price: {productPrice} NOK</p>
          {totalComponents !== productPrice && (
            <p className="text-destructive">⚠️ Components must sum to product price</p>
          )}
        </div>
      </div>
    )}
  </CardContent>
</Card>
```

**Files to create/modify:**
- `apps/web/src/app/admin/periods/[id]/edit/vat-config-section.tsx` (new)
- `apps/web/src/app/admin/events/[id]/edit/vat-config-section.tsx` (new)
- `apps/web/src/app/actions/periods.ts` (update)
- `apps/web/src/app/actions/events.ts` (update)

### Phase 3: Order Processing (1 day)

**Order Creation Flow:**

1. When adding item to cart, fetch VAT configuration:
   ```typescript
   async function addToCart(productId: string, productType: string) {
     const product = await getProductWithVatConfig(productId, productType)
     
     if (product.enableVatSplit) {
       // Store VAT breakdown with cart item
       cartItem.vatComponents = product.vatComponents
     } else {
       // Use single rate
       cartItem.vatRate = product.mvaRate || product.organizer.mvaRate
     }
   }
   ```

2. During checkout, create `OrderLineItemVat` records:
   ```typescript
   async function createOrder(cart: Cart) {
     const order = await prisma.order.create({ /* ... */ })
     
     for (const cartItem of cart.items) {
       const orderItem = await prisma.orderItem.create({ /* ... */ })
       
       if (cartItem.vatComponents) {
         // Create breakdown records
         for (const component of cartItem.vatComponents) {
           await prisma.orderLineItemVat.create({
             data: {
               orderItemId: orderItem.id,
               description: component.description,
               amountCents: component.amountCents,
               vatRate: component.vatRate,
               vatAmountCents: Math.round(component.amountCents * (component.vatRate / 100))
             }
           })
         }
       }
     }
   }
   ```

**Files to create/modify:**
- `apps/web/src/lib/cart/vat-handler.ts` (new)
- `apps/web/src/lib/orders/create-order.ts` (update)

### Phase 4: Reporting & Display (1 day)

#### Invoice Generation
Update PDF invoice to show VAT breakdown:

```typescript
// If order items have VAT splits
if (orderItem.OrderLineItemVat.length > 0) {
  doc.text(`  ${orderItem.title}`)
  for (const vat of orderItem.OrderLineItemVat) {
    doc.text(`    - ${vat.description}: ${formatNOK(vat.amountCents)} (${vat.vatRate}% MVA)`)
  }
} else {
  doc.text(`  ${orderItem.title}: ${formatNOK(orderItem.priceCents)}`)
}
```

#### MVA Report
Create new admin report showing VAT breakdown by rate:

```typescript
interface VatReport {
  period: { from: Date; to: Date }
  byRate: {
    rate: number
    totalExVat: number
    totalVat: number
    totalIncVat: number
    itemCount: number
  }[]
}

async function generateVatReport(organizerId: string, from: Date, to: Date): Promise<VatReport> {
  const orderItems = await prisma.orderItem.findMany({
    where: {
      order: {
        organizerId,
        createdAt: { gte: from, lte: to },
        status: 'PAID'
      }
    },
    include: {
      OrderLineItemVat: true
    }
  })

  // Aggregate by rate...
}
```

**Files to create/modify:**
- `apps/web/src/lib/pdf/invoice-generator.ts` (update)
- `apps/web/src/app/admin/reports/vat/page.tsx` (new)
- `apps/web/src/app/actions/reports.ts` (new)

### Phase 5: Testing & Validation (0.5 days)

**Test Cases:**

1. **Simple Single Rate:**
   - Product with no split uses org default
   - Product with override uses custom rate

2. **VAT Split:**
   - Create product with 2 components (0% + 25%)
   - Verify components sum to price
   - Prevent saving if totals don't match

3. **Order Creation:**
   - Cart item with split creates proper OrderLineItemVat records
   - VAT calculations are correct
   - Invoice shows breakdown

4. **Edge Cases:**
   - Deleting product cascades to components
   - Changing price invalidates existing components
   - Toggle split off removes components

**Files to create:**
- `apps/web/src/lib/vat/__tests__/calculator.test.ts`
- `apps/web/src/lib/vat/__tests__/validator.test.ts`
- `packages/database/scripts/test-vat-split.ts`

---

## UI/UX Design

### Visual Examples

#### Course Period Edit - VAT Section (Collapsed)
```
┌─────────────────────────────────────────────┐
│ VAT (MVA) Configuration                  ▼  │
├─────────────────────────────────────────────┤
│ VAT Rate: [25% (Standard)         ▼]        │
│ □ Split VAT into multiple components        │
│                                              │
│ Using organization default (25%)            │
└─────────────────────────────────────────────┘
```

#### Course Period Edit - VAT Section (Split Enabled)
```
┌─────────────────────────────────────────────┐
│ VAT (MVA) Configuration                  ▲  │
├─────────────────────────────────────────────┤
│ ☑ Split VAT into multiple components        │
│                                              │
│ VAT Components:                              │
│ ┌───────────────────────────────────────┐   │
│ │ Description: [Dinner              ]   │   │
│ │ Amount (ex. VAT): [100] NOK           │   │
│ │ VAT Rate: [15% ▼]                     │   │
│ │ VAT Amount: 15 NOK                 [×]│   │
│ └───────────────────────────────────────┘   │
│ ┌───────────────────────────────────────┐   │
│ │ Description: [Concert             ]   │   │
│ │ Amount (ex. VAT): [200] NOK           │   │
│ │ VAT Rate: [0% ▼]                      │   │
│ │ VAT Amount: 0 NOK                  [×]│   │
│ └───────────────────────────────────────┘   │
│ [+ Add Component]                            │
│                                              │
│ ┌────────────────────────────────────────┐  │
│ │ Total components: 300 NOK  ✓           │  │
│ │ Product price: 300 NOK                 │  │
│ │ Total VAT: 15 NOK                      │  │
│ └────────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

#### Invoice Display
```
Order #ORD-00123
─────────────────────────────────────────
Salsa Beginner Course + Dinner
  - Course participation: 200 NOK (0% MVA)
  - Dinner included: 100 NOK (15% MVA = 15 NOK)

Subtotal: 300 NOK
Total VAT: 15 NOK
Total: 300 NOK
─────────────────────────────────────────
```

---

## Norwegian VAT Regulations Reference

### Standard Rates (2026)
- **25%:** General rate (standard goods/services)
- **15%:** Food services, restaurants
- **12%:** Food products, passenger transport
- **0%:** Exempt (certain cultural, sports, educational services)

### Exempt Categories (0% VAT)
- Sports training and courses
- Cultural performances (concerts, theater)
- Certain educational services
- Non-profit organization activities (under conditions)

### Documentation Requirements
- Clear breakdown of VAT components on invoices
- Separate accounting for different VAT categories
- Annual MVA report to Skatteetaten
- 7-year retention of documentation

### Useful Links
- [Skatteetaten - MVA rates](https://www.skatteetaten.no/satser/merverdiavgift/)
- [Skatteetaten - Exempt services](https://www.skatteetaten.no/bedrift-og-organisasjon/avgifter/mva/unntak/)

---

## Migration Strategy

### For Existing Data

1. **Run migration** to add new fields (defaults: `enableVatSplit = false`)
2. **No action needed** for existing products - they continue with single rate
3. **Organizations** can opt-in to use VAT split on new/updated products
4. **Historical orders** remain unchanged (immutable records)

### Rollback Plan

If issues arise:
1. Disable VAT split toggle in UI
2. Existing data remains valid (single rate still works)
3. Can revert migration if needed (no data loss if components not used)

---

## Future Enhancements

### Potential Additions
1. **VAT Templates:** Pre-defined splits (e.g., "Dinner + Concert", "Course + Materials")
2. **Auto-split:** AI/ML to suggest splits based on product description
3. **VAT Report Export:** Direct export to accounting software (Tripletex, Visma)
4. **Multi-currency:** Handle VAT in different currencies (for international events)
5. **EU VAT:** Support for EU cross-border VAT rules

---

## Dependencies

### External Libraries
- None required (uses existing Prisma, Next.js, React Hook Form)

### Internal Systems
- Prisma schema updates
- Order fulfillment service
- Invoice generation service
- PDF ticket generator (update to show breakdown)

---

## Success Metrics

### Adoption
- % of organizations using VAT split feature
- Number of products with split configuration
- Average number of components per split product

### Accuracy
- Zero VAT calculation errors in production
- 100% of split products pass validation (totals match)
- Successful MVA report generation for all orgs using split

### Performance
- VAT calculation adds <10ms to checkout time
- Order creation time remains under 500ms
- No database query performance degradation

---

## Open Questions

1. **UI Placement:** Should VAT config be in basic setup or advanced settings?
2. **Validation Strictness:** Block save if components don't match, or allow as draft?
3. **Historical Changes:** If VAT rates change (e.g., government update), how to handle existing products?
4. **Rounding:** Should VAT calculations round per component or on total?
5. **Membership Integration:** Future - do memberships ever need split? (Currently excluded)

---

## Related Issues & Docs

- [Sequential Order Numbers](./github/08-implement-stripe-webhooks.md) - For proper accounting
- [Invoice System](../EMAIL_SYSTEM_STATUS.md) - PDF generation updates needed
- [Norwegian Compliance](./09-norwegian-compliance.md) - Legal requirements

---

## Implementation Checklist

**Database & Schema:**
- [ ] Create `ProductVatComponent` table
- [ ] Create `OrderLineItemVat` table
- [ ] Add `mvaRate`, `enableVatSplit` to CoursePeriod
- [ ] Add `mvaRate`, `enableVatSplit` to Event
- [ ] Add `mvaRate`, `enableVatSplit` to CourseTrack
- [ ] Create migration script
- [ ] Update seed scripts with examples

**Domain Logic:**
- [ ] Create `calculateVatBreakdown()` utility
- [ ] Create `validateVatComponentTotal()` utility
- [ ] Create `getEffectiveVatRate()` utility
- [ ] Add unit tests for VAT calculations

**Admin UI - Product Setup:**
- [ ] Create VatConfigSection component
- [ ] Integrate into Course Period edit form
- [ ] Integrate into Event edit form
- [ ] Add component list manager (add/remove/edit)
- [ ] Add real-time validation display
- [ ] Add server action for saving VAT config

**Order Processing:**
- [ ] Update cart to store VAT components
- [ ] Update order creation to save OrderLineItemVat records
- [ ] Ensure VAT breakdown in order confirmation emails
- [ ] Update webhook handler (if needed)

**Reporting & Display:**
- [ ] Update invoice PDF generator with breakdown
- [ ] Update ticket PDF generator (if applicable)
- [ ] Create VAT report page for admins
- [ ] Add export functionality (CSV/Excel)
- [ ] Add order detail page VAT display

**Testing:**
- [ ] Unit tests for VAT calculator
- [ ] Unit tests for VAT validator
- [ ] Integration test: Create product with split
- [ ] Integration test: Order with split components
- [ ] Integration test: Invoice generation with split
- [ ] E2E test: Full flow from setup to invoice
- [ ] Test edge cases (price changes, deletions)

**Documentation:**
- [ ] Update user guide with VAT split instructions
- [ ] Document VAT setup best practices
- [ ] Add Norwegian VAT regulations reference
- [ ] Create video tutorial (optional)

**Deployment:**
- [ ] Run migration on staging
- [ ] Test full flow on staging
- [ ] Monitor database performance
- [ ] Deploy to production
- [ ] Announce feature to organizations

---

**Estimated Total Effort:** 3-5 days (1 senior developer)  
**Target Completion:** TBD  
**Assigned To:** Unassigned

---

## Notes

This is a critical feature for Norwegian compliance and proper accounting. Take extra care with VAT calculations and ensure all edge cases are covered. Consider doing a phased rollout starting with a few pilot organizations before making it generally available.
