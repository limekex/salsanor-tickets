import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { 
    ArrowLeft, 
    Clock, 
    Play, 
    Calendar, 
    Bell, 
    AlertTriangle,
    CheckCircle2,
    XCircle,
    RefreshCw,
    Settings2
} from 'lucide-react'
import { getScheduledTasks } from '@/app/actions/scheduled-tasks'
import { TASK_TYPE_INFO, type ScheduledTaskType } from '@/lib/scheduled-tasks-types'
import { getSelectedOrganizerForFinance, requireOrgFinance } from '@/utils/auth-org-finance'
import { TaskToggleButton } from './task-toggle-button'
import { TaskTriggerButton } from './task-trigger-button'
import { CreateTaskButton } from './create-task-button'

function formatDate(date: Date | null): string {
    if (!date) return 'Never'
    return new Intl.DateTimeFormat('en-GB', { 
        dateStyle: 'medium', 
        timeStyle: 'short' 
    }).format(new Date(date))
}

function getStatusBadge(status: string | null) {
    if (!status) return null
    
    switch (status) {
        case 'SUCCESS':
            return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Success</Badge>
        case 'PARTIAL':
            return <Badge variant="secondary"><AlertTriangle className="h-3 w-3 mr-1" />Partial</Badge>
        case 'FAILED':
            return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>
        case 'RUNNING':
            return <Badge variant="outline"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Running</Badge>
        default:
            return null
    }
}

function getTaskIcon(taskType: ScheduledTaskType) {
    switch (taskType) {
        case 'SESSION_REMINDER':
            return <Bell className="h-5 w-5 text-blue-500" />
        case 'BREAK_REMINDER':
            return <Calendar className="h-5 w-5 text-purple-500" />
        case 'MISSED_SESSION_NOTIFY':
            return <AlertTriangle className="h-5 w-5 text-orange-500" />
        case 'LOW_ATTENDANCE_WARN':
            return <AlertTriangle className="h-5 w-5 text-red-500" />
        case 'MEMBERSHIP_EXPIRY_WARN':
            return <Clock className="h-5 w-5 text-amber-500" />
        case 'WAITLIST_CLEANUP':
            return <RefreshCw className="h-5 w-5 text-gray-500" />
        case 'REPORT_GENERATION':
            return <Settings2 className="h-5 w-5 text-green-500" />
        default:
            return <Clock className="h-5 w-5" />
    }
}

export default async function ScheduledTasksPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    // Validate access
    await requireOrgFinance()
    const organizerId = await getSelectedOrganizerForFinance()

    const tasks = await getScheduledTasks(organizerId)

    // Group tasks by type for display
    const tasksByType = new Map<ScheduledTaskType, typeof tasks[0] | null>()
    for (const taskType of Object.keys(TASK_TYPE_INFO) as ScheduledTaskType[]) {
        tasksByType.set(taskType, tasks.find(t => t.taskType === taskType) || null)
    }

    const activeTasks = tasks.filter(t => t.isActive).length
    const totalRuns = tasks.reduce((sum, t) => sum + t.runCount, 0)
    const totalFails = tasks.reduce((sum, t) => sum + t.failCount, 0)

    return (
        <div className="space-y-rn-6">
            {/* Header */}
            <div className="flex items-center gap-rn-4">
                <Button asChild variant="ghost" size="sm">
                    <Link href="/staffadmin">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Link>
                </Button>
            </div>

            <div>
                <h1 className="rn-h1">Scheduled Tasks</h1>
                <p className="rn-meta text-rn-text-muted">
                    Configure automated notifications and background jobs
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-rn-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
                        <Play className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeTasks}</div>
                        <p className="text-xs text-muted-foreground">of {Object.keys(TASK_TYPE_INFO).length} available</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Runs</CardTitle>
                        <RefreshCw className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalRuns}</div>
                        <p className="text-xs text-muted-foreground">all time</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {totalRuns > 0 ? Math.round(((totalRuns - totalFails) / totalRuns) * 100) : 100}%
                        </div>
                        <p className="text-xs text-muted-foreground">{totalFails} failures</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Configured</CardTitle>
                        <Settings2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{tasks.length}</div>
                        <p className="text-xs text-muted-foreground">tasks set up</p>
                    </CardContent>
                </Card>
            </div>

            {/* Task List */}
            <div className="space-y-rn-4">
                <div className="flex items-center justify-between">
                    <h2 className="rn-h2">Available Tasks</h2>
                </div>

                <div className="grid gap-rn-4 md:grid-cols-2">
                    {(Object.keys(TASK_TYPE_INFO) as ScheduledTaskType[]).map(taskType => {
                        const task = tasksByType.get(taskType)
                        const info = TASK_TYPE_INFO[taskType]

                        return (
                            <Card key={taskType} className={task?.isActive ? 'border-l-4 border-l-green-500' : ''}>
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-rn-3">
                                            {getTaskIcon(taskType)}
                                            <div>
                                                <CardTitle className="text-base">{info.label}</CardTitle>
                                                <CardDescription className="text-xs">{info.description}</CardDescription>
                                            </div>
                                        </div>
                                        {task ? (
                                            <TaskToggleButton taskId={task.id} isActive={task.isActive} />
                                        ) : (
                                            <CreateTaskButton organizerId={organizerId} taskType={taskType} />
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {task ? (
                                        <div className="space-y-rn-2 text-sm">
                                            <div className="flex items-center justify-between">
                                                <span className="text-muted-foreground">Schedule:</span>
                                                <code className="text-xs bg-muted px-2 py-1 rounded">{task.cronExpression}</code>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-muted-foreground">Last Run:</span>
                                                <span>{formatDate(task.lastRunAt)}</span>
                                            </div>
                                            {task.lastRunStatus && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-muted-foreground">Status:</span>
                                                    {getStatusBadge(task.lastRunStatus)}
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between">
                                                <span className="text-muted-foreground">Runs:</span>
                                                <span>{task.runCount} ({task.failCount} failed)</span>
                                            </div>
                                            <div className="flex justify-end pt-2">
                                                <TaskTriggerButton taskId={task.id} disabled={!task.isActive} />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-muted-foreground">
                                            Not configured yet. Click &quot;Enable&quot; to set up this task.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            </div>

            {/* Info Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">How Scheduled Tasks Work</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p>
                        Scheduled tasks run automatically at configured intervals. They are triggered by a cron job
                        that calls the task API endpoint.
                    </p>
                    <p>
                        <strong>Session Reminders</strong> are sent to participants on the day of their class,
                        a configurable number of hours before the session starts.
                    </p>
                    <p>
                        <strong>Break Reminders</strong> notify participants when their next scheduled session
                        falls during a break period.
                    </p>
                    <p>
                        You can manually trigger any task using the &quot;Run Now&quot; button to test it.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
