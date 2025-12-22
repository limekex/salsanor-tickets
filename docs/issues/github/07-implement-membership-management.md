# Implement Membership Management System

## Priority
**MEDIUM** - Important for pricing, not blocking MVP

## Description
Build a membership product that is a "standalone" product on the same platform, where users can registert for membership, witin the same calendar year (or defined year) The registered customer/participant get its unique membership number/id.
Opt in to auto-renew yearly.

This membership number will be checked and verified against logged in user, and give organizer specified discount for sign-ups registraions to courses, events etc... 

in summary, a memberships import, storage, and lookup system that enables membership-based discounts and eligibility checking.

## Current Status
- ✅ Membership model exists in Prisma schema
- ⚠️ No import functionality
- ⚠️ No CSV parsing
- ⚠️ No membership lookup during checkout
- ⚠️ No admin UI for membership management

## Requirements

### CSV Import
- [ ] Create upload endpoint: `POST /api/admin/memberships/import`
- [ ] Accept CSV file with columns:
  - Email (required)
  - Phone (optional)
  - FirstName
  - LastName
  - MemberNumber
  - ValidFrom (date)
  - ValidTo (date)
  - Status (ACTIVE/EXPIRED)
- [ ] Parse CSV with validation
- [ ] Match to existing PersonProfile by email (primary) or phone (secondary)
- [ ] Create PersonProfile if not exists
- [ ] Upsert Membership records
- [ ] Return import summary:
  - Total rows processed
  - New members added
  - Existing members updated
  - Errors/skipped rows
- Save current "My membercard" in My Profile, and allow for saving to Apple / Google Wallet

### Membership Lookup
- [ ] Function: `lookupMembership(email: string, phone?: string)`
- [ ] Search by email (primary)
- [ ] Fallback to phone if email not found
- [ ] Check validity dates (validFrom <= now <= validTo)
- [ ] Return active membership or null
- [ ] Cache results briefly (5 minutes)

### Checkout Integration
- [ ] During pricing quote, lookup membership
- [ ] Pass membership status to pricing engine
- [ ] Display "Member" badge if found
- [ ] Show membership benefits message
- [ ] Store membership lookup result with order

### Admin UI
- [ ] Create `/staffadmin/memberships` page
  - List all memberships for organization
  - Filter by status (active/expired)
  - Search by name/email/member number
  - Show validity dates
- [ ] Create upload interface
  - File picker for CSV
  - Upload button with progress
  - Display import summary
  - Show errors/warnings
- [ ] Membership detail view
  - Show person info
  - Show validity period
  - Edit validity dates
  - Manual status override

### Manual Membership Management
- [ ] Create new membership manually
  - Search for person or create new
  - Set member number
  - Set validity dates
  - Set status
- [ ] Edit existing membership
  - Update validity dates
  - Update status
  - Update member number
- [ ] Delete membership (with confirmation)

### Membership Validation
- [ ] Validate dates (validFrom < validTo)
- [ ] Validate email format
- [ ] Validate phone format (if provided)
- [ ] Check for duplicate member numbers
- [ ] Warn if membership expires soon

## Technical Implementation

### CSV Parsing
```typescript
import Papa from 'papaparse'

interface MembershipRow {
  Email: string
  Phone?: string
  FirstName: string
  LastName: string
  MemberNumber: string
  ValidFrom: string
  ValidTo: string
  Status: string
}

async function importMemberships(file: File, organizerId: string) {
  const text = await file.text()
  
  const result = Papa.parse<MembershipRow>(text, {
    header: true,
    skipEmptyLines: true
  })
  
  const summary = {
    total: 0,
    created: 0,
    updated: 0,
    errors: [] as string[]
  }
  
  for (const row of result.data) {
    summary.total++
    
    try {
      // Validate row
      if (!row.Email) {
        summary.errors.push(`Row ${summary.total}: Missing email`)
        continue
      }
      
      // Find or create person
      let person = await prisma.personProfile.findFirst({
        where: { email: row.Email }
      })
      
      if (!person) {
        person = await prisma.personProfile.create({
          data: {
            email: row.Email,
            phone: row.Phone,
            firstName: row.FirstName,
            lastName: row.LastName
          }
        })
        summary.created++
      } else {
        summary.updated++
      }
      
      // Upsert membership
      await prisma.membership.upsert({
        where: {
          personId_org: {
            personId: person.id,
            org: 'SALSANOR'
          }
        },
        create: {
          personId: person.id,
          org: 'SALSANOR',
          memberNumber: row.MemberNumber,
          validFrom: new Date(row.ValidFrom),
          validTo: new Date(row.ValidTo),
          status: row.Status || 'ACTIVE',
          source: 'IMPORT'
        },
        update: {
          memberNumber: row.MemberNumber,
          validFrom: new Date(row.ValidFrom),
          validTo: new Date(row.ValidTo),
          status: row.Status || 'ACTIVE'
        }
      })
    } catch (error) {
      summary.errors.push(`Row ${summary.total}: ${error.message}`)
    }
  }
  
  return summary
}
```

### Membership Lookup
```typescript
async function lookupMembership(email: string, phone?: string) {
  // Try email first
  let person = await prisma.personProfile.findFirst({
    where: { email },
    include: {
      memberships: {
        where: {
          status: 'ACTIVE',
          validFrom: { lte: new Date() },
          validTo: { gte: new Date() }
        }
      }
    }
  })
  
  // Fallback to phone
  if (!person && phone) {
    person = await prisma.personProfile.findFirst({
      where: { phone },
      include: {
        memberships: {
          where: {
            status: 'ACTIVE',
            validFrom: { lte: new Date() },
            validTo: { gte: new Date() }
          }
        }
      }
    })
  }
  
  const activeMembership = person?.memberships[0]
  
  return activeMembership ? {
    isActive: true,
    memberNumber: activeMembership.memberNumber,
    validTo: activeMembership.validTo,
    org: activeMembership.org
  } : {
    isActive: false
  }
}
```

### Checkout Integration
```typescript
// In pricing quote action
const membershipInfo = await lookupMembership(
  purchaser.email,
  purchaser.phone
)

const pricing = await evaluateRules({
  periodCode,
  cart,
  purchaser,
  membership: membershipInfo,
  promoCode
})
```

## UI Components

### MembershipUploader
```tsx
function MembershipUploader() {
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  
  async function handleUpload() {
    if (!file) return
    
    setImporting(true)
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await importMemberships(formData)
    setResult(response)
    setImporting(false)
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Memberships</CardTitle>
        <CardDescription>
          Upload a CSV file with membership data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Input 
          type="file" 
          accept=".csv" 
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <Button 
          onClick={handleUpload} 
          disabled={!file || importing}
          className="mt-4"
        >
          {importing ? 'Importing...' : 'Upload'}
        </Button>
        
        {result && (
          <div className="mt-4 space-y-2">
            <div className="font-medium">Import Summary:</div>
            <div>Total: {result.total}</div>
            <div>Created: {result.created}</div>
            <div>Updated: {result.updated}</div>
            {result.errors.length > 0 && (
              <div className="text-destructive">
                Errors: {result.errors.length}
                <ul className="mt-2 text-sm">
                  {result.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

### MembershipTable
- List memberships with status badges
- Show expiry dates with warnings for soon-expiring
- Quick filters (active, expired, expiring soon)
- Search box
- Actions: Edit, Delete

## Database Enhancements
- [ ] Add unique constraint: `@@unique([personId, org])`
- [ ] Add index: `@@index([personId, validTo])`
- [ ] Add index: `@@index([memberNumber])`
- [ ] Consider adding `expiresAt` reminder field

## Testing Checklist
- [ ] Unit test: CSV parsing with valid data
- [ ] Unit test: CSV parsing with invalid data
- [ ] Unit test: membership lookup by email
- [ ] Unit test: membership lookup by phone
- [ ] Unit test: validity date checking
- [ ] Integration test: full import flow
- [ ] Integration test: membership-based discount
- [ ] Test: duplicate email handling
- [ ] Test: duplicate member number handling
- [ ] Test: expired membership not found

## Success Criteria
- [ ] CSV import works with valid data
- [ ] Invalid rows are reported clearly
- [ ] Membership lookup is fast (< 100ms)
- [ ] Checkout displays member status correctly
- [ ] Member discounts apply automatically
- [ ] Admin can view all memberships
- [ ] Admin can manually edit memberships
- [ ] Expired memberships don't grant benefits

## Dependencies
- PersonProfile model ✅
- Membership model ✅
- Pricing engine integration
- File upload handling

## Related Issues
- #[pricing-explanations] - Pricing engine
- #[checkout-flow] - Checkout integration

## References
- Specs: Phase 8 — Membership sync & ops polish
- Issue docs: `03-ORG_FINANCE-finance-manager.md` (mentions membership)
