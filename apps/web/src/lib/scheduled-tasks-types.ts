export type ScheduledTaskType = 
    | 'SESSION_REMINDER'
    | 'BREAK_REMINDER'
    | 'MISSED_SESSION_NOTIFY'
    | 'LOW_ATTENDANCE_WARN'
    | 'MEMBERSHIP_EXPIRY_WARN'
    | 'WAITLIST_CLEANUP'
    | 'REPORT_GENERATION'

export type TaskRunStatus = 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED'

export interface ScheduledTaskData {
    id: string
    organizerId: string | null
    name: string
    taskType: ScheduledTaskType
    cronExpression: string
    isActive: boolean
    config: Record<string, unknown> | null
    lastRunAt: Date | null
    lastRunStatus: TaskRunStatus | null
    lastRunMessage: string | null
    nextRunAt: Date | null
    runCount: number
    failCount: number
    createdAt: Date
}

export interface TaskRunData {
    id: string
    taskId: string
    startedAt: Date
    completedAt: Date | null
    status: TaskRunStatus
    message: string | null
    itemsProcessed: number
    itemsFailed: number
}

// Task type metadata for UI display
export const TASK_TYPE_INFO: Record<ScheduledTaskType, { label: string; description: string; defaultCron: string }> = {
    SESSION_REMINDER: {
        label: 'Session Reminders',
        description: 'Send email reminders before class starts',
        defaultCron: '0 8 * * *', // 8 AM daily
    },
    BREAK_REMINDER: {
        label: 'Break Reminders',
        description: 'Notify participants about upcoming break periods',
        defaultCron: '0 10 * * 5', // 10 AM on Fridays
    },
    MISSED_SESSION_NOTIFY: {
        label: 'Missed Session Notifications',
        description: 'Notify participants who missed a session',
        defaultCron: '0 22 * * *', // 10 PM daily
    },
    LOW_ATTENDANCE_WARN: {
        label: 'Low Attendance Warnings',
        description: 'Weekly warnings to participants with low attendance',
        defaultCron: '0 9 * * 1', // 9 AM on Mondays
    },
    MEMBERSHIP_EXPIRY_WARN: {
        label: 'Membership Expiry Warnings',
        description: 'Remind members about upcoming membership expiration',
        defaultCron: '0 10 * * *', // 10 AM daily
    },
    WAITLIST_CLEANUP: {
        label: 'Waitlist Cleanup',
        description: 'Clean up expired waitlist offers',
        defaultCron: '0 */4 * * *', // Every 4 hours
    },
    REPORT_GENERATION: {
        label: 'Report Generation',
        description: 'Generate periodic reports',
        defaultCron: '0 6 1 * *', // 6 AM on the 1st of each month
    },
}

export const ALL_TASK_TYPES: ScheduledTaskType[] = [
    'SESSION_REMINDER',
    'BREAK_REMINDER',
    'MISSED_SESSION_NOTIFY',
    'LOW_ATTENDANCE_WARN',
    'MEMBERSHIP_EXPIRY_WARN',
    'WAITLIST_CLEANUP',
    'REPORT_GENERATION',
]
