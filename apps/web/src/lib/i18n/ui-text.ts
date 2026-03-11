/**
 * UI Text Constants
 * 
 * Centralized text strings for the application UI.
 * This file serves as a foundation for future i18n implementation.
 * 
 * TODO: Replace with proper i18n library (e.g., next-intl, react-i18next)
 * when internationalization is fully implemented.
 * 
 * Current language: English (en-GB)
 */

export const UI_TEXT = {
  // My Page Navigation
  portal: {
    title: 'My page',
    welcome: 'Welcome back',
  },

  // Tickets Section
  tickets: {
    title: 'My Event Tickets',
    singular: 'ticket',
    plural: 'tickets',
    yourTicket: 'Your ticket:',
    yourTickets: (count: number) => `Your ${count} tickets:`,
    ticketNumber: (num: number) => `Ticket ${num}`,
    showAtCheckIn: 'Show these at check-in',
    noTickets: 'No event tickets',
    noTicketsDescription: "You don't have any event tickets yet",
    browseEvents: 'Browse Events',
    quantity: 'Quantity:',
    date: 'Date:',
    totalPaid: 'Total Paid/Due:',
    downloadPDF: 'Download PDF',
    addToAppleWallet: 'Add to Apple Wallet',
    addToGoogleWallet: 'Add to Google Wallet',
    validFrom: 'Valid from:',
    validUntil: 'Valid until:',
    expired: 'Expired',
    active: 'Active',
  },

  // Courses Section
  courses: {
    title: 'My Course Registrations',
    singular: 'registration',
    plural: 'registrations',
    noCourses: 'No course registrations',
    noCoursesDescription: "You don't have any course registrations yet",
    browseCourses: 'Browse Courses',
    role: 'Role:',
    totalPaid: 'Total Paid/Due:',
  },

  // Memberships Section
  memberships: {
    title: 'My Memberships',
    singular: 'membership',
    plural: 'memberships',
    noMemberships: 'No memberships',
    noMembershipsDescription: "You don't have any active memberships yet",
    browseOrganizations: 'Browse Organizations',
    pendingApproval: 'Pending Approval',
    pendingMessage: (tierName: string) => 
      `Your ${tierName} membership is waiting for validation from an administrator.`,
    pendingNotice: 'You will receive an email notification once your membership has been approved.',
  },

  // Dashboard
  dashboard: {
    eventTickets: 'Event Tickets',
    courses: 'Courses',
    memberships: 'Memberships',
    quickActions: 'Quick Actions',
    browseCourses: 'Browse Courses',
    browseEvents: 'Browse Events',
    settings: 'Settings',
  },

  // Common
  common: {
    backToPortal: 'Back to My page',
    status: 'Status:',
    createdAt: 'Created:',
  },

  // Waitlist
  waitlist: {
    spotOffered: 'Spot Offered!',
    expires: 'Expires',
  },

  // Planned Absence
  absence: {
    title: 'Planned Absence',
    description: (trackTitle: string) => `Notify in advance if you cannot attend a session in ${trackTitle}`,
    registerNew: 'Register New Absence',
    noUpcomingSessions: 'No upcoming sessions to register absence for.',
    date: 'Date',
    selectDate: 'Select date',
    reason: 'Reason',
    selectReason: 'Select reason',
    additionalInfo: 'Additional information',
    additionalInfoPlaceholder: 'Write a brief description...',
    registerButton: 'Register Absence',
    registeredAbsences: 'Registered Absences',
    successCreated: 'Absence registered',
    successDeleted: 'Absence deleted',
    errorLoad: 'Could not load data',
    errorCreate: 'Could not register absence',
    errorDelete: 'Could not delete absence',
    reasons: {
      ILLNESS: 'Illness',
      TRAVEL: 'Travel',
      WORK: 'Work',
      FAMILY: 'Family',
      PERSONAL: 'Personal',
      OTHER: 'Other',
    },
  },

  // Course Filters
  courseFilters: {
    search: 'Search courses...',
    sortBy: 'Sort by',
    sortOptions: {
      current: 'Current/Upcoming first',
      dateAsc: 'Date (oldest first)',
      dateDesc: 'Date (newest first)',
    },
  },

  // Course Templates
  templates: {
    partner: {
      label: 'Partner / Couples',
      description: 'Two-person registration with role-based capacity balancing',
    },
    individual: {
      label: 'Individual Course',
      description: 'Standard recurring course without role-based registration',
    },
    workshop: {
      label: 'Workshop / Single Session',
      description: 'One-time event or intensive session with optional pair pricing',
    },
    dropIn: {
      label: 'Drop-In / Punch Card',
      description: 'Pay-per-session or punch card based attendance',
    },
    virtual: {
      label: 'Virtual / Online',
      description: 'Online course with video meeting integration',
    },
    kidsYouth: {
      label: 'Kids & Youth',
      description: 'Courses for children with age restrictions and parent info',
    },
    team: {
      label: 'Team / Group',
      description: 'Team-based registration with group pricing',
    },
    subscription: {
      label: 'Subscription / Membership',
      description: 'Membership-based access with subscription pricing',
    },
    private: {
      label: 'Private / 1-on-1',
      description: 'Private lessons with instructor booking',
    },
    custom: {
      label: 'Custom',
      description: 'Full control over all settings and fields',
    },
  },

  // Track Form (staffadmin)
  trackForm: {
    // Page titles
    createTitle: 'Create New Track',
    editTitle: 'Edit Track',
    
    // Section titles and descriptions
    sections: {
      courseTypeTitle: 'Course Type',
      courseTypeDescription: 'Define how this course is structured and delivered',
      basicInfoTitle: 'Basic Information',
      basicInfoDescription: 'Course title, description, and hero image',
      scheduleTitle: 'Schedule',
      scheduleDescription: 'When does the course take place?',
      locationTitle: 'Location',
      locationDescription: 'Where does the course take place? Used for Wallet Tickets.',
      locationDescriptionVirtual: 'For virtual / hybrid sessions this is optional — used for Wallet Tickets and check-in geofencing if applicable.',
      capacityTitle: 'Capacity',
      capacityWithRolesTitle: 'Capacity & Roles',
      capacityDescription: 'How many participants can join?',
      rolesTitle: 'Role Balance',
      rolesDescription: 'Configure capacity per role for balanced registration',
      pricingTitle: 'Pricing',
      pricingDescription: 'Set ticket prices for this track',
      pairPricingTitle: 'Pair Pricing',
      pairPricingDescription: 'Optional discounted price when two participants register together',
      teamPricingTitle: 'Team Pricing',
      teamPricingDescription: 'Per-team pricing for group registrations',
      privatePairDescription: 'Pair price for couples booking private lessons together',
      workshopPairDescription: 'Discounted price when two participants register together',
      privateScheduleDescription: 'Define available time slots for booking',
      workshopScheduleDescription: 'Workshops typically have a specific date rather than recurring weekday',
      checkInTitle: 'Self Check-in',
      checkInDescription: 'Allow participants to check themselves in using a QR code or phone number',
      virtualMeetingTitle: 'Virtual Meeting',
      virtualMeetingDescription: 'Configure video meeting details for online participants',
      memberPricingTitle: 'Member Pricing',
      memberPricingDescription: 'Special pricing for members',
    },

    // Field labels
    fields: {
      templateType: 'Course Template',
      templateTypeDescription: 'Determines which fields and options are available',
      deliveryMethod: 'Delivery Method',
      deliveryMethodDescription: 'Virtual/Hybrid will include meeting link fields',
      deliveryMethodVirtualNote: 'Virtual template is always delivered online',
      title: 'Track Title',
      titlePlaceholder: 'Cuban Salsa Level 1',
      description: 'Description',
      descriptionPlaceholder: 'Describe what participants will learn in this course...',
      descriptionHelp: 'Brief description shown on the course detail page',
      levelLabel: 'Level Label',
      levelLabelPlaceholder: 'Beginner',
      levelLabelHelp: 'e.g., Beginner, Intermediate, Advanced',
      heroImage: 'Hero Image',
      heroImageHelp: 'Landscape image for the course header. Recommended: 1600x800px',
      weekday: 'Weekday',
      timeStart: 'Start Time',
      timeEnd: 'End Time',
      capacityTotal: 'Total Capacity',
      capacityRoleA: 'Role A Capacity',
      capacityRoleAHelp: 'Maximum participants for Role A (optional)',
      capacityRoleB: 'Role B Capacity',
      capacityRoleBHelp: 'Maximum participants for Role B (optional)',
      roleALabel: 'Role A Label',
      roleALabelPlaceholder: 'Leader',
      roleALabelHelp: 'Display name for the first role (e.g., Leader, Driver, Mentor)',
      roleBLabel: 'Role B Label',
      roleBLabelPlaceholder: 'Follower',
      roleBLabelHelp: 'Display name for the second role (e.g., Follower, Navigator, Mentee)',
      rolePolicy: 'Role Policy',
      rolePolicyHelp: 'Controls which roles participants can choose',
      waitlistEnabled: 'Enable waitlist when full',
      priceSingle: 'Single Price',
      priceSingleHelp: 'Price per participant in øre (e.g., 20000 = 200 kr)',
      pricePair: 'Pair Price',
      pricePairHelp: 'Discounted price for two participants registering together',
      memberPriceSingle: 'Member Single Price',
      memberPricePair: 'Member Pair Price',
      meetingUrl: 'Meeting URL',
      meetingUrlPlaceholder: 'https://zoom.us/j/...',
      meetingUrlHelp: 'Zoom, Google Meet, or other video conference link',
      meetingPassword: 'Meeting Password',
      meetingPasswordHelp: 'Optional password for the meeting (shown to registered participants)',
      minAge: 'Minimum Age',
      maxAge: 'Maximum Age',
      teamMinSize: 'Minimum Team Size',
      teamMaxSize: 'Maximum Team Size',
      allowSelfCheckIn: 'Enable self check-in for participants',
      allowSelfCheckInHelp: 'When enabled, a public check-in page lets participants scan their ticket QR or enter their phone number.',
      allowDashboardCheckIn: 'Enable dashboard check-in',
      geofenceEnabled: 'Enable geofence validation',
      geofenceRadius: 'Geofence Radius (meters)',
      checkInWindowBefore: 'Check-in window before (minutes)',
      checkInWindowAfter: 'Check-in window after (minutes)',
    },

    // Weekday names
    weekdays: {
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday',
    },

    // Role policy options
    rolePolicies: {
      any: 'Any (No specific ratio)',
      leader: 'Leader Only',
      follower: 'Follower Only',
    },

    // Delivery methods
    deliveryMethods: {
      inPerson: 'In Person',
      virtual: 'Virtual / Online',
      hybrid: 'Hybrid (Participant Chooses)',
    },

    // Help text / tooltips
    help: {
      workshopPairPrice: 'Optional: Offer a discount when two people sign up together',
      teamPrice: 'Price is per team, not per individual',
      privatePairPrice: 'Price for couples booking a private lesson together',
      partnerCapacity: 'Set caps to maintain leader/follower balance',
    },

    // Actions
    actions: {
      create: 'Create Track',
      save: 'Save Changes',
      cancel: 'Cancel',
      delete: 'Delete Track',
    },

    // Validation messages
    validation: {
      titleRequired: 'Title is required',
      capacityRequired: 'Total capacity is required',
      capacityMin: 'Capacity must be at least 1',
      priceRequired: 'Single price is required',
      priceMin: 'Price must be 0 or greater',
      meetingUrlRequired: 'Meeting URL is required for virtual courses',
    },
  },

  // Delivery methods (standalone)
  deliveryMethods: {
    IN_PERSON: 'In Person',
    VIRTUAL: 'Virtual / Online',
    HYBRID: 'Hybrid (Participant Chooses)',
  },
} as const

// Helper function to get count-aware text
export function getCountText(singular: string, plural: string, count: number): string {
  return count === 1 ? singular : plural
}

// Helper function to format ticket label
export function formatTicketLabel(count: number): string {
  return count === 1 ? UI_TEXT.tickets.yourTicket : UI_TEXT.tickets.yourTickets(count)
}
