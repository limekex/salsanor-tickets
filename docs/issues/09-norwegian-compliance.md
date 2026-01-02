# Norwegian Financial & Legal Compliance Implementation

## Overview
Implement comprehensive Norwegian financial and legal compliance features for the ticketing system, including MVA (VAT) tracking, proper invoicing, audit trails, and SAF-T export.

## Priority
**CRITICAL** - Legal requirement for operating in Norway

## Compliance Requirements

### 1. Bokføringsloven (Norwegian Accounting Act)
- All financial transactions must be recorded
- 5-year retention period required
- Sequential numbering of vouchers/invoices
- Immutable audit trail
- Proper documentation

### 2. Merverdiavgiftsloven (VAT Act)
- Track VAT/MVA on all taxable transactions
- Separate reporting of VAT amounts
- Support different VAT rates (0%, 12%, 15%, 25%)
- MVA reporting capability

### 3. SAF-T (Standard Audit File - Tax)
- XML export format required by Skatteetaten
- Must include all transactions, customers, suppliers
- Specific schema compliance

### 4. Invoicing Requirements
- Sequential invoice numbers
- Organization number (org.nr) for B2B
- VAT amount clearly stated
- Due date and payment terms
- Bank account information

## Database Schema Changes

### Add Invoice Model
```prisma
model Invoice {
  id              String   @id @default(uuid())
  invoiceNumber   String   @unique  // Sequential: ORG-PREFIX-0001
  organizerId     String
  orderId         String   @unique
  
  // Customer Information
  customerName    String
  customerEmail   String
  customerOrgNr   String?  // For B2B invoicing
  customerAddress Json?
  
  // Financial Details
  subtotalCents   Int
  mvaRate         Decimal  // 0, 12, 15, or 25
  mvaCents        Int      // Calculated MVA amount
  totalCents      Int      // subtotalCents + mvaCents
  currency        String   @default("NOK")
  
  // Invoice Details
  invoiceDate     DateTime @default(now())
  dueDate         DateTime
  paymentTerms    String   @default("Due upon receipt")
  status          InvoiceStatus @default(DRAFT)
  
  // Payment tracking
  paidAt          DateTime?
  paidAmount      Int?
  
  // Audit
  sentAt          DateTime?
  pdfUrl          String?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  organizer       Organizer @relation(fields: [organizerId], references: [id])
  order           Order @relation(fields: [orderId], references: [id])
  auditLogs       AuditLog[]
  
  @@index([organizerId, invoiceNumber])
  @@index([invoiceDate])
}

enum InvoiceStatus {
  DRAFT
  SENT
  PAID
  OVERDUE
  CANCELLED
  CREDITED
}
```

### Add Credit Note Model
```prisma
model CreditNote {
  id              String   @id @default(uuid())
  creditNumber    String   @unique
  organizerId     String
  invoiceId       String
  
  reason          String
  amountCents     Int
  mvaCents        Int
  totalCents      Int
  
  issueDate       DateTime @default(now())
  status          String   @default("ISSUED")
  
  createdAt       DateTime @default(now())
  
  organizer       Organizer @relation(fields: [organizerId], references: [id])
  invoice         Invoice @relation(fields: [invoiceId], references: [id])
  
  @@index([organizerId, creditNumber])
}
```

### Add Audit Log Model
```prisma
model AuditLog {
  id          String   @id @default(uuid())
  userId      String?
  entityType  String   // "Order", "Invoice", "Payment", etc.
  entityId    String
  action      String   // "CREATE", "UPDATE", "DELETE", "SEND", "PAID"
  changes     Json     // Before/after snapshot
  ipAddress   String?
  userAgent   String?
  timestamp   DateTime @default(now())
  
  user        UserAccount? @relation(fields: [userId], references: [id])
  
  @@index([entityType, entityId])
  @@index([timestamp])
}
```

### Update Order Model
```prisma
model Order {
  // ... existing fields ...
  
  // NEW: MVA/VAT tracking
  mvaRate         Decimal  @default(0)    // Applied MVA rate
  mvaCents        Int      @default(0)    // MVA amount
  totalInclMva    Int      // Total including MVA
  
  // NEW: Invoice reference
  invoice         Invoice?
  
  // ... rest of fields ...
}
```

## Implementation Phases

### Phase 1: MVA/VAT Tracking ⚡ CRITICAL
- [x] Add MVA fields to Order model
- [x] Calculate MVA based on organizer settings
- [ ] Update pricing engine to include MVA
- [ ] Display MVA separately in order summary
- [ ] Update exports to include MVA breakdown

### Phase 2: Invoice Generation 📄 HIGH
- [ ] Create Invoice model and migrations
- [ ] Generate sequential invoice numbers per organizer
- [ ] Create invoice PDF template (Norwegian format)
- [ ] Email invoice to customer
- [ ] Invoice list page for organizers
- [ ] Invoice detail view with download link

### Phase 3: Audit Trail 📝 HIGH
- [ ] Create AuditLog model
- [ ] Log all financial operations (create/update/delete)
- [ ] Log payment status changes
- [ ] Log invoice generation and sending
- [ ] Admin view of audit logs
- [ ] Export audit logs

### Phase 4: Credit Notes 🔄 MEDIUM
- [ ] Create CreditNote model
- [ ] Generate credit notes for refunds
- [ ] Link credit notes to original invoices
- [ ] Update accounting exports to include credit notes

### Phase 5: SAF-T Export 🇳🇴 HIGH
- [ ] Implement SAF-T XML schema
- [ ] Export chart of accounts mapping
- [ ] Export all transactions
- [ ] Export customer information
- [ ] Validate against Skatteetaten schema
- [ ] Generate ZIP file with all required data

### Phase 6: Accounting Integration 🔗 MEDIUM
- [ ] Export format for Tripletex
- [ ] Export format for Fiken
- [ ] Export format for Visma
- [ ] Export format for PowerOffice
- [ ] Generic CSV format for manual import

## Implementation: Phase 1 - MVA Tracking

### 1. Schema Changes
```typescript
// packages/database/prisma/schema.prisma

model Order {
  id          String   @id @default(uuid())
  periodId    String
  purchaserPersonId String
  status      OrderStatus @default(DRAFT)
  currency    String   @default("NOK")
  
  // Pricing breakdown
  subtotalCents Int              // Base price before MVA
  discountCents Int              // Discounts applied
  subtotalAfterDiscountCents Int // subtotalCents - discountCents
  
  mvaRate         Decimal  @default(0)    // 0.00, 12.00, 15.00, or 25.00
  mvaCents        Int      @default(0)    // Calculated MVA amount
  totalCents      Int                     // subtotalAfterDiscountCents + mvaCents
  
  pricingSnapshot Json
  providerCheckoutRef String?
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  period      CoursePeriod @relation(fields: [periodId], references: [id])
  purchaser   PersonProfile @relation(fields: [purchaserPersonId], references: [id])
  registrations Registration[]
  payments    Payment[]
  invoice     Invoice?
  
  @@index([periodId, status])
}
```

### 2. Pricing Engine Update
```typescript
// apps/web/src/lib/pricing/engine.ts

export function calculateOrderTotal(params: {
  subtotalCents: number
  discountCents: number
  mvaRate: number // percentage: 0, 12, 15, or 25
}) {
  const subtotalAfterDiscount = params.subtotalCents - params.discountCents
  const mvaCents = Math.round(subtotalAfterDiscount * (params.mvaRate / 100))
  const totalCents = subtotalAfterDiscount + mvaCents
  
  return {
    subtotalCents: params.subtotalCents,
    discountCents: params.discountCents,
    subtotalAfterDiscountCents: subtotalAfterDiscount,
    mvaRate: params.mvaRate,
    mvaCents,
    totalCents
  }
}
```

### 3. Order Creation Update
```typescript
// In createRegistration or checkout flow

// Get organizer's MVA rate
const period = await prisma.coursePeriod.findUnique({
  where: { id: periodId },
  include: { organizer: true }
})

const mvaRate = period.organizer.mvaReportingRequired 
  ? period.organizer.mvaRate 
  : 0

// Calculate pricing with MVA
const pricing = calculateOrderTotal({
  subtotalCents: trackPrice,
  discountCents: appliedDiscount,
  mvaRate: Number(mvaRate)
})

// Create order with MVA
const order = await tx.order.create({
  data: {
    ...pricing,
    pricingSnapshot: {
      ...pricing,
      appliedRules: discountRules
    }
  }
})
```

## Testing Requirements
- [ ] MVA calculation accuracy (0%, 12%, 15%, 25%)
- [ ] Invoice number sequential generation
- [ ] Credit note generation for refunds
- [ ] Audit log completeness
- [ ] SAF-T XML validation
- [ ] Accounting export format validation
- [ ] 5-year data retention verification

## Documentation
- [ ] Norwegian compliance guide for administrators
- [ ] Invoice generation guide
- [ ] MVA reporting guide
- [ ] Accounting system integration guides
- [ ] SAF-T export documentation

## Legal Review Checklist
- [ ] Bokføringsloven compliance verified
- [ ] MVA reporting requirements met
- [ ] Invoice format meets legal requirements
- [ ] Data retention policy documented
- [ ] Audit trail immutability verified
- [ ] SAF-T export validated by accountant

## Notes
- Consult with Norwegian accountant before finalizing
- Consider adding Skatteetaten API integration for automatic MVA reporting
- Ensure compliance with GDPR alongside financial requirements
- Test with actual accounting software imports
