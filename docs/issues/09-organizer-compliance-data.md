# Enhancement: Organizer Financial & Legal Compliance Data

## Overview
Enhance the Organizer model to support Norwegian financial and legal compliance requirements, including MVA reporting, invoicing, and accounting system integration.

## Priority
**HIGH** - Required for legal compliance with Norwegian tax and accounting laws

## Current State
The Organizer model has basic information:
- name, slug, displayName
- contactEmail, contactPhone
- Business identification is missing

## Required Enhancements

### Business Registration Information
```typescript
// Add to Organizer model
organizationNumber: string?  // Norwegian org.nr (9 digits) - required for B2B invoicing
vatRegistered: boolean       // Is organization registered for MVA?
companyType: string?         // AS, ASA, ANS, DA, ENK, etc.
legalName: string?          // Official registered name (may differ from display name)
```

### Tax & Accounting Configuration
```typescript
// Add to Organizer model
mvaRate: number              // Default MVA rate (0, 12, 15, 25) - in percentage
mvaReportingRequired: boolean // Must report MVA to Skatteetaten?
accountingSystem: string?    // "TRIPLETEX", "FIKEN", "VISMA", "POWEROFFICE", "MANUAL"
fiscalYearStart: DateTime?   // When does fiscal year start?
```

### Invoice Configuration
```typescript
// Add to Organizer model
invoicePrefix: string        // Prefix for invoice numbers (e.g., "INV-", "SALSA-")
nextInvoiceNumber: number    // Sequential counter for invoices
invoiceEmail: string?        // Email to send from (may differ from contact)
invoiceAddress: Json?        // Full address for invoices
bankAccount: string?         // Norwegian bank account number
swiftBic: string?           // For international transfers
```

### Stripe Connect Configuration
```typescript
// Add to Organizer model
stripeConnectAccountId: string?  // Stripe Connect account ID
stripeOnboardingComplete: boolean
stripeFeePercentage: number      // Platform commission (e.g., 2.5%)
stripeFixedFeeCents: number      // Fixed fee per transaction
```

## Database Migration

```prisma
model Organizer {
  id            String   @id @default(uuid())
  name          String   @unique
  slug          String   @unique
  displayName   String?
  
  // Existing fields
  contactEmail  String?
  contactPhone  String?
  
  // NEW: Business Registration
  organizationNumber String?  @unique // Norwegian org.nr
  vatRegistered     Boolean  @default(false)
  companyType       String?  // AS, ASA, ENK, etc.
  legalName         String?
  
  // NEW: Tax & Accounting
  mvaRate              Decimal  @default(0) // 0, 12, 15, or 25
  mvaReportingRequired Boolean  @default(false)
  accountingSystem     String?
  fiscalYearStart      DateTime?
  
  // NEW: Invoice Configuration
  invoicePrefix        String   @default("INV")
  nextInvoiceNumber    Int      @default(1)
  invoiceEmail         String?
  invoiceAddress       Json?
  bankAccount          String?
  swiftBic             String?
  
  // NEW: Stripe Connect
  stripeConnectAccountId   String?  @unique
  stripeOnboardingComplete Boolean  @default(false)
  stripeFeePercentage      Decimal  @default(2.5)
  stripeFixedFeeCents      Int      @default(0)
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  periods       CoursePeriod[]
  roles         UserAccountRole[]
}
```

## Implementation Tasks

### Phase 1: Schema & Database
- [ ] Add new fields to Organizer model in schema.prisma
- [ ] Create migration for new fields
- [ ] Add validation for organizationNumber (9 digits, valid format)
- [ ] Update seed data with sample compliance data

### Phase 2: Admin UI
- [ ] Add "Financial Settings" tab to organization edit page
- [ ] Form fields for business registration info
- [ ] Form fields for tax/accounting configuration
- [ ] Form fields for invoice configuration
- [ ] Stripe Connect onboarding flow UI
- [ ] Validation and help text for Norwegian requirements

### Phase 3: Business Logic
- [ ] Automatically determine MVA rate based on vatRegistered
- [ ] Validate org.nr format (MOD11 checksum)
- [ ] Helper function to check if invoicing is properly configured
- [ ] Helper to get next invoice number (atomic increment)
- [ ] Stripe Connect webhook handling

### Phase 4: Integration
- [ ] Update order creation to check organizer's MVA settings
- [ ] Update invoice generation to use organizer's configuration
- [ ] Export formats for different accounting systems
- [ ] Stripe Connect payment flow

## Validation Rules

### Organization Number (org.nr)
```typescript
// Must be 9 digits
// Must pass MOD11 checksum validation
// Format: XXX XXX XXX
function validateOrgNumber(orgNr: string): boolean {
  const cleaned = orgNr.replace(/\s/g, '')
  if (!/^\d{9}$/.test(cleaned)) return false
  
  // MOD11 validation
  const weights = [3, 2, 7, 6, 5, 4, 3, 2]
  const digits = cleaned.split('').map(Number)
  const sum = weights.reduce((acc, w, i) => acc + w * digits[i], 0)
  const checksum = 11 - (sum % 11)
  const calculatedCheck = checksum === 11 ? 0 : checksum
  
  return calculatedCheck === digits[8]
}
```

### MVA Rate
```typescript
// Valid rates: 0, 12, 15, 25
// Dance courses typically 0% (educational) or 25% (recreational)
// Must be set based on organization type and service
```

## UI/UX Considerations

### Organization Edit Form
```
Financial & Legal Settings
├── Business Registration
│   ├── Organization Number (org.nr) *
│   ├── VAT Registered? ☐
│   ├── Company Type [dropdown]
│   └── Legal Name
├── Tax & Accounting
│   ├── Default MVA Rate [0%, 12%, 15%, 25%] *
│   ├── MVA Reporting Required? ☐
│   ├── Accounting System [dropdown]
│   └── Fiscal Year Start [date]
├── Invoice Configuration
│   ├── Invoice Prefix [text] *
│   ├── Current Invoice Number [readonly]
│   ├── Invoice Email
│   ├── Invoice Address [textarea/JSON editor]
│   ├── Bank Account
│   └── SWIFT/BIC
└── Payment Processing (Stripe Connect)
    ├── Connect Status [badge + button]
    ├── Platform Fee % [number]
    └── Fixed Fee (NOK) [number]
```

### Help Text Examples
- "Organization Number: Your 9-digit Norwegian organization number (org.nr). Required for B2B invoicing and VAT reporting."
- "VAT Registered: Check this if your organization is registered for MVA with Skatteetaten."
- "MVA Rate: Most dance courses are 0% (educational) or 25% (recreational). Contact your accountant if unsure."

## Dependencies
- Issue #09: Norwegian Compliance for Financial Reporting
- Stripe Connect setup documentation
- Norwegian tax authority (Skatteetaten) guidelines

## Testing Checklist
- [ ] Valid org.nr passes validation
- [ ] Invalid org.nr fails validation
- [ ] MVA rate correctly applied to new orders
- [ ] Invoice numbers increment sequentially
- [ ] Non-VAT registered orgs don't show MVA in invoices
- [ ] Stripe Connect onboarding completes successfully
- [ ] Platform fees calculated correctly

## Documentation Needed
- Norwegian compliance guide for course providers
- How to determine correct MVA rate for your services
- Stripe Connect setup guide
- Accounting system export guide

## Notes
- Not all organizers need full compliance (e.g., hobby organizations under reporting threshold)
- Make fields optional where possible
- Provide sensible defaults
- Include help text and validation hints
- Consider adding a "compliance checklist" for organizers
