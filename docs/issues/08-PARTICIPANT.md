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
- [ ] Profile/dashboard for participants
- [ ] View personal data
- [ ] Mobile-optimized interface

### Registration Management (Personal)
- [x] View own registrations (available at `/profile`)
- [ ] View registration status
- [ ] View payment status
- [ ] Download receipts/invoices
- [ ] Cancel registrations (if allowed)
- [ ] Request refunds
- [ ] Modify registration details (before deadline)

### Course Access
- [ ] View enrolled courses/tracks
- [ ] View course schedules
- [ ] View course location/details
- [ ] View instructor information
- [ ] Add courses to personal calendar
- [ ] Receive course notifications

### Ticket Management
- [x] View tickets (TicketQR component exists)
- [ ] Download tickets as PDF
- [ ] Share ticket QR code
- [ ] View ticket validity period
- [ ] Multiple tickets (if multiple registrations)
- [ ] Add ticket to Apple Wallet / Google Pay

### Personal Information
- [ ] Update profile information
  - [ ] Name
  - [ ] Email
  - [ ] Phone number
  - [ ] Emergency contact
  - [ ] Dance experience level
  - [ ] Preferred role (leader/follower)
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
- [ ] Add to cart
- [ ] Apply discount codes
- [ ] Waitlist signup

## Required Routes
- [x] `/profile` - Personal profile & registrations ✅
- [ ] `/profile/settings` - Account settings
- [ ] `/profile/tickets` - All tickets
- [ ] `/profile/attendance` - Attendance history
- [ ] `/profile/invoices` - Payment history
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
✅ **Implemented:**
- Profile page at `/profile`
- View registrations
- TicketQR component
- Public course browsing
- Cart and checkout system
- Registration success page

⬜ **Pending:**
- Edit profile information
- Cancel registrations
- Personal attendance history
- Ticket download/management
- Invoice/receipt download
- Notification preferences

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
