/**
 * Price formatting utilities
 * 
 * All prices in the system are stored in cents (øre).
 * These utilities handle formatting for display.
 */

/**
 * Format price in cents to NOK display string
 * 
 * @param cents - Price in cents (øre)
 * @param options - Formatting options
 * @returns Formatted price string (e.g., "299,-" or "Free")
 * 
 * @example
 * formatPrice(29900) // "299,-"
 * formatPrice(0) // "Free"
 * formatPrice(0, { showZeroAsAmount: true }) // "0,-"
 * formatPrice(null) // "Free"
 */
export function formatPrice(
  cents: number | null | undefined,
  options?: { showZeroAsAmount?: boolean }
): string {
  if (cents === null || cents === undefined) {
    return options?.showZeroAsAmount ? '0,-' : 'Free'
  }
  
  if (cents === 0) {
    return options?.showZeroAsAmount ? '0,-' : 'Free'
  }
  
  const amount = cents / 100
  return `${amount.toFixed(0)},-`
}

/**
 * Format price with full currency details
 * 
 * @param cents - Price in cents (øre)
 * @returns Formatted price with currency (e.g., "299 NOK")
 * 
 * @example
 * formatPriceFull(29900) // "299 NOK"
 * formatPriceFull(0) // "Free"
 */
export function formatPriceFull(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || cents === 0) {
    return 'Free'
  }
  
  const amount = cents / 100
  return `${amount.toFixed(0)} NOK`
}

/**
 * Format price range for display
 * 
 * @param minCents - Minimum price in cents
 * @param maxCents - Maximum price in cents
 * @returns Formatted price range (e.g., "299,- - 399,-")
 * 
 * @example
 * formatPriceRange(29900, 39900) // "299,- - 399,-"
 * formatPriceRange(0, 29900) // "Free - 299,-"
 * formatPriceRange(29900, 29900) // "299,-" (same price)
 */
export function formatPriceRange(
  minCents: number | null | undefined,
  maxCents: number | null | undefined
): string {
  // If both are null/undefined/0, it's free
  if (
    (minCents === null || minCents === undefined || minCents === 0) &&
    (maxCents === null || maxCents === undefined || maxCents === 0)
  ) {
    return 'Free'
  }
  
  // If they're the same, just show one price
  if (minCents === maxCents) {
    return formatPrice(minCents)
  }
  
  return `${formatPrice(minCents)} - ${formatPrice(maxCents)}`
}

/**
 * Format currency amount using English (GB) locale
 * 
 * @param cents - Amount in cents
 * @param options - Intl.NumberFormatOptions
 * @returns Formatted currency string
 * 
 * @example
 * formatCurrency(29900) // "NOK 299"
 * formatCurrency(29950, { minimumFractionDigits: 2 }) // "NOK 299.50"
 */
export function formatCurrency(
  cents: number,
  options?: Intl.NumberFormatOptions
): string {
  const amount = cents / 100
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'NOK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options,
  }).format(amount)
}

/**
 * Format percentage
 * 
 * @param value - Percentage value (e.g., 25 for 25%)
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted percentage string
 * 
 * @example
 * formatPercentage(25) // "25%"
 * formatPercentage(12.5, 1) // "12.5%"
 */
export function formatPercentage(value: number, decimals: number = 0): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Parse price input to cents
 * 
 * @param input - Price input string or number
 * @returns Price in cents
 * 
 * @example
 * parsePriceToCents("299") // 29900
 * parsePriceToCents("299.50") // 29950
 * parsePriceToCents(299) // 29900
 */
export function parsePriceToCents(input: string | number): number {
  if (typeof input === 'number') {
    return Math.round(input * 100)
  }
  
  const cleaned = input.replace(/[^0-9.,]/g, '').replace(',', '.')
  const amount = parseFloat(cleaned) || 0
  return Math.round(amount * 100)
}
