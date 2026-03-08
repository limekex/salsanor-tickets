# Course Templates & Sign-Up Flows

## Overview

Currently the platform only supports one course "template": **partner dance courses** (couples sign-up). To serve a broader market, we need to support multiple course types with different registration flows and requirements.

## Problem Statement

The current implementation assumes:
- All courses are for couples (leader + follower roles)
- Registration requires pairing participants
- Pricing is per couple or per individual in a role

This doesn't work for:
- Individual courses (yoga, fitness, music lessons)
- Group classes without pairing requirements
- Workshops (single session)
- Drop-in classes (pay per session)
- Kids/youth courses (guardian info required)
- Team-based activities
- And many more...

## Proposed Course Templates

### 1. Blank Canvas (Custom)
```
Type: CUSTOM
Sign-up: Fully configurable
Use cases: Any course type not covered by templates
```
- Organizer defines all fields
- No assumptions about participants
- Maximum flexibility

### 2. Partner Dance (Current)
```
Type: PARTNER_DANCE
Sign-up: Couples or individual with role selection
Use cases: Salsa, bachata, tango, swing, etc.
```
- Leader/Follower roles
- Solo registration with partner matching
- Couple registration (linked tickets)
- Role-based capacity management

### 3. Individual Course
```
Type: INDIVIDUAL
Sign-up: Single participant
Use cases: Yoga, fitness, art classes, music lessons
```
- One registration = one participant
- No roles or pairing
- Simple capacity management
- Optional skill level selection

### 4. Workshop/Masterclass
```
Type: WORKSHOP
Sign-up: Single or couple (configurable)
Use cases: One-time workshops, seminars, masterclasses
```
- Single session (no recurring dates)
- Can have roles (optional)
- Often combined with events
- Early bird / limited seating support

### 5. Drop-In Class
```
Type: DROP_IN
Sign-up: Per session (punch card or single)
Use cases: Open gym, practice sessions, social dancing
```
- No commitment to full period
- Punch card support (10-pack, 5-pack)
- Walk-in / last-minute registration
- Flexible capacity per session

### 6. Kids/Youth Course
```
Type: KIDS_YOUTH
Sign-up: Child + guardian info required
Use cases: Children's dance, sports, art
```
- Participant is a minor
- Guardian contact required
- Emergency contact info
- Age range validation
- Special consent requirements

### 7. Team Activity
```
Type: TEAM
Sign-up: Team registration with roster
Use cases: Team sports, group competitions
```
- Register as a team
- Add team members
- Team-based pricing
- Roster management

## Database Changes

### New Schema

```prisma
enum CourseTemplateType {
  CUSTOM
  PARTNER_DANCE
  INDIVIDUAL
  WORKSHOP
  DROP_IN
  KIDS_YOUTH
  TEAM
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
  
  // Capacity settings
  capacityType    CapacityType        @default(TOTAL)
  
  // Custom fields schema
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
  
  templateType    CourseTemplateType  @default(PARTNER_DANCE)
  templateConfig  Json?               // Template-specific overrides
  
  // For drop-in / punch card
  allowDropIn     Boolean             @default(false)
  dropInPrice     Int?                // Price per single session
  punchCardSizes  Int[]               @default([])  // e.g., [5, 10]
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
  
  createdAt       DateTime  @default(now())
}

// For team courses
model TeamRegistration {
  id              String    @id @default(uuid())
  coursePeriodId  String
  coursePeriod    CoursePeriod @relation(fields: [coursePeriodId], references: [id])
  
  teamName        String
  contactEmail    String
  contactPhone    String?
  
  members         TeamMember[]
  
  createdAt       DateTime  @default(now())
}

model TeamMember {
  id              String    @id @default(uuid())
  teamId          String
  team            TeamRegistration @relation(fields: [teamId], references: [id])
  
  name            String
  email           String?
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
/>

// Shows grid of template cards with icon, name, description
```

### Dynamic Registration Form
```tsx
// Registration form adapts to template type
<CourseRegistrationForm
  template={period.templateType}
  period={period}
  onSubmit={handleRegistration}
/>

// Components:
// - RoleSelector (if requiresRole)
// - PartnerMatcher (if requiresPair)
// - GuardianForm (if requiresGuardian)
// - DropInSelector (if allowDropIn)
// - TeamRosterForm (if TEAM type)
```

### Template-Specific Settings
```tsx
// Course settings adapt to template
<CourseSettings
  template={templateType}
  onChange={updateSettings}
/>

// Shows relevant options per template
```

## Implementation Phases

### Phase 1: Foundation
- [ ] Add CourseTemplateType enum
- [ ] Add templateType to CoursePeriod
- [ ] Create template configuration schema
- [ ] Migrate existing courses to PARTNER_DANCE

### Phase 2: Individual Courses
- [ ] Implement INDIVIDUAL template
- [ ] Simplified registration flow
- [ ] Update capacity management
- [ ] Test with real organizer

### Phase 3: Workshops
- [ ] Implement WORKSHOP template
- [ ] Single-session handling
- [ ] Integration with events

### Phase 4: Drop-In & Punch Cards
- [ ] Implement DROP_IN template
- [ ] Punch card purchase flow
- [ ] Per-session check-in

### Phase 5: Kids/Youth
- [ ] Implement KIDS_YOUTH template
- [ ] Guardian info collection
- [ ] Age validation
- [ ] Consent handling

### Phase 6: Custom & Team
- [ ] Custom template builder
- [ ] Team registration flow
- [ ] Roster management

## API Changes

### Course Creation
```typescript
// POST /api/courses
{
  organizerId: string
  templateType: CourseTemplateType
  name: string
  // ... template-specific config
}
```

### Registration Flow
```typescript
// POST /api/courses/[periodId]/register
{
  templateType: CourseTemplateType
  
  // For PARTNER_DANCE
  role?: 'Leader' | 'Follower'
  partnerId?: string
  
  // For KIDS_YOUTH
  guardian?: {
    name: string
    email: string
    phone: string
    relationship: string
  }
  
  // For TEAM
  team?: {
    name: string
    members: { name: string; email?: string; role?: string }[]
  }
  
  // For DROP_IN
  sessionIds?: string[]  // Specific sessions
  punchCardSize?: number // Or buy punch card
}
```

## Migration Strategy

1. Add `templateType` column with default `PARTNER_DANCE`
2. All existing courses continue to work unchanged
3. New courses can select template type
4. Gradual rollout of new templates

## Success Criteria

- [ ] Organizers can create at least 3 different course types
- [ ] Registration flows adapt to course type
- [ ] Existing partner dance courses unaffected
- [ ] Check-in system works for all types
- [ ] Reports/analytics support all types

## Labels

`enhancement`, `courses`, `major-feature`, `architecture`

## Priority

Medium - Current PARTNER_DANCE template serves primary use case, but expansion needed for market growth.

## Related Issues

- Issue #11 (Organizer Modules) - Templates could be module-gated
- Issue #10 (Code Organization) - Course components need refactoring

