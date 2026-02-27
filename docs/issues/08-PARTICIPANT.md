# Role Implementation: PARTICIPANT

## Role Overview
**Label:** Participant  
**Description:** Regular course participant with basic access  
**Scope:** Personal data only

## Current Access Permissions
- View personal registrations
- View enrolled courses
- Update personal information
- View attendance history
- Access tickets/QR codes

## Implementation Checklist

### Core Functionality
- [x] Role exists in database schema (`UserRole.PARTICIPANT`)
- [x] Profile/dashboard for participants (`/my/`)
- [x] View personal data (settings page)
- [x] Mobile-optimized interface

### Registration Management (Personal)
- [x] View own registrations (available at `/my/courses` and `/my/tickets`)
- [x] View registration status
- [x] View payment status
- [x] Download receipts/invoices (via `/my/orders/[id]`)
- [ ] Cancel registrations (if allowed)
- [ ] Request refunds
- [ ] Modify registration details (before deadline)

### Course Access
- [x] View enrolled courses/tracks (`/my/courses`)
- [ ] View course schedules
- [ ] View course location/details
- [ ] View instructor information
- [ ] Add courses to personal calendar
- [ ] Receive course notifications

### Ticket Management
- [x] View tickets (`/my/tickets` - TicketQR component)
- [x] Download tickets as PDF (`/api/tickets/[id]/pdf`)
- [ ] Share ticket QR code
- [ ] View ticket validity period
- [x] Multiple tickets (if multiple registrations)
- [x] Add ticket to Apple Wallet / Google Pay (implemented 2026-02-25)

#### Wallet Integration Field Mapping

The ticket data must be consistent across all outputs (UI, PDF, Apple Wallet, Google Wallet).

**Data Sources (from database via Prisma):**

| Field | Database Field | Description |
|-------|----------------|-------------|
| Event Title | `Event.title` | Name of the event |
| Event Date/Time | `Event.startDateTime` | When the event starts |
| Event Location | `Event.location` | Venue/address |
| Organizer Name | `Event.Organizer.name` | Who organizes the event |
| Ticket Number | `EventTicket.ticketNumber` | Sequential number for this ticket |
| QR Token | `EventTicket.qrTokenHash` | **The unique scannable token** |
| Attendee Name | `PersonProfile.firstName` + `lastName` | Who the ticket belongs to |

**Field Usage by Output:**

| Field | My/Tickets UI | PDF | Apple Wallet | Google Wallet |
|-------|---------------|-----|--------------|---------------|
| Event Title | ✅ `Event.title` | ✅ `eventTitle` | ✅ `eventTitle` | ✅ `eventTitle` |
| Date/Time | ✅ `startDateTime` | ✅ `eventDate` | ⚠️ `startDate`→`startDateTime` | ✅ `eventDate` |
| Location | ❌ (not shown) | ✅ `eventVenue` | ⚠️ uses fallback | ✅ `eventLocation` |
| Organizer | ✅ `Organizer.name` | ✅ `seller.name` | ✅ `organizerName` | ✅ `organizerName` |
| QR Code | ✅ `qrTokenHash` | ✅ `qrToken` | ⚠️ `qrCode`→`qrTokenHash` | ✅ `qrCode` |
| Attendee | ❌ (implied) | ✅ `buyer.name` | ✅ `attendeeName` | ✅ `attendeeName` |
| Ticket # | ✅ `ticketNumber` | ✅ `ticketNumber` | ✅ `ticketNumber` | ✅ `ticketNumber` |

**Issues Found (2026-02-25):**
- [x] Apple Wallet: Certificate/key mismatch - FIXED
- [x] Apple Wallet: Team ID mismatch - FIXED  
- [x] Apple Wallet: Uses `startDate` instead of `startDateTime` - FIXED
- [x] Apple Wallet: Uses `ticket.qrCode` instead of `ticket.qrTokenHash` - FIXED
- [ ] Apple Wallet: `Event.location` may be empty in test data (shows "Location TBA")

### Personal Information
- [x] Update profile information (`/my/settings`)
  - [x] Name
  - [x] Email
  - [x] Phone number
  - [x] Emergency contact
- [ ] Update preferences
- [ ] Communication settings
- [ ] Privacy settings

### Attendance Tracking (Personal)
- [ ] View personal attendance history
- [ ] See checked-in sessions
- [ ] Track attendance percentage
- [ ] View upcoming sessions
- [ ] Session reminders

### Communication
- [ ] Receive messages from instructors
- [ ] Receive organization announcements
- [ ] Contact organization
- [ ] Notification preferences
- [ ] Email preferences

### Course Discovery (Public)
- [x] Browse available courses (public site)
- [x] View course details (public site)
- [x] Register for courses (checkout system exists)
- [x] Add to cart
- [x] Apply discount codes
- [ ] Waitlist signup

## Required Routes
- [x] `/my/` - Personal portal dashboard ✅
- [x] `/my/settings` - Account settings ✅
- [x] `/my/tickets` - Event tickets ✅
- [x] `/my/courses` - Course registrations ✅
- [x] `/my/memberships` - Memberships ✅
- [x] `/my/orders` - Order history ✅
- [ ] `/my/attendance` - Attendance history
- [x] `/org/[slug]/courses` - Browse courses ✅
- [x] `/courses/[periodId]/[trackId]` - Course details ✅
- [x] `/cart` - Shopping cart ✅
- [x] `/success` - Registration confirmation ✅

## Required Server Actions
- [ ] `profile.ts` - Profile operations
  - [ ] `updateProfile` - Update user info
  - [ ] `getPersonalRegistrations` - Own registrations
  - [ ] `cancelRegistration` - Cancel registration
  - [ ] `requestRefund` - Request refund
  - [ ] `getPersonalTickets` - Own tickets
  - [ ] `getAttendanceHistory` - Personal attendance
  - [ ] `updatePreferences` - Settings
  - [ ] `downloadInvoice` - Get invoice/receipt

## Required Components
- [ ] `ParticipantDashboard` - Personal overview
- [ ] `RegistrationList` - Own registrations
- [x] `TicketQR` - Display ticket QR code ✅
- [ ] `ProfileForm` - Edit profile
- [ ] `AttendanceHistory` - Personal attendance
- [ ] `InvoiceList` - Payment history
- [ ] `NotificationSettings` - Communication prefs

## Access Control
- [ ] Users can only access their own data
- [ ] Cannot see other participants' information
- [ ] Cannot see organization financial data
- [ ] Cannot access admin functions
- [ ] Cannot see full course rosters
- [ ] Read-only for most organization data

## Current Implementation Status

### ✅ **Implemented (65% complete):**

**Portal & Dashboard:**
- Participant portal at `/my/` with dashboard (2-column grid)
- Memberships button in header (conditional, shows count)
- Orders button in header (shows count)
- Event tickets page (`/my/tickets`)
- Course registrations page (`/my/courses`)
- Memberships page (`/my/memberships`)
- Settings page (`/my/settings`)

**Orders Management:**
- Orders table view at `/my/orders` (Order #, Date, Items, Total, Status, Actions)
- Order details page at `/my/orders/[id]` with line items breakdown
- Download invoices (with refund display if applicable)
- Download credit notes (with line items and correct totals)
- Color-coded status badges
- Document access control (order owners can download)

**PDFs & Documents:**
- Invoice PDFs with:
  - Refund status display (FULLY/PARTIALLY REFUNDED with percentage)
  - Per-item refund amounts (proportionally distributed)
  - Credit notes list
  - Net amount after refund
- Credit note PDFs with:
  - Line items (description, quantity, original price, credited amount)
  - Correct totals calculated from line items
  - Refund percentage
- Refund calculations use actual order line items (not stale DB values)

**Profile & Settings:**
- Profile management and editing
- Update name, email, phone, emergency contact
- Language selector

**Registration & Tickets:**
- View registrations with status
- TicketQR component for check-in
- Multiple tickets support

**Public Features:**
- Public course browsing
- Cart and checkout system
- Registration success page

**Infrastructure:**
- i18n-ready text structure (English, centralized in UI_TEXT)
- Access control and ownership verification
- Mobile-optimized interface

### ⬜ **Pending (35% remaining):**

**High Priority:**
- Cancel registrations functionality
- Download tickets as PDF
- Course schedules/session details display
- Ticket validity period display

**Medium Priority:**
- Personal attendance history (`/my/attendance`)
- Request refunds (UI for refund requests)
- Modify registration details (before deadline)
- Notification preferences
- Communication settings

**Lower Priority:**
- Waitlist signup feature
- Course location/instructor details
- Calendar integration (iCal export)
- Apple Wallet / Google Pay integration
- Social features and enhancements

## Priority
**HIGH** - Core participant experience, partially implemented

## Dependencies
- Prisma schema with PARTICIPANT role ✅
- Registration system ✅
- Ticket generation system ✅
- Profile page ✅
- Checkout flow ✅

## User Experience Considerations
- [ ] Mobile-first design (participants use phones)
- [ ] Fast ticket access (show QR code quickly)
- [ ] Easy profile updates
- [ ] Clear registration status
- [ ] Simple cancellation process
- [ ] Offline ticket viewing (PWA)

## Privacy & GDPR
- [ ] Data export (GDPR right to data portability)
- [ ] Account deletion (GDPR right to be forgotten)
- [ ] Privacy policy access
- [ ] Terms of service acceptance
- [ ] Cookie consent
- [ ] Marketing opt-in/out

## Integration Requirements
- [ ] Email notifications
  - [ ] Registration confirmation
  - [ ] Payment confirmation
  - [ ] Ticket delivery
  - [ ] Course reminders
  - [ ] Instructor messages
- [ ] Calendar integration (iCal export)
- [ ] PDF generation (tickets, invoices)
- [ ] Wallet integration (Apple Wallet, Google Pay)

## Enhancement Ideas
- [ ] Social features (find dance partners)
- [ ] Review/rating system for courses
- [ ] Personal progress tracking
- [ ] Achievement badges
- [ ] Referral system
- [ ] Loyalty program

## Notes
- Most participants will never have any other role
- This is the most common role in the system
- User experience is critical here (affects reputation)
- Mobile experience is essential (people check tickets on phones)
- Fast ticket access is critical (at door, under time pressure)
- Consider offline functionality (PWA)
- Simple, non-technical interface required
- Clear help/support access
- Multiple languages support (optional, Norwegian first)
