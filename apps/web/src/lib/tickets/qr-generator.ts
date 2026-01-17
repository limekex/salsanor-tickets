import QRCode from 'qrcode'
import { randomUUID } from 'crypto'

/**
 * Generate a unique, secure QR token for a ticket
 * Format: ticketType:entityId:personId:timestamp:uuid
 */
export function generateQRToken(
    ticketType: 'EVENT' | 'COURSE_PERIOD',
    entityId: string,
    personId: string
): string {
    const timestamp = Date.now()
    const uuid = randomUUID()
    return `${ticketType}:${entityId}:${personId}:${timestamp}:${uuid}`
}

/**
 * Generate QR code as Base64 data URL
 */
export async function generateQRCodeDataURL(token: string): Promise<string> {
    try {
        return await QRCode.toDataURL(token, {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            width: 300,
            margin: 2,
        })
    } catch (error) {
        console.error('Failed to generate QR code:', error)
        throw new Error('QR code generation failed')
    }
}

/**
 * Generate QR code as Buffer (for PDF embedding)
 */
export async function generateQRCodeBuffer(token: string): Promise<Buffer> {
    try {
        return await QRCode.toBuffer(token, {
            errorCorrectionLevel: 'H',
            type: 'png',
            width: 300,
            margin: 2,
        })
    } catch (error) {
        console.error('Failed to generate QR code buffer:', error)
        throw new Error('QR code generation failed')
    }
}

/**
 * Parse QR token to extract information
 */
export function parseQRToken(token: string): {
    ticketType: 'EVENT' | 'COURSE_PERIOD'
    entityId: string
    personId: string
    timestamp: number
    uuid: string
} | null {
    try {
        const parts = token.split(':')
        if (parts.length !== 5) return null
        
        const [ticketType, entityId, personId, timestampStr, uuid] = parts
        
        if (ticketType !== 'EVENT' && ticketType !== 'COURSE_PERIOD') return null
        
        return {
            ticketType: ticketType as 'EVENT' | 'COURSE_PERIOD',
            entityId,
            personId,
            timestamp: parseInt(timestampStr, 10),
            uuid
        }
    } catch (error) {
        return null
    }
}
