/**
 * Centralized formatting utilities
 * 
 * Import formatters from this file for consistency across the app
 * 
 * @example
 * import { formatPrice, formatEventDate, truncate } from '@/lib/formatters'
 */

// Price formatters
export {
  formatPrice,
  formatPriceFull,
  formatPriceRange,
  formatCurrency,
  formatPercentage,
  parsePriceToCents,
} from './price'

// Date formatters
export {
  formatEventDate,
  formatEventDateTime,
  formatDateShort,
  formatDateTimeShort,
  formatDateNumeric,
  formatTime,
  formatDateRange,
  formatTimeRange,
  formatRelativeTime,
  formatSmartDate,
  formatWeekday,
  formatWeekdayShort,
  parseDate,
} from './date'

// Text formatters
export {
  truncate,
  slugify,
  capitalize,
  capitalizeFirst,
  getInitials,
  pluralize,
  stripHtml,
  formatList,
  escapeHtml,
  formatPhone,
} from './text'
