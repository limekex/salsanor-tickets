'use server'

import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { emailService } from '@/lib/email/email-service'
import { 
    ScheduledTaskType, 
    ScheduledTaskData, 
    TaskRunData,
    TaskRunStatus,
    TASK_TYPE_INFO 
} from '@/lib/scheduled-tasks-types'

/**
 * Get all scheduled tasks for an organization (or platform-wide if organizerId is null)
 */
export async function getScheduledTasks(organizerId: string | null): Promise<ScheduledTaskData[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const tasks = await prisma.scheduledTask.findMany({
        where: { organizerId },
        orderBy: { createdAt: 'asc' },
    })

    return tasks.map(t => ({
        ...t,
        taskType: t.taskType as ScheduledTaskType,
        lastRunStatus: t.lastRunStatus as TaskRunStatus | null,
        config: t.config as Record<string, unknown> | null,
    }))
}

/**
 * Create or update a scheduled task
 */
export async function upsertScheduledTask(
    organizerId: string | null,
    taskType: ScheduledTaskType,
    data: {
        name?: string
        cronExpression?: string
        isActive?: boolean
        config?: Record<string, unknown>
    }
): Promise<{ success: boolean; error?: string; task?: ScheduledTaskData }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    // Check if user has admin access to the organization
    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: { UserAccountRole: true },
    })

    if (!userAccount) return { success: false, error: 'User not found' }

    const isGlobalAdmin = userAccount.UserAccountRole.some(r => r.role === 'ADMIN')
    const isOrgAdmin = organizerId 
        ? userAccount.UserAccountRole.some(r => r.role === 'ORG_ADMIN' && r.organizerId === organizerId)
        : false

    if (!isGlobalAdmin && !isOrgAdmin) {
        return { success: false, error: 'Insufficient permissions' }
    }

    // Platform-wide tasks require global admin
    if (organizerId === null && !isGlobalAdmin) {
        return { success: false, error: 'Only platform admins can manage platform-wide tasks' }
    }

    try {
        const existing = await prisma.scheduledTask.findUnique({
            where: { organizerId_taskType: { organizerId: organizerId ?? '', taskType } },
        })

        const taskInfo = TASK_TYPE_INFO[taskType]
        const taskData = {
            name: data.name ?? taskInfo.label,
            cronExpression: data.cronExpression ?? taskInfo.defaultCron,
            isActive: data.isActive ?? true,
            config: (data.config ?? {}) as Prisma.InputJsonValue,
        }

        let task
        if (existing) {
            task = await prisma.scheduledTask.update({
                where: { id: existing.id },
                data: taskData,
            })
        } else {
            task = await prisma.scheduledTask.create({
                data: {
                    organizerId,
                    taskType,
                    createdById: userAccount.id,
                    ...taskData,
                },
            })
        }

        revalidatePath('/staffadmin/tasks')
        revalidatePath('/admin/tasks')

        return {
            success: true,
            task: {
                ...task,
                taskType: task.taskType as ScheduledTaskType,
                lastRunStatus: task.lastRunStatus as TaskRunStatus | null,
                config: task.config as Record<string, unknown> | null,
            },
        }
    } catch (error) {
        console.error('Error upserting scheduled task:', error)
        return { success: false, error: 'Failed to save task' }
    }
}

/**
 * Toggle a scheduled task's active status
 */
export async function toggleScheduledTask(
    taskId: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const task = await prisma.scheduledTask.findUnique({
        where: { id: taskId },
    })

    if (!task) return { success: false, error: 'Task not found' }

    // Check permissions
    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: { UserAccountRole: true },
    })

    if (!userAccount) return { success: false, error: 'User not found' }

    const isGlobalAdmin = userAccount.UserAccountRole.some(r => r.role === 'ADMIN')
    const isOrgAdmin = task.organizerId 
        ? userAccount.UserAccountRole.some(r => r.role === 'ORG_ADMIN' && r.organizerId === task.organizerId)
        : false

    if (!isGlobalAdmin && !isOrgAdmin) {
        return { success: false, error: 'Insufficient permissions' }
    }

    try {
        await prisma.scheduledTask.update({
            where: { id: taskId },
            data: { isActive: !task.isActive },
        })

        revalidatePath('/staffadmin/tasks')
        revalidatePath('/admin/tasks')

        return { success: true }
    } catch (error) {
        console.error('Error toggling scheduled task:', error)
        return { success: false, error: 'Failed to toggle task' }
    }
}

/**
 * Get recent runs for a task
 */
export async function getTaskRuns(taskId: string, limit = 10): Promise<TaskRunData[]> {
    const runs = await prisma.scheduledTaskRun.findMany({
        where: { taskId },
        orderBy: { startedAt: 'desc' },
        take: limit,
    })

    return runs.map(r => ({
        ...r,
        status: r.status as TaskRunStatus,
    }))
}

/**
 * Manually trigger a task run (for testing)
 */
export async function triggerTaskRun(
    taskId: string
): Promise<{ success: boolean; error?: string; runId?: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const task = await prisma.scheduledTask.findUnique({
        where: { id: taskId },
    })

    if (!task) return { success: false, error: 'Task not found' }

    // Check permissions
    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: { UserAccountRole: true },
    })

    if (!userAccount) return { success: false, error: 'User not found' }

    const isGlobalAdmin = userAccount.UserAccountRole.some(r => r.role === 'ADMIN')
    const isOrgAdmin = task.organizerId 
        ? userAccount.UserAccountRole.some(r => r.role === 'ORG_ADMIN' && r.organizerId === task.organizerId)
        : false

    if (!isGlobalAdmin && !isOrgAdmin) {
        return { success: false, error: 'Insufficient permissions' }
    }

    try {
        // Create a run record
        const run = await prisma.scheduledTaskRun.create({
            data: {
                taskId,
                status: 'RUNNING',
            },
        })

        // Trigger the actual task execution via API
        // This returns immediately - the actual processing happens async
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
        fetch(`${baseUrl}/api/cron/run-task`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId, runId: run.id }),
        }).catch(err => console.error('Error triggering task:', err))

        return { success: true, runId: run.id }
    } catch (error) {
        console.error('Error triggering task run:', error)
        return { success: false, error: 'Failed to trigger task' }
    }
}

/**
 * Run all tasks of a specific type across all organizations (Platform Admin only)
 */
export async function runAllTasksOfType(taskType: ScheduledTaskType): Promise<{ success: boolean; message?: string; error?: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: 'Unauthorized' }
    }

    // Verify global admin
    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: { UserAccountRole: true },
    })

    const isGlobalAdmin = userAccount?.UserAccountRole?.some(r => r.role === 'ADMIN') ?? false
    if (!isGlobalAdmin) {
        return { success: false, error: 'Platform admin access required' }
    }

    // Find all active tasks of this type
    const tasks = await prisma.scheduledTask.findMany({
        where: {
            taskType,
            isActive: true,
        },
    })

    if (tasks.length === 0) {
        return { success: true, message: 'No active tasks found' }
    }

    // Trigger each task
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    let successCount = 0
    let failCount = 0

    for (const task of tasks) {
        try {
            const run = await prisma.scheduledTaskRun.create({
                data: {
                    taskId: task.id,
                    status: 'RUNNING',
                },
            })

            const response = await fetch(`${baseUrl}/api/cron/run-task`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskId: task.id, runId: run.id }),
            })

            if (response.ok) {
                successCount++
            } else {
                failCount++
            }
        } catch {
            failCount++
        }
    }

    revalidatePath('/admin/tasks')

    return {
        success: true,
        message: `Triggered ${successCount}/${tasks.length} tasks${failCount > 0 ? ` (${failCount} failed)` : ''}`,
    }
}

/**
 * Send a test email for a specific task type (global admin only)
 * This sends an email with mock data to the current admin's email address
 */
export async function sendTestEmail(
    taskType: ScheduledTaskType
): Promise<{ success: boolean; error?: string; message?: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: 'Unauthorized' }
    }

    // Verify global admin
    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: { 
            UserAccountRole: true,
            PersonProfile: true,
        },
    })

    const isGlobalAdmin = userAccount?.UserAccountRole?.some(r => r.role === 'ADMIN') ?? false
    if (!isGlobalAdmin) {
        return { success: false, error: 'Platform admin access required' }
    }

    const adminEmail = userAccount?.PersonProfile?.email || user.email
    if (!adminEmail) {
        return { success: false, error: 'Admin email not found' }
    }

    const adminName = userAccount?.PersonProfile 
        ? `${userAccount.PersonProfile.firstName} ${userAccount.PersonProfile.lastName}`
        : 'Admin'

    // Get a sample organizer for test data
    const sampleOrganizer = await prisma.organizer.findFirst({
        orderBy: { createdAt: 'desc' },
    })

    const organizerName = sampleOrganizer?.name || 'Sample Organization'
    const currentYear = new Date().getFullYear().toString()
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

    // Mock variables for each task type
    const testVariables: Record<ScheduledTaskType, { templateSlug: string | null; variables: Record<string, string> }> = {
        SESSION_REMINDER: {
            templateSlug: 'session-reminder',
            variables: {
                firstName: adminName.split(' ')[0],
                courseName: 'Salsa Beginner - Test Course',
                sessionTime: '19:00',
                location: 'Dance Studio A',
                periodName: 'Spring 2026',
                checkInWindow: '30 minutes',
                myCoursesUrl: `${baseUrl}/my/courses`,
                organizerName,
                currentYear,
            },
        },
        BREAK_REMINDER: {
            templateSlug: 'break-reminder',
            variables: {
                firstName: adminName.split(' ')[0],
                courseName: 'Salsa Beginner - Test Course',
                breakName: 'Easter Break',
                breakStart: 'March 28, 2026',
                breakEnd: 'April 6, 2026',
                nextSessionDate: 'April 7, 2026',
                periodName: 'Spring 2026',
                myCoursesUrl: `${baseUrl}/my/courses`,
                organizerName,
                currentYear,
            },
        },
        LOW_ATTENDANCE_WARN: {
            templateSlug: 'attendance-low-warning',
            variables: {
                firstName: adminName.split(' ')[0],
                courseName: 'Salsa Beginner - Test Course',
                attendancePercent: '45',
                sessionsAttended: '5',
                totalSessions: '11',
                periodName: 'Spring 2026',
                myCoursesUrl: `${baseUrl}/my/courses`,
                organizerName,
                currentYear,
            },
        },
        MEMBERSHIP_EXPIRY_WARN: {
            templateSlug: 'membership-expiry-warning',
            variables: {
                firstName: adminName.split(' ')[0],
                membershipType: 'Premium Membership',
                expiryDate: 'March 31, 2026',
                daysRemaining: '14',
                renewUrl: `${baseUrl}/my/memberships`,
                organizerName,
                currentYear,
            },
        },
        WAITLIST_CLEANUP: {
            templateSlug: null, // No email template - this is a cleanup task
            variables: {},
        },
        REPORT_GENERATION: {
            templateSlug: null, // TODO: Add report email template with attachment support
            variables: {},
        },
        MISSED_SESSION_NOTIFY: {
            templateSlug: 'missed-session',
            variables: {
                firstName: adminName.split(' ')[0],
                courseName: 'Salsa Beginner - Test Course',
                sessionDate: new Date().toLocaleDateString('en-GB', { dateStyle: 'medium' }),
                sessionTime: '19:00',
                location: 'Dance Studio A',
                periodName: 'Spring 2026',
                myCoursesUrl: `${baseUrl}/my/courses`,
                myAttendanceUrl: `${baseUrl}/my/attendance`,
                organizerName,
                currentYear,
            },
        },
    }

    const testData = testVariables[taskType]
    if (!testData) {
        return { success: false, error: `Unknown task type: ${taskType}` }
    }

    // Check if this task type has an email template
    if (!testData.templateSlug) {
        return { 
            success: true, 
            message: `${TASK_TYPE_INFO[taskType].label} does not send emails` 
        }
    }

    try {
        const result = await emailService.sendTransactional({
            organizerId: sampleOrganizer?.id,
            templateSlug: testData.templateSlug,
            recipientEmail: adminEmail,
            recipientName: adminName,
            variables: {
                ...testData.variables,
                // Add a test indicator
                testMode: 'true',
            },
        })

        if (result.success) {
            return { 
                success: true, 
                message: `Test email sent to ${adminEmail}` 
            }
        } else {
            return { 
                success: false, 
                error: result.error || 'Failed to send email' 
            }
        }
    } catch (error) {
        console.error('Test email error:', error)
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        }
    }
}
