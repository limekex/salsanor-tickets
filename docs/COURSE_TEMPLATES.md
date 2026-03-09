# Course Templates Reference

**Last Updated**: March 9, 2026  
**Status**: ✅ Active in PR #9

---

## Overview

Course templates define the structure and behavior of different course types. Each template controls:
- Which form sections are visible when creating/editing tracks
- Which fields are available and their defaults
- Default pricing and capacity settings
- Delivery method (in-person, virtual, hybrid)

---

## Template Types

| Template | Label | Description | Icon |
|----------|-------|-------------|------|
| **PARTNER** | Partner / Couples | Pair dancing with leader/follower roles and balanced registration | 👥 Users |
| **INDIVIDUAL** | Individual Course | Standard recurring course without role-based registration | 👤 User |
| **WORKSHOP** | Workshop / Single Session | One-time event or intensive session with optional pair pricing | 📅 Calendar |
| **DROP_IN** | Drop-In / Punch Card | Pay-per-session or punch card based attendance | 🎟️ Ticket |
| **VIRTUAL** | Virtual / Online | Online course with video meeting integration | 📹 Video |
| **KIDS_YOUTH** | Kids & Youth | Courses for children with age restrictions and parent info | 👶 Baby |
| **TEAM** | Team / Group | Team-based registration with group pricing | 👥 UsersRound |
| **SUBSCRIPTION** | Subscription / Membership | Membership-based access with subscription pricing | 💳 CreditCard |
| **PRIVATE** | Private / 1-on-1 | Private lessons with instructor booking | ✅ UserCheck |
| **CUSTOM** | Custom | Full control over all settings and fields | ⚙️ Settings2 |

---

## Section Visibility Matrix

Shows which form sections are visible (✅) or hidden (❌) for each template.

| Template | Roles | Pair Pricing | Schedule | Location | Check-In | Virtual Meeting |
|----------|:-----:|:------------:|:--------:|:--------:|:--------:|:---------------:|
| **PARTNER** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **INDIVIDUAL** | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| **WORKSHOP** | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **DROP_IN** | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| **VIRTUAL** | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| **KIDS_YOUTH** | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| **TEAM** | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **SUBSCRIPTION** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **PRIVATE** | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **CUSTOM** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### Section Descriptions

- **Roles**: Leader/Follower capacity split and role policy (ANY, LEADER_ONLY, FOLLOWER_ONLY, STRICT_BALANCE)
- **Pair Pricing**: Discounted price when two participants register together
- **Schedule**: Weekday selection and time slots
- **Location**: Venue name, address, and map coordinates
- **Check-In**: Self check-in, QR codes, geofencing settings
- **Virtual Meeting**: Zoom/Meet URL and password fields

---

## Field Visibility Matrix

Shows which specific fields are visible (✅) or hidden (❌) for each template.

| Field | PARTNER | INDIVIDUAL | WORKSHOP | DROP_IN | VIRTUAL | KIDS_YOUTH | TEAM | SUBSCRIPTION | PRIVATE | CUSTOM |
|-------|:-------:|:----------:|:--------:|:-------:|:-------:|:----------:|:----:|:------------:|:-------:|:------:|
| **capacityRoleA** | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ |
| **capacityRoleB** | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ |
| **roleALabel** | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ |
| **roleBLabel** | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ |
| **rolePolicy** | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ |
| **pricePairCents** | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **memberPricePairCents** | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **weekday** | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| **meetingUrl** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **meetingPassword** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **minAge** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| **maxAge** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| **teamMinSize** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| **teamMaxSize** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| **requiresInstructor** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

### Configurable Role Labels

Templates with role-based registration (PARTNER, VIRTUAL, SUBSCRIPTION, CUSTOM) support **custom role labels** to adapt to different domains:

| Domain | Role A | Role B |
|--------|--------|--------|
| Dance | Leader | Follower |
| Tennis | Player A | Player B |
| Mentorship | Mentor | Mentee |
| Language | Native Speaker | Learner |
| Driving | Driver | Navigator |

Organizers can set `roleALabel` and `roleBLabel` to customize the terminology displayed to participants.

---

## Default Values

Sensible defaults applied when creating a new track with each template.

| Template | Capacity | Leaders | Followers | Waitlist | Single Price | Pair Price | Delivery |
|----------|:--------:|:-------:|:---------:|:--------:|:------------:|:----------:|:--------:|
| **PARTNER** | 20 | 10 | 10 | ✅ | 200,- | 350,- | In Person |
| **INDIVIDUAL** | 20 | — | — | ✅ | 200,- | — | In Person |
| **WORKSHOP** | 30 | — | — | ✅ | 350,- | 600,- | In Person |
| **DROP_IN** | 50 | — | — | ❌ | 150,- | — | In Person |
| **VIRTUAL** | 100 | — | — | ✅ | 150,- | 250,- | Virtual |
| **KIDS_YOUTH** | 15 | — | — | ✅ | 180,- | — | In Person |
| **TEAM** | 8 teams | — | — | ✅ | 500,- | — | In Person |
| **SUBSCRIPTION** | 30 | — | — | ✅ | 0,- | — | In Person |
| **PRIVATE** | 1 | — | — | ❌ | 800,- | 1000,- | In Person |
| **CUSTOM** | 20 | — | — | ✅ | 200,- | — | In Person |

### Notes on Defaults

- **VIRTUAL**: Higher capacity (100) since there's no physical space constraint
- **KIDS_YOUTH**: Lower capacity (15) for better supervision ratios
- **TEAM**: Capacity refers to number of teams, not individuals
- **SUBSCRIPTION**: Price is 0,- because pricing comes from membership tiers
- **PRIVATE**: Single capacity for one-on-one lessons
- **DROP_IN**: Waitlist disabled since it's pay-per-session

---

## Template Use Cases

### PARTNER — Pair Dancing
Best for: Salsa, Bachata, Tango, Swing, Ballroom  
Features: Leader/follower balance, pair pricing, role-based waitlist

### INDIVIDUAL — Solo Classes
Best for: Yoga, Fitness, Technique classes, Styling  
Features: Simple capacity, no role complexity

### WORKSHOP — One-Time Events
Best for: Weekend intensives, guest instructor visits, bootcamps  
Features: Specific dates (not recurring), pair discount option

### DROP_IN — Flexible Attendance
Best for: Open practice sessions, social dancing, punch cards  
Features: No waitlist, lower per-session pricing

### VIRTUAL — Online Classes
Best for: Remote instruction, hybrid offerings, recorded content  
Features: Meeting URL/password, no location needed, higher capacity

### KIDS_YOUTH — Children's Programs
Best for: Kids classes, teen programs, family courses  
Features: Age restrictions, smaller groups, parent contact fields

### TEAM — Group Registration
Best for: Team competitions, group choreography, performance teams  
Features: Team size limits, per-team pricing

### SUBSCRIPTION — Membership Access
Best for: Unlimited class passes, monthly memberships  
Features: Integrates with membership products, no individual pricing

### PRIVATE — 1-on-1 Lessons
Best for: Private instruction, coaching sessions  
Features: Single capacity, instructor assignment, premium pricing

### CUSTOM — Full Control
Best for: Unique course formats, experimental offerings  
Features: All fields visible, no preset assumptions

---

## Technical Implementation

### Source Files

- **Template Presets**: `apps/web/src/lib/course-templates/index.ts`
- **i18n Labels**: `apps/web/src/lib/i18n/ui-text.ts` → `templates.*`
- **Form Component**: `apps/web/src/app/staffadmin/tracks/staff-track-form.tsx`
- **Zod Schema**: `apps/web/src/lib/schemas/track.ts`

### Database Fields (CourseTrack)

```prisma
model CourseTrack {
  // Template fields
  templateType      CourseTemplateType @default(INDIVIDUAL)
  deliveryMethod    DeliveryMethod     @default(IN_PERSON)
  
  // Role capacity (internally named leaders/followers for legacy reasons)
  capacityLeaders   Int?               // Role A capacity
  capacityFollowers Int?               // Role B capacity
  roleALabel        String?            // Custom label for Role A (e.g., "Leader", "Driver")
  roleBLabel        String?            // Custom label for Role B (e.g., "Follower", "Navigator")
  
  // Virtual meeting (VIRTUAL template)
  meetingUrl        String?
  meetingPassword   String?
  
  // Age restrictions (KIDS_YOUTH template)
  minAge            Int?
  maxAge            Int?
  
  // Team configuration (TEAM template)
  teamMinSize       Int?
  teamMaxSize       Int?
}
```

### Helper Functions

```typescript
import { 
  getTemplatePreset,
  isSectionVisible,
  isFieldVisible 
} from '@/lib/course-templates'

// Get full preset config
const preset = getTemplatePreset('PARTNER')

// Check section visibility
if (isSectionVisible('VIRTUAL', 'virtualMeeting')) {
  // Show meeting URL fields
}

// Check field visibility
if (isFieldVisible('KIDS_YOUTH', 'minAge')) {
  // Show age restriction input
}
```

---

## Delivery Methods

| Method | Description | Use Case |
|--------|-------------|----------|
| **IN_PERSON** | Physical attendance at venue | Default for most templates |
| **VIRTUAL** | Online via video meeting | Remote instruction |
| **HYBRID** | Participant chooses | Flexible offerings |

When **VIRTUAL** template is selected, the delivery method dropdown is automatically set to VIRTUAL and disabled.

---

## Future Enhancements

- [ ] Template-specific custom fields
- [ ] Template inheritance (extend base templates)
- [ ] Organizer-defined custom templates
- [ ] Template analytics (conversion rates per type)
