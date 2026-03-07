import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ScheduledTaskType } from '@prisma/client'

// Cron secret for authentication - should be set in environment variables
const CRON_SECRET = process.env.CRON_SECRET

/**
 * GET /api/cron/run-all?taskType=SESSION_REMINDER
 * 
 * Run a specific task type across ALL organizations that have it enabled.
 * This is the endpoint that external cron services should call.
 * 
 * Query: taskType - The type of task to run (SESSION_REMINDER, BREAK_REMINDER, etc.)
 * Header: Authorization: Bearer <CRON_SECRET>
 * 
 * Example cron setup (Vercel):
 *   - SESSION_REMINDER: 0 8 * * * (8 AM daily)
 *   - BREAK_REMINDER: 0 10 * * 5 (10 AM Fridays)
 *   - LOW_ATTENDANCE_WARN: 0 9 * * 1 (9 AM Mondays)
 */
export async function GET(req: Request) {
    // Verify cron secret
    const authHeader = req.headers.get('authorization')
    if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const taskType = searchParams.get('taskType') as ScheduledTaskType | null

    if (!taskType) {
        return NextResponse.json({ error: 'taskType query parameter required' }, { status: 400 })
    }

    // Find all active tasks of this type across all organizations
    const tasks = await prisma.scheduledTask.findMany({
        where: {
            taskType,
            isActive: true,
        },
        include: {
            Organizer: {
                select: { id: true, name: true, slug: true },
            },
        },
    })

    if (tasks.length === 0) {
        return NextResponse.json({ 
            success: true, 
            message: `No active ${taskType} tasks found`,
            tasksRun: 0,
        })
    }

    // Run each task
    const results: Array<{
        taskId: string
        organizerName: string | null
        success: boolean
        message?: string
        processed?: number
        failed?: number
    }> = []

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

    for (const task of tasks) {
        try {
            // Create a run record
            const run = await prisma.scheduledTaskRun.create({
                data: {
                    taskId: task.id,
                    startedAt: new Date(),
                    status: 'RUNNING',
                },
            })

            // Call the run-task endpoint internally
            const response = await fetch(`${baseUrl}/api/cron/run-task`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    taskId: task.id,
                    runId: run.id,
                }),
            })

            const result = await response.json()

            results.push({
                taskId: task.id,
                organizerName: task.Organizer?.name ?? 'Platform-wide',
                success: response.ok,
                message: result.message,
                processed: result.processed,
                failed: result.failed,
            })
        } catch (error) {
            results.push({
                taskId: task.id,
                organizerName: task.Organizer?.name ?? 'Platform-wide',
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
            })
        }
    }

    const successCount = results.filter(r => r.success).length
    const totalProcessed = results.reduce((sum, r) => sum + (r.processed ?? 0), 0)
    const totalFailed = results.reduce((sum, r) => sum + (r.failed ?? 0), 0)

    return NextResponse.json({
        success: true,
        taskType,
        tasksRun: tasks.length,
        successful: successCount,
        totalProcessed,
        totalFailed,
        results,
    })
}
