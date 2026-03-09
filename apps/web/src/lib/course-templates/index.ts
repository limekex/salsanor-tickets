/**
 * Course Template Presets
 * 
 * Defines which fields are visible, required, or hidden for each template type,
 * plus sensible defaults. This drives dynamic form rendering.
 * 
 * i18n-ready: All labels reference UI_TEXT keys
 */

import type { CourseTemplateType, DeliveryMethod } from '@salsanor/database'

/**
 * Field visibility modes
 */
export type FieldVisibility = 'visible' | 'hidden' | 'readonly'

/**
 * Field configuration for a template
 */
export interface FieldConfig {
  visibility: FieldVisibility
  required?: boolean
  defaultValue?: unknown
  helpKey?: string // i18n key for contextual help
}

/**
 * Section visibility - entire card sections in the form
 */
export interface SectionConfig {
  visibility: FieldVisibility
  titleKey: string // i18n key for section title
  descriptionKey?: string // i18n key for section description
}

/**
 * Complete template preset definition
 */
export interface TemplatePreset {
  type: CourseTemplateType
  labelKey: string // i18n key
  descriptionKey: string // i18n key for tooltip/description
  iconName: string // Lucide icon name
  defaultDeliveryMethod: DeliveryMethod
  
  // Section visibility
  sections: {
    roles: SectionConfig
    pairPricing: SectionConfig
    schedule: SectionConfig
    location: SectionConfig
    checkIn: SectionConfig
    virtualMeeting: SectionConfig
    slotBooking: SectionConfig // PRIVATE template slot-based scheduling
  }
  
  // Field-level config (overrides section defaults)
  fields: {
    // Capacity & Roles
    capacityLeaders: FieldConfig
    capacityFollowers: FieldConfig
    rolePolicy: FieldConfig
    
    // Pricing
    pricePairCents: FieldConfig
    memberPricePairCents: FieldConfig
    
    // Schedule
    weekday: FieldConfig
    isRecurring: FieldConfig
    
    // Virtual
    meetingUrl: FieldConfig
    meetingPassword: FieldConfig
    
    // Special
    requiresInstructor: FieldConfig
    minAge: FieldConfig
    maxAge: FieldConfig
    teamMinSize: FieldConfig
    teamMaxSize: FieldConfig
    
    // Slot booking (PRIVATE template)
    slotStartTime: FieldConfig
    slotDurationMinutes: FieldConfig
    slotBreakMinutes: FieldConfig
    slotCount: FieldConfig
    pricePerSlotCents: FieldConfig
    maxContinuousSlots: FieldConfig
  }
  
  // Default values for new tracks
  defaults: {
    capacityTotal: number
    capacityLeaders?: number
    capacityFollowers?: number
    waitlistEnabled: boolean
    priceSingleCents: number
    pricePairCents?: number
  }
}

/**
 * Template presets for all course types
 */
export const TEMPLATE_PRESETS: Record<CourseTemplateType, TemplatePreset> = {
  PARTNER: {
    type: 'PARTNER',
    labelKey: 'templates.partner.label',
    descriptionKey: 'templates.partner.description',
    iconName: 'Users',
    defaultDeliveryMethod: 'IN_PERSON',
    sections: {
      roles: { visibility: 'visible', titleKey: 'trackForm.sections.rolesTitle', descriptionKey: 'trackForm.sections.rolesDescription' },
      pairPricing: { visibility: 'visible', titleKey: 'trackForm.sections.pairPricingTitle' },
      schedule: { visibility: 'visible', titleKey: 'trackForm.sections.scheduleTitle' },
      location: { visibility: 'visible', titleKey: 'trackForm.sections.locationTitle' },
      checkIn: { visibility: 'visible', titleKey: 'trackForm.sections.checkInTitle' },
      virtualMeeting: { visibility: 'hidden', titleKey: 'trackForm.sections.virtualMeetingTitle' },
      slotBooking: { visibility: 'hidden', titleKey: 'trackForm.sections.slotBookingTitle' },
    },
    fields: {
      capacityLeaders: { visibility: 'visible', required: false, defaultValue: 10 },
      capacityFollowers: { visibility: 'visible', required: false, defaultValue: 10 },
      rolePolicy: { visibility: 'visible', required: true, defaultValue: 'ANY' },
      pricePairCents: { visibility: 'visible', required: false },
      memberPricePairCents: { visibility: 'visible', required: false },
      weekday: { visibility: 'visible', required: true },
      isRecurring: { visibility: 'readonly', defaultValue: true },
      meetingUrl: { visibility: 'hidden' },
      meetingPassword: { visibility: 'hidden' },
      requiresInstructor: { visibility: 'hidden' },
      minAge: { visibility: 'hidden' },
      maxAge: { visibility: 'hidden' },
      teamMinSize: { visibility: 'hidden' },
      teamMaxSize: { visibility: 'hidden' },
      slotStartTime: { visibility: 'hidden' },
      slotDurationMinutes: { visibility: 'hidden' },
      slotBreakMinutes: { visibility: 'hidden' },
      slotCount: { visibility: 'hidden' },
      pricePerSlotCents: { visibility: 'hidden' },
      maxContinuousSlots: { visibility: 'hidden' },
    },
    defaults: {
      capacityTotal: 20,
      capacityLeaders: 10,
      capacityFollowers: 10,
      waitlistEnabled: true,
      priceSingleCents: 20000,
      pricePairCents: 35000,
    },
  },

  INDIVIDUAL: {
    type: 'INDIVIDUAL',
    labelKey: 'templates.individual.label',
    descriptionKey: 'templates.individual.description',
    iconName: 'User',
    defaultDeliveryMethod: 'IN_PERSON',
    sections: {
      roles: { visibility: 'hidden', titleKey: 'trackForm.sections.rolesTitle' },
      pairPricing: { visibility: 'hidden', titleKey: 'trackForm.sections.pairPricingTitle' },
      schedule: { visibility: 'visible', titleKey: 'trackForm.sections.scheduleTitle' },
      location: { visibility: 'visible', titleKey: 'trackForm.sections.locationTitle' },
      checkIn: { visibility: 'visible', titleKey: 'trackForm.sections.checkInTitle' },
      virtualMeeting: { visibility: 'hidden', titleKey: 'trackForm.sections.virtualMeetingTitle' },
      slotBooking: { visibility: 'hidden', titleKey: 'trackForm.sections.slotBookingTitle' },
    },
    fields: {
      capacityLeaders: { visibility: 'hidden' },
      capacityFollowers: { visibility: 'hidden' },
      rolePolicy: { visibility: 'hidden' },
      pricePairCents: { visibility: 'hidden' },
      memberPricePairCents: { visibility: 'hidden' },
      weekday: { visibility: 'visible', required: true },
      isRecurring: { visibility: 'readonly', defaultValue: true },
      meetingUrl: { visibility: 'hidden' },
      meetingPassword: { visibility: 'hidden' },
      requiresInstructor: { visibility: 'hidden' },
      minAge: { visibility: 'hidden' },
      maxAge: { visibility: 'hidden' },
      teamMinSize: { visibility: 'hidden' },
      teamMaxSize: { visibility: 'hidden' },
      slotStartTime: { visibility: 'hidden' },
      slotDurationMinutes: { visibility: 'hidden' },
      slotBreakMinutes: { visibility: 'hidden' },
      slotCount: { visibility: 'hidden' },
      pricePerSlotCents: { visibility: 'hidden' },
      maxContinuousSlots: { visibility: 'hidden' },
    },
    defaults: {
      capacityTotal: 20,
      waitlistEnabled: true,
      priceSingleCents: 20000,
    },
  },

  WORKSHOP: {
    type: 'WORKSHOP',
    labelKey: 'templates.workshop.label',
    descriptionKey: 'templates.workshop.description',
    iconName: 'Calendar',
    defaultDeliveryMethod: 'IN_PERSON',
    sections: {
      roles: { visibility: 'hidden', titleKey: 'trackForm.sections.rolesTitle' },
      pairPricing: { visibility: 'visible', titleKey: 'trackForm.sections.pairPricingTitle', descriptionKey: 'trackForm.sections.workshopPairDescription' },
      schedule: { visibility: 'visible', titleKey: 'trackForm.sections.scheduleTitle', descriptionKey: 'trackForm.sections.workshopScheduleDescription' },
      location: { visibility: 'visible', titleKey: 'trackForm.sections.locationTitle' },
      checkIn: { visibility: 'visible', titleKey: 'trackForm.sections.checkInTitle' },
      virtualMeeting: { visibility: 'hidden', titleKey: 'trackForm.sections.virtualMeetingTitle' },
      slotBooking: { visibility: 'hidden', titleKey: 'trackForm.sections.slotBookingTitle' },
    },
    fields: {
      capacityLeaders: { visibility: 'hidden' },
      capacityFollowers: { visibility: 'hidden' },
      rolePolicy: { visibility: 'hidden' },
      pricePairCents: { visibility: 'visible', required: false, helpKey: 'trackForm.help.workshopPairPrice' },
      memberPricePairCents: { visibility: 'visible', required: false },
      weekday: { visibility: 'hidden' }, // Workshops use specific dates, not recurring weekdays
      isRecurring: { visibility: 'readonly', defaultValue: false },
      meetingUrl: { visibility: 'hidden' },
      meetingPassword: { visibility: 'hidden' },
      requiresInstructor: { visibility: 'hidden' },
      minAge: { visibility: 'hidden' },
      maxAge: { visibility: 'hidden' },
      teamMinSize: { visibility: 'hidden' },
      teamMaxSize: { visibility: 'hidden' },
      slotStartTime: { visibility: 'hidden' },
      slotDurationMinutes: { visibility: 'hidden' },
      slotBreakMinutes: { visibility: 'hidden' },
      slotCount: { visibility: 'hidden' },
      pricePerSlotCents: { visibility: 'hidden' },
      maxContinuousSlots: { visibility: 'hidden' },
    },
    defaults: {
      capacityTotal: 30,
      waitlistEnabled: true,
      priceSingleCents: 35000,
      pricePairCents: 60000,
    },
  },

  DROP_IN: {
    type: 'DROP_IN',
    labelKey: 'templates.dropIn.label',
    descriptionKey: 'templates.dropIn.description',
    iconName: 'Ticket',
    defaultDeliveryMethod: 'IN_PERSON',
    sections: {
      roles: { visibility: 'hidden', titleKey: 'trackForm.sections.rolesTitle' },
      pairPricing: { visibility: 'hidden', titleKey: 'trackForm.sections.pairPricingTitle' },
      schedule: { visibility: 'visible', titleKey: 'trackForm.sections.scheduleTitle' },
      location: { visibility: 'visible', titleKey: 'trackForm.sections.locationTitle' },
      checkIn: { visibility: 'visible', titleKey: 'trackForm.sections.checkInTitle' },
      virtualMeeting: { visibility: 'hidden', titleKey: 'trackForm.sections.virtualMeetingTitle' },
      slotBooking: { visibility: 'hidden', titleKey: 'trackForm.sections.slotBookingTitle' },
    },
    fields: {
      capacityLeaders: { visibility: 'hidden' },
      capacityFollowers: { visibility: 'hidden' },
      rolePolicy: { visibility: 'hidden' },
      pricePairCents: { visibility: 'hidden' },
      memberPricePairCents: { visibility: 'hidden' },
      weekday: { visibility: 'visible', required: true },
      isRecurring: { visibility: 'readonly', defaultValue: true },
      meetingUrl: { visibility: 'hidden' },
      meetingPassword: { visibility: 'hidden' },
      requiresInstructor: { visibility: 'hidden' },
      minAge: { visibility: 'hidden' },
      maxAge: { visibility: 'hidden' },
      teamMinSize: { visibility: 'hidden' },
      teamMaxSize: { visibility: 'hidden' },
      slotStartTime: { visibility: 'hidden' },
      slotDurationMinutes: { visibility: 'hidden' },
      slotBreakMinutes: { visibility: 'hidden' },
      slotCount: { visibility: 'hidden' },
      pricePerSlotCents: { visibility: 'hidden' },
      maxContinuousSlots: { visibility: 'hidden' },
    },
    defaults: {
      capacityTotal: 50,
      waitlistEnabled: false, // Drop-in usually doesn't need waitlist
      priceSingleCents: 15000,
    },
  },

  VIRTUAL: {
    type: 'VIRTUAL',
    labelKey: 'templates.virtual.label',
    descriptionKey: 'templates.virtual.description',
    iconName: 'Video',
    defaultDeliveryMethod: 'VIRTUAL',
    sections: {
      roles: { visibility: 'visible', titleKey: 'trackForm.sections.rolesTitle' },
      pairPricing: { visibility: 'visible', titleKey: 'trackForm.sections.pairPricingTitle' },
      schedule: { visibility: 'visible', titleKey: 'trackForm.sections.scheduleTitle' },
      location: { visibility: 'hidden', titleKey: 'trackForm.sections.locationTitle' },
      checkIn: { visibility: 'hidden', titleKey: 'trackForm.sections.checkInTitle' },
      virtualMeeting: { visibility: 'visible', titleKey: 'trackForm.sections.virtualMeetingTitle', descriptionKey: 'trackForm.sections.virtualMeetingDescription' },
      slotBooking: { visibility: 'hidden', titleKey: 'trackForm.sections.slotBookingTitle' },
    },
    fields: {
      capacityLeaders: { visibility: 'visible', required: false },
      capacityFollowers: { visibility: 'visible', required: false },
      rolePolicy: { visibility: 'visible', required: true, defaultValue: 'ANY' },
      pricePairCents: { visibility: 'visible', required: false },
      memberPricePairCents: { visibility: 'visible', required: false },
      weekday: { visibility: 'visible', required: true },
      isRecurring: { visibility: 'readonly', defaultValue: true },
      meetingUrl: { visibility: 'visible', required: true },
      meetingPassword: { visibility: 'visible', required: false },
      requiresInstructor: { visibility: 'hidden' },
      minAge: { visibility: 'hidden' },
      maxAge: { visibility: 'hidden' },
      teamMinSize: { visibility: 'hidden' },
      teamMaxSize: { visibility: 'hidden' },
      slotStartTime: { visibility: 'hidden' },
      slotDurationMinutes: { visibility: 'hidden' },
      slotBreakMinutes: { visibility: 'hidden' },
      slotCount: { visibility: 'hidden' },
      pricePerSlotCents: { visibility: 'hidden' },
      maxContinuousSlots: { visibility: 'hidden' },
    },
    defaults: {
      capacityTotal: 100, // Virtual can handle more
      waitlistEnabled: true,
      priceSingleCents: 15000,
      pricePairCents: 25000,
    },
  },

  KIDS_YOUTH: {
    type: 'KIDS_YOUTH',
    labelKey: 'templates.kidsYouth.label',
    descriptionKey: 'templates.kidsYouth.description',
    iconName: 'Baby',
    defaultDeliveryMethod: 'IN_PERSON',
    sections: {
      roles: { visibility: 'hidden', titleKey: 'trackForm.sections.rolesTitle' },
      pairPricing: { visibility: 'hidden', titleKey: 'trackForm.sections.pairPricingTitle' },
      schedule: { visibility: 'visible', titleKey: 'trackForm.sections.scheduleTitle' },
      location: { visibility: 'visible', titleKey: 'trackForm.sections.locationTitle' },
      checkIn: { visibility: 'visible', titleKey: 'trackForm.sections.checkInTitle' },
      virtualMeeting: { visibility: 'hidden', titleKey: 'trackForm.sections.virtualMeetingTitle' },
      slotBooking: { visibility: 'hidden', titleKey: 'trackForm.sections.slotBookingTitle' },
    },
    fields: {
      capacityLeaders: { visibility: 'hidden' },
      capacityFollowers: { visibility: 'hidden' },
      rolePolicy: { visibility: 'hidden' },
      pricePairCents: { visibility: 'hidden' },
      memberPricePairCents: { visibility: 'hidden' },
      weekday: { visibility: 'visible', required: true },
      isRecurring: { visibility: 'readonly', defaultValue: true },
      meetingUrl: { visibility: 'hidden' },
      meetingPassword: { visibility: 'hidden' },
      requiresInstructor: { visibility: 'hidden' },
      minAge: { visibility: 'visible', required: false, defaultValue: 6 },
      maxAge: { visibility: 'visible', required: false, defaultValue: 12 },
      teamMinSize: { visibility: 'hidden' },
      teamMaxSize: { visibility: 'hidden' },
      slotStartTime: { visibility: 'hidden' },
      slotDurationMinutes: { visibility: 'hidden' },
      slotBreakMinutes: { visibility: 'hidden' },
      slotCount: { visibility: 'hidden' },
      pricePerSlotCents: { visibility: 'hidden' },
      maxContinuousSlots: { visibility: 'hidden' },
    },
    defaults: {
      capacityTotal: 15, // Smaller groups for kids
      waitlistEnabled: true,
      priceSingleCents: 18000,
    },
  },

  TEAM: {
    type: 'TEAM',
    labelKey: 'templates.team.label',
    descriptionKey: 'templates.team.description',
    iconName: 'UsersRound',
    defaultDeliveryMethod: 'IN_PERSON',
    sections: {
      roles: { visibility: 'hidden', titleKey: 'trackForm.sections.rolesTitle' },
      pairPricing: { visibility: 'hidden', titleKey: 'trackForm.sections.teamPricingTitle', descriptionKey: 'trackForm.sections.teamPricingDescription' },
      schedule: { visibility: 'visible', titleKey: 'trackForm.sections.scheduleTitle' },
      location: { visibility: 'visible', titleKey: 'trackForm.sections.locationTitle' },
      checkIn: { visibility: 'visible', titleKey: 'trackForm.sections.checkInTitle' },
      virtualMeeting: { visibility: 'hidden', titleKey: 'trackForm.sections.virtualMeetingTitle' },
      slotBooking: { visibility: 'hidden', titleKey: 'trackForm.sections.slotBookingTitle' },
    },
    fields: {
      capacityLeaders: { visibility: 'hidden' },
      capacityFollowers: { visibility: 'hidden' },
      rolePolicy: { visibility: 'hidden' },
      pricePairCents: { visibility: 'hidden', required: false, helpKey: 'trackForm.help.teamPrice' },
      memberPricePairCents: { visibility: 'hidden', required: false },
      weekday: { visibility: 'visible', required: true },
      isRecurring: { visibility: 'readonly', defaultValue: true },
      meetingUrl: { visibility: 'hidden' },
      meetingPassword: { visibility: 'hidden' },
      requiresInstructor: { visibility: 'hidden' },
      minAge: { visibility: 'hidden' },
      maxAge: { visibility: 'hidden' },
      teamMinSize: { visibility: 'visible', required: false, defaultValue: 4 },
      teamMaxSize: { visibility: 'visible', required: false, defaultValue: 8 },
      slotStartTime: { visibility: 'hidden' },
      slotDurationMinutes: { visibility: 'hidden' },
      slotBreakMinutes: { visibility: 'hidden' },
      slotCount: { visibility: 'hidden' },
      pricePerSlotCents: { visibility: 'hidden' },
      maxContinuousSlots: { visibility: 'hidden' },
    },
    defaults: {
      capacityTotal: 8, // Number of teams, not individuals
      waitlistEnabled: true,
      priceSingleCents: 50000, // Per team
    },
  },

  SUBSCRIPTION: {
    type: 'SUBSCRIPTION',
    labelKey: 'templates.subscription.label',
    descriptionKey: 'templates.subscription.description',
    iconName: 'CreditCard',
    defaultDeliveryMethod: 'IN_PERSON',
    sections: {
      roles: { visibility: 'visible', titleKey: 'trackForm.sections.rolesTitle' },
      pairPricing: { visibility: 'visible', titleKey: 'trackForm.sections.pairPricingTitle' },
      schedule: { visibility: 'visible', titleKey: 'trackForm.sections.scheduleTitle' },
      location: { visibility: 'visible', titleKey: 'trackForm.sections.locationTitle' },
      checkIn: { visibility: 'visible', titleKey: 'trackForm.sections.checkInTitle' },
      virtualMeeting: { visibility: 'hidden', titleKey: 'trackForm.sections.virtualMeetingTitle' },
      slotBooking: { visibility: 'hidden', titleKey: 'trackForm.sections.slotBookingTitle' },
    },
    fields: {
      capacityLeaders: { visibility: 'visible', required: false },
      capacityFollowers: { visibility: 'visible', required: false },
      rolePolicy: { visibility: 'visible', required: true, defaultValue: 'ANY' },
      pricePairCents: { visibility: 'visible', required: false },
      memberPricePairCents: { visibility: 'visible', required: false },
      weekday: { visibility: 'visible', required: true },
      isRecurring: { visibility: 'readonly', defaultValue: true },
      meetingUrl: { visibility: 'hidden' },
      meetingPassword: { visibility: 'hidden' },
      requiresInstructor: { visibility: 'hidden' },
      minAge: { visibility: 'hidden' },
      maxAge: { visibility: 'hidden' },
      teamMinSize: { visibility: 'hidden' },
      teamMaxSize: { visibility: 'hidden' },
      slotStartTime: { visibility: 'hidden' },
      slotDurationMinutes: { visibility: 'hidden' },
      slotBreakMinutes: { visibility: 'hidden' },
      slotCount: { visibility: 'hidden' },
      pricePerSlotCents: { visibility: 'hidden' },
      maxContinuousSlots: { visibility: 'hidden' },
    },
    defaults: {
      capacityTotal: 30,
      waitlistEnabled: true,
      priceSingleCents: 0, // Subscription uses membership pricing
    },
  },

  PRIVATE: {
    type: 'PRIVATE',
    labelKey: 'templates.private.label',
    descriptionKey: 'templates.private.description',
    iconName: 'UserCheck',
    defaultDeliveryMethod: 'IN_PERSON',
    sections: {
      roles: { visibility: 'hidden', titleKey: 'trackForm.sections.rolesTitle' },
      pairPricing: { visibility: 'hidden', titleKey: 'trackForm.sections.pairPricingTitle' }, // Not used - slot booking handles pricing
      schedule: { visibility: 'hidden', titleKey: 'trackForm.sections.scheduleTitle' }, // Not used - slot booking handles time
      location: { visibility: 'visible', titleKey: 'trackForm.sections.locationTitle' },
      checkIn: { visibility: 'hidden', titleKey: 'trackForm.sections.checkInTitle' },
      virtualMeeting: { visibility: 'hidden', titleKey: 'trackForm.sections.virtualMeetingTitle' },
      slotBooking: { visibility: 'visible', titleKey: 'trackForm.sections.slotBookingTitle', descriptionKey: 'trackForm.sections.slotBookingDescription' },
    },
    fields: {
      capacityLeaders: { visibility: 'hidden' },
      capacityFollowers: { visibility: 'hidden' },
      rolePolicy: { visibility: 'hidden' },
      pricePairCents: { visibility: 'hidden' },
      memberPricePairCents: { visibility: 'hidden' },
      weekday: { visibility: 'hidden' }, // Private lessons use slot booking
      isRecurring: { visibility: 'readonly', defaultValue: false },
      meetingUrl: { visibility: 'hidden' },
      meetingPassword: { visibility: 'hidden' },
      requiresInstructor: { visibility: 'hidden' },
      minAge: { visibility: 'hidden' },
      maxAge: { visibility: 'hidden' },
      teamMinSize: { visibility: 'hidden' },
      teamMaxSize: { visibility: 'hidden' },
      slotStartTime: { visibility: 'visible', required: true, defaultValue: '12:00' },
      slotDurationMinutes: { visibility: 'visible', required: true, defaultValue: 30 },
      slotBreakMinutes: { visibility: 'visible', required: false, defaultValue: 0 },
      slotCount: { visibility: 'visible', required: true, defaultValue: 8 },
      pricePerSlotCents: { visibility: 'visible', required: true, defaultValue: 50000 },
      maxContinuousSlots: { visibility: 'visible', required: false, defaultValue: 2 },
    },
    defaults: {
      capacityTotal: 24, // Max slots per day (for capacity planning)
      waitlistEnabled: false,
      priceSingleCents: 0, // Not used - pricePerSlotCents handles pricing
    },
  },

  CUSTOM: {
    type: 'CUSTOM',
    labelKey: 'templates.custom.label',
    descriptionKey: 'templates.custom.description',
    iconName: 'Settings2',
    defaultDeliveryMethod: 'IN_PERSON',
    sections: {
      roles: { visibility: 'visible', titleKey: 'trackForm.sections.rolesTitle' },
      pairPricing: { visibility: 'visible', titleKey: 'trackForm.sections.pairPricingTitle' },
      schedule: { visibility: 'visible', titleKey: 'trackForm.sections.scheduleTitle' },
      location: { visibility: 'visible', titleKey: 'trackForm.sections.locationTitle' },
      checkIn: { visibility: 'visible', titleKey: 'trackForm.sections.checkInTitle' },
      virtualMeeting: { visibility: 'visible', titleKey: 'trackForm.sections.virtualMeetingTitle' },
      slotBooking: { visibility: 'hidden', titleKey: 'trackForm.sections.slotBookingTitle' },
    },
    fields: {
      capacityLeaders: { visibility: 'visible', required: false },
      capacityFollowers: { visibility: 'visible', required: false },
      rolePolicy: { visibility: 'visible', required: false, defaultValue: 'ANY' },
      pricePairCents: { visibility: 'visible', required: false },
      memberPricePairCents: { visibility: 'visible', required: false },
      weekday: { visibility: 'visible', required: true },
      isRecurring: { visibility: 'visible', defaultValue: true },
      meetingUrl: { visibility: 'visible', required: false },
      meetingPassword: { visibility: 'visible', required: false },
      requiresInstructor: { visibility: 'visible', required: false },
      minAge: { visibility: 'visible', required: false },
      maxAge: { visibility: 'visible', required: false },
      teamMinSize: { visibility: 'visible', required: false },
      teamMaxSize: { visibility: 'visible', required: false },
      slotStartTime: { visibility: 'visible', required: false },
      slotDurationMinutes: { visibility: 'visible', required: false },
      slotBreakMinutes: { visibility: 'visible', required: false },
      slotCount: { visibility: 'visible', required: false },
      pricePerSlotCents: { visibility: 'visible', required: false },
      maxContinuousSlots: { visibility: 'visible', required: false },
    },
    defaults: {
      capacityTotal: 20,
      waitlistEnabled: true,
      priceSingleCents: 20000,
    },
  },
}

/**
 * Get preset for a template type
 */
export function getTemplatePreset(type: CourseTemplateType): TemplatePreset {
  return TEMPLATE_PRESETS[type]
}

/**
 * Check if a section is visible for a template
 */
export function isSectionVisible(
  type: CourseTemplateType,
  section: keyof TemplatePreset['sections']
): boolean {
  return TEMPLATE_PRESETS[type].sections[section].visibility === 'visible'
}

/**
 * Check if a field is visible for a template
 */
export function isFieldVisible(
  type: CourseTemplateType,
  field: keyof TemplatePreset['fields']
): boolean {
  return TEMPLATE_PRESETS[type].fields[field].visibility === 'visible'
}

/**
 * Get default values for a template
 */
export function getTemplateDefaults(type: CourseTemplateType): TemplatePreset['defaults'] {
  return TEMPLATE_PRESETS[type].defaults
}
