/**
 * Date and time formatting utilities
 * 
 * Consistent date formatting across the application using date-fns.
 * Uses English (GB) locale as primary language.
 * TODO: Add i18n support for Norwegian locale
 */

import { format, formatDistance, formatRelative, isToday, isTomorrow, differenceInDays } from 'date-fns'
import { enGB } from 'date-fns/locale'

/**
 * Format event date for display
 * 
 * @param date - Date object or ISO string
 * @returns Formatted date string (e.g., "Saturday, 25 January 2025")
 * 
 * @example
 * formatEventDate(new Date('2025-01-25')) // "Saturday, 25 January 2025"
 */
export function formatEventDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return format(dateObj, 'EEEE, d MMMM yyyy', { locale: enGB })
}

/**
 * Format event date with time
 * 
 * @param date - Date object or ISO string
 * @returns Formatted datetime string (e.g., "Saturday, 25 January 2025 at 19:00")
 * 
 * @example
 * formatEventDateTime(new Date('2025-01-25T19:00:00')) // "Saturday, 25 January 2025 at 19:00"
 */
export function formatEventDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return format(dateObj, "EEEE, d MMMM yyyy 'at' HH:mm", { locale: enGB })
}

/**
 * Format date for compact display
 * 
 * @param date - Date object or ISO string
 * @returns Formatted date string (e.g., "25 Jan 2025")
 * 
 * @example
 * formatDateShort(new Date('2025-01-25')) // "25. jan. 2025"
 */
export function formatDateShort(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return format(dateObj, 'd MMM yyyy', { locale: enGB })
}

/**
 * Format date and time for compact display
 * 
 * @param date - Date object or ISO string
 * @returns Formatted datetime string (e.g., "25 Jan 2025, 19:00")
 * 
 * @example
 * formatDateTimeShort(new Date('2025-01-25T19:00:00')) // "25. jan. 2025, 19:00"
 */
export function formatDateTimeShort(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return format(dateObj, 'd MMM yyyy, HH:mm', { locale: enGB })
}

/**
 * Format time only
 * 
 * @param date - Date object or ISO string
 * @returns Formatted time string (e.g., "19:00")
 * 
 * @example
 * formatTime(new Date('2025-01-25T19:00:00')) // "19:00"
 */
export function formatTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return format(dateObj, 'HH:mm')
}

/**
 * Format date range for periods
 * 
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Formatted date range (e.g., "January 20 - March 15, 2025")
 * 
 * @example
 * formatDateRange(new Date('2025-01-20'), new Date('2025-03-15')) 
 * // "20. januar - 15. mars 2025"
 */
export function formatDateRange(startDate: Date | string, endDate: Date | string): string {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate
  
  // Same year
  if (start.getFullYear() === end.getFullYear()) {
    // Same month
    if (start.getMonth() === end.getMonth()) {
      return `${format(start, 'd', { locale: enGB })}-${format(end, 'd MMMM yyyy', { locale: enGB })}`
    }
    // Different months, same year
    return `${format(start, 'd MMMM', { locale: enGB })} - ${format(end, 'd MMMM yyyy', { locale: enGB })}`
  }
  
  // Different years
  return `${format(start, 'd MMMM yyyy', { locale: enGB })} - ${format(end, 'd MMMM yyyy', { locale: enGB })}`
}

/**
 * Format time range
 * 
 * @param startTime - Start time string (HH:mm)
 * @param endTime - End time string (HH:mm)
 * @returns Formatted time range (e.g., "19:00 - 20:30")
 * 
 * @example
 * formatTimeRange("19:00", "20:30") // "19:00 - 20:30"
 */
export function formatTimeRange(startTime: string, endTime: string): string {
  return `${startTime} - ${endTime}`
}

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 * 
 * @param date - Date object or ISO string
 * @returns Relative time string
 * 
 * @example
 * formatRelativeTime(new Date(Date.now() - 2 * 60 * 60 * 1000)) // "2 hours ago"
 * formatRelativeTime(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)) // "in 3 days"
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return formatDistance(dateObj, new Date(), { addSuffix: true, locale: enGB })
}

/**
 * Format date with smart relative display
 * Shows "Today", "Tomorrow", or formatted date
 * 
 * @param date - Date object or ISO string
 * @returns Smart formatted date
 * 
 * @example
 * formatSmartDate(new Date()) // "Today"
 * formatSmartDate(tomorrow) // "Tomorrow"
 * formatSmartDate(futureDate) // "25 January 2025"
 */
export function formatSmartDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  if (isToday(dateObj)) {
    return 'Today'
  }
  
  if (isTomorrow(dateObj)) {
    return 'Tomorrow'
  }
  
  const days = differenceInDays(dateObj, new Date())
  
  if (days >= 0 && days <= 7) {
    return format(dateObj, 'EEEE', { locale: enGB }) // Day name
  }
  
  return format(dateObj, 'd MMMM yyyy', { locale: enGB })
}

/**
 * Format weekday name
 * 
 * @param weekday - Weekday number (1-7, Monday-Sunday)
 * @returns Weekday name in English
 * 
 * @example
 * formatWeekday(1) // "Monday"
 * formatWeekday(5) // "Friday"
 */
export function formatWeekday(weekday: number): string {
  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  return weekdays[weekday - 1] || '?'
}

/**
 * Format weekday name (short form)
 * 
 * @param weekday - Weekday number (1-7, Monday-Sunday)
 * @returns Short weekday name
 * 
 * @example
 * formatWeekdayShort(1) // "Mon"
 * formatWeekdayShort(5) // "Fri"
 */
export function formatWeekdayShort(weekday: number): string {
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return weekdays[weekday - 1] || '?'
}

/**
 * Parse ISO date string safely
 * 
 * @param dateString - ISO date string
 * @returns Date object or null if invalid
 */
export function parseDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null
  try {
    const date = new Date(dateString)
    return isNaN(date.getTime()) ? null : date
  } catch {
    return null
  }
}

/**
 * Format date in numeric format (Norwegian style)
 * 
 * @param date - Date object or ISO string
 * @returns Formatted date string (e.g., "25.01.2025")
 * 
 * @example
 * formatDateNumeric(new Date('2025-01-25')) // "25.01.2025"
 */
export function formatDateNumeric(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return format(dateObj, 'dd.MM.yyyy')
}
