'use client'

import { Clock, Bell, AlertTriangle, Coffee, CreditCard, Users, Trash2, CheckCircle, Settings, Play } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'

const taskTypes = [
    {
        id: 'SESSION_REMINDER',
        icon: Bell,
        title: 'Session Reminder',
        description: 'Sends email reminders to participants before their scheduled class sessions.',
        configOptions: [
            { name: 'hoursBeforeSession', type: 'number', default: 24, description: 'How many hours before the session to send the reminder' },
        ],
        emailTemplate: 'session-reminder',
    },
    {
        id: 'BREAK_REMINDER',
        icon: Coffee,
        title: 'Break Reminder',
        description: 'Notifies participants when there is a scheduled break (no class next week).',
        configOptions: [
            { name: 'daysBeforeBreak', type: 'number', default: 3, description: 'How many days before the break starts to send notifications' },
        ],
        emailTemplate: 'break-reminder',
    },
    {
        id: 'LOW_ATTENDANCE_WARNING',
        icon: AlertTriangle,
        title: 'Low Attendance Warning',
        description: 'Alerts participants when their attendance drops below a threshold.',
        configOptions: [
            { name: 'minAttendancePercent', type: 'number', default: 70, description: 'Minimum attendance percentage before warning is sent' },
            { name: 'minSessionsRequired', type: 'number', default: 3, description: 'Minimum sessions that must have passed before checking' },
        ],
        emailTemplate: 'attendance-low-warning',
    },
    {
        id: 'MEMBERSHIP_EXPIRY_WARNING',
        icon: CreditCard,
        title: 'Membership Expiry Warning',
        description: 'Notifies members when their membership is about to expire.',
        configOptions: [
            { name: 'daysBeforeExpiry', type: 'number', default: 14, description: 'Days before expiry to send the first warning' },
            { name: 'sendSecondWarning', type: 'boolean', default: true, description: 'Send a second warning closer to expiry' },
            { name: 'secondWarningDays', type: 'number', default: 3, description: 'Days before expiry for second warning' },
        ],
        emailTemplate: 'membership-expiry-warning',
    },
    {
        id: 'WAITLIST_CLEANUP',
        icon: Trash2,
        title: 'Waitlist Cleanup',
        description: 'Automatically removes stale entries from event waitlists.',
        configOptions: [
            { name: 'staleDays', type: 'number', default: 30, description: 'Days after which waitlist entries are considered stale' },
            { name: 'notifyOnRemoval', type: 'boolean', default: false, description: 'Send notification when entry is removed' },
        ],
        emailTemplate: null,
    },
    {
        id: 'ATTENDANCE_REPORT',
        icon: Users,
        title: 'Attendance Report',
        description: 'Generates and emails weekly/monthly attendance summaries to organizers.',
        configOptions: [
            { name: 'frequency', type: 'string', default: 'weekly', description: 'How often to send reports (weekly or monthly)' },
            { name: 'recipients', type: 'string[]', default: [], description: 'Additional email addresses to receive reports' },
        ],
        emailTemplate: null,
    },
]

export default function ScheduledTasksDocsPage() {
    return (
        <div className="space-y-rn-8 max-w-4xl">
            {/* Header */}
            <div>
                <h1 className="rn-h1 flex items-center gap-rn-3">
                    <Clock className="h-8 w-8 text-rn-primary" />
                    Scheduled Tasks & Notifications
                </h1>
                <p className="rn-body text-rn-text-muted mt-rn-2">
                    Automate reminders, alerts, and maintenance for your organization. Tasks run on a schedule
                    and can be customized per organization.
                </p>
            </div>

            {/* Quick Start */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Play className="h-5 w-5 text-rn-primary" />
                        Quick Start
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <ol className="list-decimal list-inside space-y-2 text-rn-body">
                        <li>Go to <Link href="/staffadmin/tasks" className="text-rn-primary hover:underline font-medium">Staff Admin → Tasks</Link></li>
                        <li>Click <strong>&ldquo;Enable Task&rdquo;</strong> on any task type you want to activate</li>
                        <li>Configure the task settings (timing, thresholds, etc.)</li>
                        <li>Optionally click <strong>&ldquo;Run Now&rdquo;</strong> to test immediately</li>
                    </ol>
                    <p className="text-rn-meta text-rn-text-muted">
                        Tasks run automatically via scheduled cron jobs. You can also trigger them manually for testing.
                    </p>
                </CardContent>
            </Card>

            {/* How It Works */}
            <section className="space-y-rn-4">
                <h2 className="rn-h2">How It Works</h2>
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Settings className="h-4 w-4" />
                                1. Configure
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <CardDescription>
                                Enable tasks and customize settings like timing, thresholds, and recipients.
                            </CardDescription>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                2. Schedule
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <CardDescription>
                                Tasks run automatically at set intervals (hourly, daily, or weekly depending on type).
                            </CardDescription>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                <CheckCircle className="h-4 w-4" />
                                3. Track
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <CardDescription>
                                View run history, success/failure counts, and logs in the task dashboard.
                            </CardDescription>
                        </CardContent>
                    </Card>
                </div>
            </section>

            <Separator />

            {/* Task Types */}
            <section className="space-y-rn-6">
                <h2 className="rn-h2">Available Task Types</h2>
                
                <div className="space-y-rn-6">
                    {taskTypes.map(task => (
                        <Card key={task.id} id={task.id.toLowerCase()}>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-3">
                                    <task.icon className="h-5 w-5 text-rn-primary" />
                                    {task.title}
                                    {task.emailTemplate && (
                                        <Badge variant="outline" className="ml-auto">
                                            Sends Email
                                        </Badge>
                                    )}
                                </CardTitle>
                                <CardDescription>{task.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <h4 className="font-medium text-sm mb-2">Configuration Options</h4>
                                    <div className="bg-rn-surface rounded-lg p-4 space-y-3">
                                        {task.configOptions.map(opt => (
                                            <div key={opt.name} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                                                <code className="text-xs bg-rn-background px-2 py-1 rounded font-mono shrink-0">
                                                    {opt.name}
                                                </code>
                                                <span className="text-sm text-rn-text-muted flex-1">
                                                    {opt.description}
                                                </span>
                                                <span className="text-xs text-rn-text-muted">
                                                    Default: <code className="bg-rn-background px-1 rounded">{String(opt.default)}</code>
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {task.emailTemplate && (
                                    <p className="text-sm text-rn-text-muted">
                                        Email template: <code className="bg-rn-surface px-2 py-0.5 rounded text-xs">{task.emailTemplate}</code>
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            <Separator />

            {/* Run History */}
            <section className="space-y-rn-4">
                <h2 className="rn-h2">Viewing Run History</h2>
                <p className="rn-body text-rn-text-muted">
                    Each task tracks its execution history. You can see:
                </p>
                <ul className="list-disc list-inside space-y-1 text-rn-body text-rn-text-muted ml-4">
                    <li><strong>Status:</strong> Success, Failed, Partial (some items failed), or Running</li>
                    <li><strong>Started/Finished:</strong> Timestamps for when the task ran</li>
                    <li><strong>Items Processed:</strong> Number of items handled (e.g., emails sent)</li>
                    <li><strong>Error Messages:</strong> Details if something went wrong</li>
                </ul>
                <p className="rn-meta text-rn-text-muted">
                    Click on any task in the dashboard to expand and view its recent runs.
                </p>
            </section>

            {/* Tips */}
            <Card className="bg-rn-primary/5 border-rn-primary/20">
                <CardHeader>
                    <CardTitle className="text-base">💡 Tips</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <p>
                        <strong>Test before going live:</strong> Use the &ldquo;Run Now&rdquo; button to verify tasks work as expected before relying on scheduled runs.
                    </p>
                    <p>
                        <strong>Email templates:</strong> Templates are configured at the platform level. If a task fails due to a missing template, contact your platform administrator.
                    </p>
                    <p>
                        <strong>Monitor run history:</strong> Regularly check task runs to catch any failures early.
                    </p>
                </CardContent>
            </Card>

            {/* Footer */}
            <div className="pt-rn-4 border-t border-rn-border">
                <p className="rn-meta text-rn-text-muted">
                    Need help? Contact support or check the{' '}
                    <Link href="/staffadmin/docs" className="text-rn-primary hover:underline">
                        other documentation
                    </Link>.
                </p>
            </div>
        </div>
    )
}
