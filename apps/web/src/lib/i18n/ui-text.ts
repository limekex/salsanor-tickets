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
} as const

// Helper function to get count-aware text
export function getCountText(singular: string, plural: string, count: number): string {
  return count === 1 ? singular : plural
}

// Helper function to format ticket label
export function formatTicketLabel(count: number): string {
  return count === 1 ? UI_TEXT.tickets.yourTicket : UI_TEXT.tickets.yourTickets(count)
}
