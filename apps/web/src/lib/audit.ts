import { prisma } from '@/lib/db'
import { headers } from 'next/headers'
import { randomUUID } from 'crypto'

export interface AuditLogParams {
    userId?: string
    entityType: 'Order' | 'Invoice' | 'Payment' | 'Registration' | 'Organizer' | 'User' | 'CoursePeriod' | 'CourseTrack'
    entityId: string
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'SEND' | 'PAID' | 'REFUND' | 'CANCEL'
    changes: Record<string, any>
}

/**
 * Creates an audit log entry for compliance tracking.
 * 
 * Norwegian Bokføringsloven requires:
 * - Immutable record of all financial transactions
 * - Who made changes and when
 * - What was changed (before/after)
 * - Audit trail for 5 years minimum
 */
export async function createAuditLog(params: AuditLogParams) {
    const headersList = await headers()
    const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || undefined
    const userAgent = headersList.get('user-agent') || undefined
    
    try {
        await prisma.auditLog.create({
            data: {
                id: randomUUID(),
                userId: params.userId,
                entityType: params.entityType,
                entityId: params.entityId,
                action: params.action,
                changes: params.changes,
                ipAddress,
                userAgent,
                timestamp: new Date()
            }
        })
    } catch (error) {
        // Log to console but don't fail the operation
        console.error('Failed to create audit log:', error)
    }
}

/**
 * Get audit history for an entity
 */
export async function getAuditHistory(entityType: string, entityId: string) {
    return await prisma.auditLog.findMany({
        where: {
            entityType,
            entityId
        },
        include: {
            user: {
                select: {
                    id: true,
                    email: true
                }
            }
        },
        orderBy: {
            timestamp: 'desc'
        }
    })
}

/**
 * Get all audit logs (admin only)
 */
export async function getAllAuditLogs(params?: {
    entityType?: string
    userId?: string
    startDate?: Date
    endDate?: Date
    limit?: number
}) {
    const where: any = {}
    
    if (params?.entityType) {
        where.entityType = params.entityType
    }
    
    if (params?.userId) {
        where.userId = params.userId
    }
    
    if (params?.startDate || params?.endDate) {
        where.timestamp = {}
        if (params.startDate) {
            where.timestamp.gte = params.startDate
        }
        if (params.endDate) {
            where.timestamp.lte = params.endDate
        }
    }
    
    return await prisma.auditLog.findMany({
        where,
        include: {
            user: {
                select: {
                    id: true,
                    email: true
                }
            }
        },
        orderBy: {
            timestamp: 'desc'
        },
        take: params?.limit || 1000
    })
}
