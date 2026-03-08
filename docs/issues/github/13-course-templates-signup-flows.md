# Course Templates & Sign-Up Flows

## Overview

Currently the platform only supports one course "template": **partner dance courses** (couples sign-up). To serve a broader market, we need to support multiple course types with different registration flows, delivery methods, and requirements.

## Problem Statement

The current implementation assumes:
- All courses are for couples (leader + follower roles)
- Registration requires pairing participants
- Pricing is per couple or per individual in a role
- All courses are in-person

This doesn't work for:

### Sports & Fitness
- Individual fitness classes (yoga, pilates, spinning)
- Personal training sessions (1-on-1 or small groups)
- Team sports (football, volleyball teams)
- Martial arts (belt/level progression)
- Swimming lessons (age groups, skill levels)
- Golf/tennis lessons (equipment rental options)

### Arts & Music
- Music lessons (instrument type, own vs. rental)
- Art classes (materials included or not)
- Photography workshops (bring own camera)
- Choir/ensemble (voice part selection)

### Education & Professional
- Language courses (level testing required)
- Professional certifications (prerequisites)
- Corporate training (bulk/company registration)
- Tutoring (subject selection)

### Virtual & Hybrid
- Live-streamed classes (Zoom/Teams/custom URLs)
- Pre-recorded courses (access periods)
- Hybrid (attend in-person OR online)
- Webinars (one-time, large capacity)

### Lifestyle & Leisure
- Cooking classes (dietary restrictions, allergies)
- Wine tasting (age verification)
- Craft workshops (materials included)
- Book clubs (book purchase option)
- Gaming/esports (gamertag/platform info)

### Kids & Youth
- After-school programs (pickup authorization)
- Summer camps (multi-week, medical info)
- Youth sports (parent consent, emergency contacts)
- Birthday party packages (group booking)

### Partner Activities (Current)
- Partner dance (salsa, bachata, tango)
- Ballroom dancing
- Couples cooking classes
- Partner yoga/acro

## Proposed Course Templates

### 1. Blank Canvas (Custom)
```
Type: CUSTOM
Sign-up: Fully configurable fields
Use cases: Anything not covered by templates
```
- Organizer defines all registration fields
- No assumptions about participants
- Maximum flexibility
- Custom field builder UI

### 2. Individual Course (Most Common)
```
Type: INDIVIDUAL
Sign-up: Single participant, simple form
Use cases: Yoga, fitness, language, art, music, sports
```
- One registration = one participant
- Optional skill/experience level selection
- Optional equipment rental add-ons
- Age group support
- Waitlist capability

### 3. Partner/Couples Course
```
Type: PARTNER
Sign-up: Couples or individual with role selection
Use cases: Partner dance, couples yoga, ballroom
```
- Configurable roles (Leader/Follower, A/B, or custom)
- Solo registration with partner matching
- Couple registration (linked tickets)
- Role-based capacity management

### 4. Virtual/Online Course
```
Type: VIRTUAL
Sign-up: Individual with digital delivery
Use cases: Zoom classes, webinars, live streams, recorded content
```
- Integration fields for meeting URLs
- Support for: Zoom, Teams, Google Meet, custom URLs
- Access code/password delivery
- Time zone handling
- Recording access (if applicable)
- Hybrid option (in-person OR virtual attendance)

### 5. Workshop/Single Session
```
Type: WORKSHOP
Sign-up: One-time event registration
Use cases: Masterclasses, seminars, one-day workshops
```
- Single date (no recurring schedule)
- Early bird pricing support
- Materials/equipment options
- Can be in-person or virtual

### 6. Drop-In / Punch Card
```
Type: DROP_IN
Sign-up: Per session or punch card purchase
Use cases: Open gym, practice sessions, flexible attendance
```
- No commitment to full course
- Punch card support (5-pack, 10-pack, etc.)
- Walk-in / last-minute registration
- Flexible capacity per session
- Expiration dates on punch cards

### 7. Kids/Youth Course
```
Type: KIDS_YOUTH
Sign-up: Minor participant + guardian required
Use cases: Youth sports, music lessons, camps, after-school
```
- Participant age range validation
- Guardian/parent contact required
- Emergency contact information
- Medical info / allergies (optional)
- Pickup authorization list
- Photo/media consent
- Special needs notes

### 8. Team/Group Registration
```
Type: TEAM
Sign-up: Team with roster management
Use cases: Team sports, corporate groups, group bookings
```
- Register as a team/group
- Add/manage team members
- Team-based pricing (per team or per head)
- Roster management
- Team captain designation
- Bulk registration for companies

### 9. Subscription/Membership Course
```
Type: SUBSCRIPTION
Sign-up: Recurring access pass
Use cases: Unlimited monthly classes, gym memberships
```
- Recurring billing (if enabled)
- Access to multiple session types
- Usage tracking
- Pause/cancel options

### 10. Private/1-on-1 Sessions
```
Type: PRIVATE
Sign-up: Book time slots with instructor
Use cases: Personal training, private lessons, coaching
```
- Calendar-based booking
- Instructor selection
- Duration options (30min, 60min, etc.)
- Recurring booking support
- Reschedule/cancel policies

## Database Changes

### New Schema

```prisma
enum CourseTemplateType {
  CUSTOM
  INDIVIDUAL
  PARTNER
  VIRTUAL
  WORKSHOP
  DROP_IN
  KIDS_YOUTH
  TEAM
  SUBSCRIPTION
  PRIVATE
}

enum DeliveryMethod {
  IN_PERSON
  VIRTUAL
  HYBRID       // Participants choose
}

enum VirtualPlatform {
  ZOOM
  TEAMS
  GOOGLE_MEET
  CUSTOM_URL
  RECORDED
}

model CourseTemplate {
  id              String              @id @default(uuid())
  type            CourseTemplateType  @unique
  name            String              // Display name
  description     String?
  icon            String?             // Lucide icon name
  
  // Sign-up configuration
  requiresRole    Boolean             @default(false)
  roles           Json?               // ["Leader", "Follower"] or custom
  requiresPair    Boolean             @default(false)
  requiresGuardian Boolean            @default(false)
  allowDropIn     Boolean             @default(false)
  supportsVirtual Boolean             @default(false)
  
  // Capacity settings
  capacityType    CapacityType        @default(TOTAL)
  
  // Custom fields schema (JSON Schema format)
  participantFields Json?             // Additional fields for participants
  registrationFields Json?            // Additional fields for registration
  
  createdAt       DateTime            @default(now())
}

enum CapacityType {
  TOTAL           // Simple total capacity
  PER_ROLE        // Separate capacity per role
  PER_TEAM        // Team-based capacity
  UNLIMITED       // No capacity limit (drop-in)
}

// Update CoursePeriod
model CoursePeriod {
  // ... existing fields ...
  
  templateType    CourseTemplateType  @default(INDIVIDUAL)
  templateConfig  Json?               // Template-specific overrides
  
  // Delivery method
  deliveryMethod  DeliveryMethod      @default(IN_PERSON)
  
  // Virtual meeting settings (when VIRTUAL or HYBRID)
  virtualPlatform VirtualPlatform?
  meetingUrl      String?             // Zoom/Teams/custom URL
  meetingId       String?             // Optional meeting ID
  meetingPassword String?             // Optional password (encrypted)
  recordingUrl    String?             // For recorded courses
  
  // For drop-in / punch card
  allowDropIn     Boolean             @default(false)
  dropInPrice     Int?                // Price per single session
  punchCardSizes  Int[]               @default([])  // e.g., [5, 10]
  punchCardExpiry Int?                // Days until expiry
  
  // Age restrictions
  minAge          Int?
  maxAge          Int?
  
  // Skill level
  skillLevel      String?             // Beginner, Intermediate, Advanced, etc.
  
  // Equipment/materials
  equipmentIncluded Boolean           @default(false)
  equipmentRental   Boolean           @default(false)
  equipmentRentalPrice Int?
  
  // For PARTNER type - role configuration  
  requiresRole    Boolean             @default(false)
  roles           Json?               // e.g., ["Leader", "Follower"]
  allowSoloSignup Boolean             @default(true)
}

// Virtual session details (per track/session for different meeting links)
model VirtualSession {
  id              String    @id @default(uuid())
  courseTrackId   String
  courseTrack     CourseTrack @relation(fields: [courseTrackId], references: [id])
  
  sessionDate     DateTime
  platform        VirtualPlatform
  meetingUrl      String
  meetingId       String?
  meetingPassword String?
  
  // For recorded sessions
  recordingUrl    String?
  recordingAvailableAt DateTime?
  
  createdAt       DateTime  @default(now())
}

// For kids courses
model GuardianInfo {
  id              String    @id @default(uuid())
  registrationId  String
  registration    CourseRegistration @relation(fields: [registrationId], references: [id])
  
  name            String
  email           String
  phone           String
  relationship    String    // Parent, Guardian, etc.
  isEmergency     Boolean   @default(true)
  
  // For pickup authorization
  authorizedPickup Boolean  @default(false)
  
  createdAt       DateTime  @default(now())
}

// Medical/allergy info for participants (especially youth)
model ParticipantMedicalInfo {
  id              String    @id @default(uuid())
  registrationId  String    @unique
  registration    CourseRegistration @relation(fields: [registrationId], references: [id])
  
  allergies       String?
  medications     String?
  medicalConditions String?
  specialNeeds    String?
  dietaryRestrictions String?
  
  // Consent fields
  photoConsent    Boolean   @default(false)
  mediaConsent    Boolean   @default(false)
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

// For team courses
model TeamRegistration {
  id              String    @id @default(uuid())
  coursePeriodId  String
  coursePeriod    CoursePeriod @relation(fields: [coursePeriodId], references: [id])
  
  teamName        String
  contactEmail    String
  contactPhone    String?
  organizationName String?  // For corporate bookings
  
  members         TeamMember[]
  
  createdAt       DateTime  @default(now())
}

model TeamMember {
  id              String    @id @default(uuid())
  teamId          String
  team            TeamRegistration @relation(fields: [teamId], references: [id])
  
  name            String
  email           String?
  phone           String?
  role            String?   // Captain, Player, etc.
  
  createdAt       DateTime  @default(now())
}
```

## UI Components Needed

### Template Selector (Course Creation)
```tsx
// When creating a new course period
<TemplateSelector 
  onSelect={(type) => setTemplate(type)}
  selected={templateType}
  categories={['common', 'specialized', 'advanced']}
/>

// Shows categorized grid:
// Common: Individual, Workshop, Virtual
// Specialized: Partner, Kids/Youth, Team
// Advanced: Drop-In, Subscription, Private, Custom
```

### Delivery Method Selector
```tsx
// Choose how course is delivered
<DeliveryMethodSelector
  value={deliveryMethod}
  onChange={setDeliveryMethod}
/>

// Options:
// - In-person (default)
// - Virtual (online only)
// - Hybrid (participant chooses)
```

### Virtual Meeting Setup
```tsx
// Configure virtual meeting details
<VirtualMeetingSetup
  platform={platform}
  meetingUrl={meetingUrl}
  onConfigChange={handleConfigChange}
/>

// Platform options: Zoom, Teams, Google Meet, Custom URL
// Auto-generates Zoom meetings (if integrated)
```

### Dynamic Registration Form
```tsx
// Registration form adapts to template type and delivery
<CourseRegistrationForm
  template={period.templateType}
  deliveryMethod={period.deliveryMethod}
  period={period}
  onSubmit={handleRegistration}
/>

// Components:
// - RoleSelector (if PARTNER)
// - PartnerMatcher (if requiresPair)
// - GuardianForm (if KIDS_YOUTH)
// - MedicalInfoForm (if requiresMedical)
// - DropInSelector (if DROP_IN)
// - TeamRosterForm (if TEAM)
// - DeliveryChoice (if HYBRID)
// - TimeSlotPicker (if PRIVATE)
```

### Participant View - Virtual Course
```tsx
// My Courses page shows virtual meeting details
<VirtualCourseCard
  course={course}
  nextSession={nextSession}
/>

// Shows:
// - "Join Meeting" button (clickable before/during class)
// - Platform icon (Zoom/Teams/etc)
// - Meeting ID and password (if applicable)
// - Countdown to next session
```

## Implementation Phases

### Phase 1: Foundation & Migration
- [ ] Add CourseTemplateType enum (start with INDIVIDUAL, PARTNER)
- [ ] Add DeliveryMethod enum
- [ ] Add templateType + deliveryMethod to CoursePeriod
- [ ] Migrate existing courses to PARTNER template
- [ ] Create template selector UI
- [ ] All existing functionality continues working

### Phase 2: Individual Courses
- [ ] Implement INDIVIDUAL template
- [ ] Remove role/partner requirements
- [ ] Simplified registration flow
- [ ] Update cart and checkout
- [ ] Test: yoga, fitness, language course scenarios

### Phase 3: Virtual Courses
- [ ] Implement VIRTUAL template
- [ ] Add meeting URL fields to CoursePeriod
- [ ] VirtualSession model for per-session links
- [ ] Meeting details in participant dashboard
- [ ] "Join Meeting" button logic
- [ ] Platform integrations (Zoom API optional)
- [ ] Test: online webinar scenario

### Phase 4: Hybrid Delivery
- [ ] Implement HYBRID option
- [ ] Participant chooses in-person OR virtual at registration
- [ ] Separate capacity tracking per delivery method
- [ ] Different check-in flows per delivery

### Phase 5: Workshops
- [ ] Implement WORKSHOP template
- [ ] Single-session handling (no tracks)
- [ ] Can be in-person, virtual, or hybrid
- [ ] Integration with Events (workshop at event)

### Phase 6: Drop-In & Punch Cards
- [ ] Implement DROP_IN template
- [ ] Punch card purchase flow
- [ ] Per-session check-in and tracking
- [ ] Punch card expiration handling
- [ ] Walk-in self-registration

### Phase 7: Kids/Youth
- [ ] Implement KIDS_YOUTH template
- [ ] GuardianInfo model and forms
- [ ] Age validation at registration
- [ ] ParticipantMedicalInfo model
- [ ] Consent collection (photo, media)
- [ ] Pickup authorization

### Phase 8: Team/Group
- [ ] Implement TEAM template
- [ ] TeamRegistration model
- [ ] Roster management UI
- [ ] Team capacity (by team or by head count)
- [ ] Corporate/bulk registration

### Phase 9: Advanced Templates
- [ ] SUBSCRIPTION template (recurring access)
- [ ] PRIVATE template (bookable time slots)
- [ ] CUSTOM template (field builder)

### Phase 10: Template Analytics
- [ ] Track which templates are used
- [ ] Registration conversion per template
- [ ] Virtual vs in-person attendance rates

## API Changes

### Course Creation
```typescript
// POST /api/courses
{
  organizerId: string
  templateType: CourseTemplateType  // INDIVIDUAL, PARTNER, VIRTUAL, etc.
  deliveryMethod: DeliveryMethod     // IN_PERSON, VIRTUAL, HYBRID
  name: string
  
  // Virtual settings (if VIRTUAL or HYBRID)
  virtualPlatform?: VirtualPlatform
  meetingUrl?: string
  meetingId?: string
  meetingPassword?: string
  
  // Template-specific config stored in templateConfig JSON
  templateConfig?: {
    roles?: string[]           // For PARTNER
    requiresGuardian?: boolean // For KIDS_YOUTH
    minAge?: number
    maxAge?: number
    skillLevel?: string
    equipmentIncluded?: boolean
    // ... etc
  }
}
```

### Registration Flow
```typescript
// POST /api/courses/[periodId]/register
{
  // Common fields
  participantId?: string
  deliveryPreference?: 'IN_PERSON' | 'VIRTUAL'  // For HYBRID courses
  
  // For PARTNER template
  role?: 'Leader' | 'Follower' | string  // Custom roles
  partnerId?: string                      // Link with partner
  
  // For KIDS_YOUTH template
  guardian?: {
    name: string
    email: string
    phone: string
    relationship: string
  }
  medicalInfo?: {
    allergies?: string
    medications?: string
    medicalConditions?: string
    dietaryRestrictions?: string
    photoConsent: boolean
  }
  
  // For TEAM template
  team?: {
    name: string
    organizationName?: string
    members: { name: string; email?: string; phone?: string; role?: string }[]
  }
  
  // For DROP_IN template
  sessionIds?: string[]   // Specific sessions to attend
  punchCardSize?: number  // Buy a punch card (5, 10, etc.)
  
  // For PRIVATE template
  preferredTimeSlots?: { date: string; time: string }[]
  instructorId?: string
}
```

### Virtual Meeting Endpoints
```typescript
// GET /api/courses/[periodId]/meeting
// Returns meeting details for registered participants
{
  platform: VirtualPlatform
  meetingUrl: string
  meetingId?: string
  meetingPassword?: string
  nextSessionDate: string
  canJoin: boolean  // Based on time window
}

// POST /api/courses/[trackId]/sessions/[sessionId]/virtual
// Update meeting details for a specific session (org admin)
{
  meetingUrl: string
  meetingId?: string
  meetingPassword?: string
}
```

## Migration Strategy

1. Add `templateType` column with default `INDIVIDUAL` for new courses
2. Add `deliveryMethod` column with default `IN_PERSON`
3. Migrate existing dance courses to `PARTNER` template
4. All existing functionality continues unchanged
5. New templates rolled out incrementally
6. Feature flag per template for gradual enablement

## Success Criteria

- [ ] Organizers can create at least 5 different course types
- [ ] Registration flows adapt to template type
- [ ] Virtual courses show meeting links to participants
- [ ] Hybrid courses allow participant choice
- [ ] Existing partner dance courses unaffected
- [ ] Check-in system works for all delivery methods
- [ ] Kids courses collect guardian/medical info
- [ ] Team registration manages rosters
- [ ] Reports/analytics support all types
- [ ] Drop-in / punch cards track usage

## Labels

`enhancement`, `courses`, `major-feature`, `architecture`

## Priority

**High** - Expanding beyond partner dance is critical for market growth and serving diverse organizers (sports, fitness, education, virtual learning).

## Related Issues

- Issue #11 (Organizer Modules) - Templates could be module-gated (e.g., Virtual courses as add-on)
- Issue #10 (Code Organization) - Course components need refactoring to support templates
- Check-in system (current PR) - Needs to work with all delivery methods

