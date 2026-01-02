/**
 * Norwegian Organization Number (org.nr) Validation
 * 
 * Norwegian organization numbers are 9 digits and use MOD11 checksum validation.
 * Format: XXX XXX XXX (spaces optional)
 * 
 * Used for:
 * - Business registration validation
 * - B2B invoicing compliance
 * - VAT reporting
 */

/**
 * Validates a Norwegian organization number using MOD11 checksum
 * 
 * @param orgNr - Organization number (with or without spaces)
 * @returns true if valid, false otherwise
 * 
 * @example
 * validateOrgNumber('123 456 785') // true
 * validateOrgNumber('123456785') // true
 * validateOrgNumber('123456789') // false (invalid checksum)
 */
export function validateOrgNumber(orgNr: string): boolean {
    if (!orgNr) return false
    
    // Remove all spaces and non-digits
    const cleaned = orgNr.replace(/\s/g, '').replace(/\D/g, '')
    
    // Must be exactly 9 digits
    if (cleaned.length !== 9) return false
    
    // MOD11 validation
    const weights = [3, 2, 7, 6, 5, 4, 3, 2]
    const digits = cleaned.split('').map(Number)
    
    // Calculate checksum
    const sum = weights.reduce((acc, weight, index) => {
        return acc + weight * digits[index]
    }, 0)
    
    const remainder = sum % 11
    const checksum = remainder === 0 ? 0 : 11 - remainder
    
    // Checksum of 10 is invalid in MOD11
    if (checksum === 10) return false
    
    // Compare with 9th digit (the check digit)
    return checksum === digits[8]
}

/**
 * Formats an organization number with spaces
 * 
 * @param orgNr - Organization number (with or without spaces)
 * @returns Formatted org number (XXX XXX XXX) or null if invalid
 * 
 * @example
 * formatOrgNumber('123456785') // '123 456 785'
 * formatOrgNumber('123 456 785') // '123 456 785'
 */
export function formatOrgNumber(orgNr: string): string | null {
    if (!orgNr) return null
    
    const cleaned = orgNr.replace(/\s/g, '').replace(/\D/g, '')
    
    if (cleaned.length !== 9) return null
    if (!validateOrgNumber(cleaned)) return null
    
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`
}

/**
 * Removes formatting from organization number
 * 
 * @param orgNr - Organization number (with or without spaces)
 * @returns Clean 9-digit string or null if invalid
 */
export function cleanOrgNumber(orgNr: string): string | null {
    if (!orgNr) return null
    
    const cleaned = orgNr.replace(/\s/g, '').replace(/\D/g, '')
    
    if (cleaned.length !== 9) return null
    if (!validateOrgNumber(cleaned)) return null
    
    return cleaned
}

/**
 * Generates a validation error message for organization numbers
 */
export function getOrgNumberError(orgNr: string): string | null {
    if (!orgNr || orgNr.trim() === '') {
        return 'Organization number is required'
    }
    
    const cleaned = orgNr.replace(/\s/g, '').replace(/\D/g, '')
    
    if (cleaned.length !== 9) {
        return 'Organization number must be 9 digits'
    }
    
    if (!validateOrgNumber(cleaned)) {
        return 'Invalid organization number (checksum failed)'
    }
    
    return null
}

/**
 * Check if a string looks like it could be an org number (basic format check)
 * Useful for UI validation before full MOD11 check
 */
export function looksLikeOrgNumber(value: string): boolean {
    if (!value) return false
    const cleaned = value.replace(/\s/g, '').replace(/\D/g, '')
    return cleaned.length === 9
}
