/**
 * Text formatting and manipulation utilities
 */

/**
 * Truncate text to a maximum length with ellipsis
 * 
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 * 
 * @example
 * truncate("This is a long text", 10) // "This is a..."
 * truncate("Short", 10) // "Short"
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }
  return text.slice(0, maxLength).trim() + '...'
}

/**
 * Generate URL-friendly slug from text
 * 
 * @param text - Text to convert to slug
 * @returns URL-friendly slug
 * 
 * @example
 * slugify("Hello World!") // "hello-world"
 * slugify("Øystein's Café") // "oysteins-cafe"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

/**
 * Capitalize first letter of each word
 * 
 * @param text - Text to capitalize
 * @returns Text with first letter of each word capitalized
 * 
 * @example
 * capitalize("hello world") // "Hello World"
 */
export function capitalize(text: string): string {
  return text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Capitalize only the first letter of the text
 * 
 * @param text - Text to capitalize
 * @returns Text with first letter capitalized
 * 
 * @example
 * capitalizeFirst("hello world") // "Hello world"
 */
export function capitalizeFirst(text: string): string {
  if (!text) return text
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * Get initials from a name
 * 
 * @param name - Full name
 * @param maxLength - Maximum number of initials (default: 2)
 * @returns Initials
 * 
 * @example
 * getInitials("Bjørn Tore Almas") // "BT"
 * getInitials("Bjørn Tore Almas", 3) // "BTA"
 */
export function getInitials(name: string, maxLength: number = 2): string {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, maxLength)
    .join('')
}

/**
 * Pluralize a word based on count
 * 
 * @param count - Number of items
 * @param singular - Singular form of the word
 * @param plural - Plural form of the word (optional, defaults to singular + 's')
 * @returns Pluralized text with count
 * 
 * @example
 * pluralize(1, "ticket") // "1 ticket"
 * pluralize(5, "ticket") // "5 tickets"
 * pluralize(1, "person", "people") // "1 person"
 * pluralize(5, "person", "people") // "5 people"
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  const word = count === 1 ? singular : (plural || `${singular}s`)
  return `${count} ${word}`
}

/**
 * Strip HTML tags from text
 * 
 * @param html - HTML string
 * @returns Plain text without HTML tags
 * 
 * @example
 * stripHtml("<p>Hello <strong>world</strong></p>") // "Hello world"
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '')
}

/**
 * Format a list of items with proper conjunction
 * 
 * @param items - Array of items
 * @param conjunction - Conjunction word (default: "and")
 * @returns Formatted list
 * 
 * @example
 * formatList(["Alice", "Bob"]) // "Alice and Bob"
 * formatList(["Alice", "Bob", "Charlie"]) // "Alice, Bob and Charlie"
 * formatList(["Alice", "Bob"], "or") // "Alice or Bob"
 */
export function formatList(items: string[], conjunction: string = 'and'): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`
  
  const allButLast = items.slice(0, -1).join(', ')
  const last = items[items.length - 1]
  return `${allButLast} ${conjunction} ${last}`
}

/**
 * Escape HTML special characters
 * 
 * @param text - Text to escape
 * @returns Escaped text safe for HTML
 * 
 * @example
 * escapeHtml("<script>alert('xss')</script>") // "&lt;script&gt;alert('xss')&lt;/script&gt;"
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, char => map[char])
}

/**
 * Format phone number for display
 * 
 * @param phone - Phone number
 * @returns Formatted phone number
 * 
 * @example
 * formatPhone("91234567") // "912 34 567"
 * formatPhone("+4791234567") // "+47 912 34 567"
 */
export function formatPhone(phone: string): string {
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '')
  
  // Norwegian mobile number (8 digits)
  if (cleaned.length === 8) {
    return cleaned.replace(/(\d{3})(\d{2})(\d{3})/, '$1 $2 $3')
  }
  
  // Norwegian mobile with country code
  if (cleaned.length === 11 && cleaned.startsWith('+47')) {
    return cleaned.replace(/(\+\d{2})(\d{3})(\d{2})(\d{3})/, '$1 $2 $3 $4')
  }
  
  // Return as-is if format doesn't match
  return phone
}
