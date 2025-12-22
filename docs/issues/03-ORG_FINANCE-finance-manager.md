# Role Implementation: ORG_FINANCE (Finance Manager)

## Role Overview
**Label:** Finance Manager  
**Description:** Financial and payment management access  
**Scope:** Organization-level (specific organizer)

## Current Access Permissions
- View financial reports
- Export payment data
- View registration revenue
- Monitor payment status
- Generate invoices

## Implementation Checklist

### Core Functionality
- [x] Role exists in database schema (`UserRole.ORG_FINANCE`)
- [x] Dashboard displays role with permissions
- [ ] Finance portal route implemented
- [ ] Organization context scoping in all actions
- [ ] Link to finance portal from dashboard
- [ ] All reporting must be in compliance with norwegian laws for financing and reporting.

### Financial Reporting
- [ ] Revenue dashboard for organization
  - [ ] Total revenue (current period)
  - [ ] Revenue by period (historical)
  - [ ] Revenue by product/track/course
  - [ ] Revenue by payment method (Stripe/Vipps)
- [ ] Payment status overview
  - [ ] Paid registrations count
  - [ ] Pending payments count
  - [ ] Failed payments count
  - [ ] Refunded payments count
- [ ] Revenue charts/graphs
  - [ ] Revenue over time
  - [ ] Payment method distribution
  - [ ] Top performing tracks

### Registration Revenue
- [ ] View all paid registrations
- [ ] Filter by period
- [ ] Filter by track
- [ ] Filter by payment status
- [ ] Sort by amount, date, etc.
- [ ] View individual registration details
- [ ] See payment provider details

### Payment Monitoring
- [ ] Real-time payment status updates
- [ ] Failed payment notifications
- [ ] Pending payment reminders
- [ ] Refund request tracking
- [ ] Dispute management
- [ ] Payment provider error logs

### Data Export
- [ ] Export revenue reports (CSV/Excel/PDF)
- [ ] Export registration list with payments
- [ ] Export by date range
- [ ] Export by period
- [ ] Export by track
- [ ] Custom report builder
- [ ] Scheduled automatic exports (email)

### Invoice Management
- [ ] Generate invoices for registrations
- [ ] View invoice history
- [ ] Resend invoices
- [ ] Download PDF invoices
- [ ] Custom invoice templates
- [ ] Bulk invoice generation
- [ ] Invoice number tracking

### Discount Analysis
- [ ] View discount usage
- [ ] Discount revenue impact
- [ ] Most used discount codes
- [ ] Discount effectiveness reports
- [ ] Create/manage discount codes (if allowed)

## Required Routes
- [ ] `/staffadmin/finance` - Main finance dashboard
- [ ] `/staffadmin/finance/revenue` - Revenue reports
- [ ] `/staffadmin/finance/registrations` - Registration payments
- [ ] `/staffadmin/finance/invoices` - Invoice management
- [ ] `/staffadmin/finance/discounts` - Discount reports
- [ ] `/staffadmin/finance/export` - Data export tools
- [ ] `/staffadmin/finance/payments/[paymentId]` - Payment details

## Required Server Actions
- [ ] `staffadmin-finance.ts` - Financial operations
  - [ ] `getFinancialSummary` - Dashboard stats
  - [ ] `getRevenueByPeriod` - Period revenue
  - [ ] `getRevenueByTrack` - Track revenue
  - [ ] `getPaidRegistrations` - List paid regs
  - [ ] `getPaymentStatus` - Status overview
  - [ ] `exportFinancialData` - CSV/Excel export
  - [ ] `generateInvoice` - Create invoice
  - [ ] `getInvoices` - List invoices
  - [ ] `getDiscountUsage` - Discount stats

## Required Components
- [ ] `FinanceDashboard` - Main overview
- [ ] `RevenueChart` - Visual revenue data
- [ ] `PaymentStatusTable` - Payment list
- [ ] `InvoiceList` - Invoice management
- [ ] `ExportDialog` - Export configuration
- [ ] `FinancialFilters` - Filter options
- [ ] `PaymentDetailsCard` - Individual payment
- [ ] `DiscountUsageReport` - Discount analytics

## Access Control
- [ ] Validate ORG_FINANCE role for specific organizerId
- [ ] Can only view data for their organization
- [ ] Read-only access (no create/edit/delete)
- [ ] Cannot access user personal data (GDPR)
- [ ] Cannot modify registrations or refunds
- [ ] Can export anonymized financial data

## Integration Requirements
- [ ] Stripe API integration
  - [ ] Fetch payment intents
  - [ ] Fetch payment methods
  - [ ] Fetch refund data
- [ ] Vipps API integration (if applicable)
  - [ ] Fetch payment status
  - [ ] Fetch transaction history
- [ ] Invoice generation library (PDF)
- [ ] Export library (CSV/Excel)

## Priority
**MEDIUM** - Important for financial transparency, but not blocking core functionality

## Dependencies
- Prisma schema with ORG_FINANCE role ✅
- Dashboard role display ✅
- Payment/Order system implemented
- Stripe integration functional
- Registration system complete

## Notes
- Read-only access to financial data
- Should implement role transition: if someone with ORG_ADMIN also has ORG_FINANCE, they still need finance-specific views
- Consider scheduled reports (daily/weekly revenue emails)
- GDPR compliance: personal data should be minimal in exports
- Currency formatting: all amounts in NOK with proper formatting
- Tax/VAT considerations for Norwegian regulations
