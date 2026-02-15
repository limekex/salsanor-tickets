/**
 * CSV Utility Functions (RFC 4180 compliant)
 * 
 * These utilities ensure proper CSV formatting, especially for fields
 * that may contain commas, quotes, or newlines.
 */

/**
 * Escape a value for CSV (RFC 4180 compliant)
 * - If the value contains comma, newline, or double quote, wrap in double quotes
 * - Double quotes inside the value are escaped by doubling them
 */
export function escapeCSV(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return ''
    const str = String(value)
    // Check if escaping is needed
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        // Escape double quotes by doubling them, then wrap in double quotes
        return `"${str.replace(/"/g, '""')}"`
    }
    return str
}

/**
 * Convert an array of values to a CSV row
 */
export function toCSVRow(values: (string | number | null | undefined)[]): string {
    return values.map(escapeCSV).join(',')
}

/**
 * Convert an array of rows to a full CSV string
 */
export function toCSV(headers: string[], rows: (string | number | null | undefined)[][]): string {
    const headerRow = toCSVRow(headers)
    const dataRows = rows.map(toCSVRow)
    return [headerRow, ...dataRows].join('\n')
}
