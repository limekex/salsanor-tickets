/**
 * Internationalization (i18n) module
 * 
 * This module provides centralized text strings and will be the foundation
 * for future internationalization support.
 * 
 * Current implementation: English-only with i18n-ready structure
 * Future: Integration with i18n library (next-intl, react-i18next, etc.)
 */

export { UI_TEXT, getCountText, formatTicketLabel } from './ui-text'

/**
 * Get a text value from UI_TEXT using a dot-notation key
 * This prepares for future i18n library integration
 * 
 * @example
 * t('templates.partner.label') // Returns 'Partner / Couples'
 * t('trackForm.fields.title') // Returns 'Track Title'
 */
export function t(key: string): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { UI_TEXT } = require('./ui-text')
  const keys = key.split('.')
  let value: unknown = UI_TEXT
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = (value as Record<string, unknown>)[k]
    } else {
      // Return key as fallback (common i18n pattern)
      return key
    }
  }
  
  return typeof value === 'string' ? value : key
}
