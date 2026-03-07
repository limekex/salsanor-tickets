import { prisma } from '@/lib/db'
import { requireAdmin } from '@/utils/auth-admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
    ArrowLeft,
    Clock,
    Activity,
    CheckCircle2,
    XCircle,
    Building2,
    AlertTriangle,
    RefreshCw,
} from 'lucide-react'
import { TASK_TYPE_INFO, ALL_TASK_TYPES, type ScheduledTaskType } from '@/lib/scheduled-tasks-types'
import { GlobalTaskTriggerButton } from './global-task-trigger-button'
import { TestEmailButton } from './test-email-button'

function formatDate(date: Date | null): string {
    if (!date) return 'Never'
    return new Intl.DateTimeFormat('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date)
}

export default async function AdminTasksPage() {
    const userAccount = await requireAdmin()
    const isGlobalAdmin = userAccount?.UserAccountRole?.some(r => r.role === 'ADMIN') ?? false

    if (!isGlobalAdmin) {
        return (
            <div className="p-6">
                <p className="text-muted-foreground">Access denied. Platform admin required.</p>
            </div>
        )
    }

    // Get all tasks across all organizations
    const allTasks = await prisma.scheduledTask.findMany({
        include: {
            Organizer: {
                select: { id: true, name: true, slug: true },
            },
        },
        orderBy: [
            { taskType: 'asc' },
            { Organizer: { name: 'asc' } },
        ],
    })

    // Get recent runs across all tasks
    const recentRuns = await prisma.scheduledTaskRun.findMany({
        take: 20,
        orderBy: { startedAt: 'desc' },
        include: {
            Task: {
                include: {
                    Organizer: {
                        select: { name: true, slug: true },
                    },
                },
            },
        },
    })

    // Group tasks by type
    const tasksByType = ALL_TASK_TYPES.reduce((acc, type) => {
        acc[type] = allTasks.filter(t => t.taskType === type)
        return acc
    }, {} as Record<ScheduledTaskType, typeof allTasks>)

    // Calculate stats
    const totalTasks = allTasks.length
    const activeTasks = allTasks.filter(t => t.isActive).length
    const orgsWithTasks = new Set(allTasks.map(t => t.organizerId).filter(Boolean)).size
    const successfulRuns = recentRuns.filter(r => r.status === 'SUCCESS').length

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/admin" className="text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">Scheduled Tasks</h1>
                    <p className="text-muted-foreground">Platform-wide task management</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Tasks
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalTasks}</div>
                        <p className="text-xs text-muted-foreground">
                            {activeTasks} active
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Organizations
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{orgsWithTasks}</div>
                        <p className="text-xs text-muted-foreground">
                            with scheduled tasks
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Recent Runs (24h)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{recentRuns.length}</div>
                        <p className="text-xs text-muted-foreground">
                            {successfulRuns} successful
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Success Rate
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {recentRuns.length > 0
                                ? Math.round((successfulRuns / recentRuns.length) * 100)
                                : 100}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                            last 20 runs
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Task Types Overview */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Tasks by Type
                    </CardTitle>
                    <CardDescription>
                        Run tasks across all organizations at once
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {ALL_TASK_TYPES.map(taskType => {
                            const info = TASK_TYPE_INFO[taskType]
                            const tasks = tasksByType[taskType]
                            const activeCount = tasks.filter(t => t.isActive).length

                            return (
                                <div
                                    key={taskType}
                                    className="flex items-center justify-between p-4 border rounded-lg"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-medium">{info.label}</h3>
                                            <Badge variant={activeCount > 0 ? 'default' : 'secondary'}>
                                                {activeCount} active
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {info.description}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Default schedule: <code className="bg-muted px-1 rounded">{info.defaultCron}</code>
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <TestEmailButton taskType={taskType} />
                                        <GlobalTaskTriggerButton
                                            taskType={taskType}
                                            activeCount={activeCount}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Tasks by Organization */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Tasks by Organization
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {Array.from(new Set(allTasks.map(t => t.organizerId))).map(orgId => {
                            const orgTasks = allTasks.filter(t => t.organizerId === orgId)
                            const org = orgTasks[0]?.Organizer || { name: 'Platform-wide', slug: null }
                            
                            return (
                                <div key={orgId || 'platform'} className="border rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-medium">{org.name}</h3>
                                        {org.slug && (
                                            <Link
                                                href={`/admin/organizers/${orgId}`}
                                                className="text-sm text-primary hover:underline"
                                            >
                                                View org
                                            </Link>
                                        )}
                                    </div>
                                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                                        {orgTasks.map(task => (
                                            <div
                                                key={task.id}
                                                className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                                            >
                                                <div className="flex items-center gap-2">
                                                    {task.isActive ? (
                                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                    ) : (
                                                        <XCircle className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                    <span>{TASK_TYPE_INFO[task.taskType as ScheduledTaskType]?.label || task.taskType}</span>
                                                </div>
                                                {task.lastRunStatus && (
                                                    <Badge
                                                        variant={task.lastRunStatus === 'SUCCESS' ? 'default' : 'destructive'}
                                                        className="text-xs"
                                                    >
                                                        {task.lastRunStatus}
                                                    </Badge>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                        {allTasks.length === 0 && (
                            <p className="text-muted-foreground text-center py-8">
                                No scheduled tasks configured yet. Organizations can enable tasks from their Staff Admin panel.
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Recent Runs */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <RefreshCw className="h-5 w-5" />
                        Recent Task Runs
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {recentRuns.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">
                            No task runs yet
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {recentRuns.map(run => (
                                <div
                                    key={run.id}
                                    className="flex items-center justify-between p-3 border rounded-lg text-sm"
                                >
                                    <div className="flex items-center gap-3">
                                        {run.status === 'SUCCESS' ? (
                                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                                        ) : run.status === 'FAILED' ? (
                                            <XCircle className="h-4 w-4 text-red-600" />
                                        ) : run.status === 'RUNNING' ? (
                                            <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
                                        ) : (
                                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                        )}
                                        <div>
                                            <span className="font-medium">
                                                {TASK_TYPE_INFO[run.Task?.taskType as ScheduledTaskType]?.label || run.Task?.taskType}
                                            </span>
                                            <span className="text-muted-foreground mx-2">•</span>
                                            <span className="text-muted-foreground">
                                                {run.Task?.Organizer?.name || 'Platform-wide'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {run.itemsProcessed !== null && (
                                            <span className="text-muted-foreground">
                                                {run.itemsProcessed} processed
                                                {run.itemsFailed > 0 && `, ${run.itemsFailed} failed`}
                                            </span>
                                        )}
                                        <span className="text-muted-foreground">
                                            {formatDate(run.startedAt)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Cron Setup Instructions */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Cron Setup
                    </CardTitle>
                    <CardDescription>
                        Configure your external cron service to call these endpoints
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-muted p-4 rounded-lg">
                        <p className="font-mono text-sm mb-2">
                            GET /api/cron/run-all?taskType=SESSION_REMINDER
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Header: <code>Authorization: Bearer YOUR_CRON_SECRET</code>
                        </p>
                    </div>
                    
                    <div className="space-y-2">
                        <h4 className="font-medium">Recommended Vercel Cron Configuration:</h4>
                        <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/run-all?taskType=SESSION_REMINDER",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/cron/run-all?taskType=BREAK_REMINDER",
      "schedule": "0 10 * * 5"
    },
    {
      "path": "/api/cron/run-all?taskType=LOW_ATTENDANCE_WARN",
      "schedule": "0 9 * * 1"
    },
    {
      "path": "/api/cron/run-all?taskType=MEMBERSHIP_EXPIRY_WARN",
      "schedule": "0 10 * * *"
    },
    {
      "path": "/api/cron/run-all?taskType=WAITLIST_CLEANUP",
      "schedule": "0 */4 * * *"
    }
  ]
}`}
                        </pre>
                    </div>

                    <div className="p-4 border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950 rounded">
                        <p className="text-sm">
                            <strong>Note:</strong> Make sure to set <code>CRON_SECRET</code> in your environment variables.
                            Vercel Cron automatically includes the secret in the Authorization header.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
