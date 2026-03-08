# Scheduled Tasks - Staff Admin UI Overview

## Navigation
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [RegiNor Logo]  Dashboard  Users  Registrations  Attendance  Scheduled Tasks│
│                            [Finance] ▼Products  ⚙️  🏠                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Staff Admin Tasks Page (`/staffadmin/tasks`)

Organization administrators can manage automated tasks from this page.

### Summary Cards (3 cards in row)
```
┌─────────────────────────┬─────────────────────────┬─────────────────────────┐
│ Active Tasks            │ Total Runs              │ Success Rate            │
│ 3                       │ 127                     │ 98%                     │
│ of 7 available          │ all time                │ last 20 runs            │
└─────────────────────────┴─────────────────────────┴─────────────────────────┘
```

### Task Cards

Each available task type is displayed as a card:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Session Reminders                                            [Active] ✓    │
│─────────────────────────────────────────────────────────────────────────────│
│ Send email reminders before class starts                                   │
│                                                                             │
│ Schedule: 0 8 * * * (Every day at 8:00 AM)                                 │
│                                                                             │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ Last Run: Mar 5, 2026, 08:00 • Status: SUCCESS                        │ │
│ │ Processed: 45 items • Failed: 0                                        │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ Total Runs: 52 • Failures: 1                                               │
│                                                                             │
│                                           [⏸️ Disable]  [▶️ Run Now]      │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ Break Reminders                                              [Inactive] ○  │
│─────────────────────────────────────────────────────────────────────────────│
│ Notify participants about upcoming break periods                            │
│                                                                             │
│ Default Schedule: 0 10 * * 5 (Every Friday at 10:00 AM)                    │
│                                                                             │
│ This task is not yet enabled for your organization.                        │
│                                                                             │
│                                                         [➕ Enable Task]   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Available Task Types

| Task | Description | Default Schedule | Status |
|------|-------------|------------------|--------|
| Session Reminders | Send email reminders before class starts | 8 AM daily | Active ✓ |
| Break Reminders | Notify about upcoming break periods | 10 AM Fridays | Inactive |
| Missed Session Notifications | Notify participants who missed a session | 10 PM daily | Inactive |
| Low Attendance Warnings | Weekly warnings to low-attendance participants | 9 AM Mondays | Active ✓ |
| Membership Expiry Warnings | Remind about upcoming membership expiration | 10 AM daily | Inactive |
| Waitlist Cleanup | Clean up expired waitlist offers | Every 4 hours | Active ✓ |
| Report Generation | Generate periodic reports | 6 AM 1st of month | Inactive |

## User Flows

### Enabling a Task

1. Find the task card with status "Inactive"
2. Click **[➕ Enable Task]** button
3. Task is created with default settings and marked active
4. Task will run on next scheduled execution

### Disabling a Task

1. Find the active task card
2. Click **[⏸️ Disable]** button
3. Task status changes to inactive
4. Task will not run until re-enabled

### Manually Triggering a Task

1. Find the active task card
2. Click **[▶️ Run Now]** button
3. Task executes immediately
4. Results appear in "Last Run" section

### Viewing Task History (Coming Soon)

- Click on a task card to expand details
- View list of recent runs with timestamps
- See processed/failed counts per run
- Download run logs if needed

## Task Configuration

### Session Reminders

Configuration options (stored in task's `config` field):

```
Hours Before: [4] ▼
  Options: 1, 2, 4, 6, 12, 24

Email Template: session-reminder (auto)
```

### Low Attendance Warnings

```
Attendance Threshold: [50]% ▼
  Options: 30%, 40%, 50%, 60%, 70%

Minimum Sessions: [3] ▼
  Before sending warning
```

## API Endpoints

| Action | Endpoint | Method |
|--------|----------|--------|
| Get all tasks | `/app/actions/scheduled-tasks#getScheduledTasks` | Server Action |
| Enable/Create task | `/app/actions/scheduled-tasks#upsertScheduledTask` | Server Action |
| Toggle task | `/app/actions/scheduled-tasks#toggleScheduledTask` | Server Action |
| Trigger run | `/app/actions/scheduled-tasks#triggerTaskRun` | Server Action |
| Get run history | `/app/actions/scheduled-tasks#getTaskRuns` | Server Action |

## Components

```
/apps/web/src/app/staffadmin/tasks/
├── page.tsx                    # Main tasks page (Server Component)
├── task-toggle-button.tsx      # Enable/Disable button (Client)
├── task-trigger-button.tsx     # Run Now button (Client)
└── create-task-button.tsx      # Enable Task button (Client)
```

## Permissions

| Role | Can View | Can Enable/Disable | Can Trigger |
|------|----------|-------------------|-------------|
| ORG_ADMIN | ✅ | ✅ | ✅ |
| ORG_FINANCE | ❌ | ❌ | ❌ |
| ORG_CHECKIN | ❌ | ❌ | ❌ |

## Status Indicators

| Status | Badge | Description |
|--------|-------|-------------|
| Active | `[Active] ✓` | Task is enabled and will run on schedule |
| Inactive | `[Inactive] ○` | Task is disabled or not yet enabled |
| Running | `[Running] ↻` | Task is currently executing |
| Success | `SUCCESS` | Last run completed successfully |
| Failed | `FAILED` | Last run encountered errors |
| Partial | `PARTIAL` | Last run had some failures |

## Integration with Cron

When the external cron service triggers a task type:

1. Cron calls `GET /api/cron/run-all?taskType=SESSION_REMINDER`
2. System finds all organizations with this task **active**
3. For each org, executes the task
4. Results recorded in `ScheduledTaskRun` table
5. Task statistics updated (runCount, lastRunAt, etc.)

> **Note:** Tasks that are **inactive** will be skipped by the cron system.

## Related Documentation

- [SCHEDULED_TASKS_SETUP.md](./SCHEDULED_TASKS_SETUP.md) - Global cron setup guide
- [EMAIL_SYSTEM_STATUS.md](./EMAIL_SYSTEM_STATUS.md) - Email service configuration
- [11-course-checkin-system.md](./issues/11-course-checkin-system.md) - Course check-in feature spec

## Troubleshooting

### Task not running on schedule

1. Check if task is **Active** in staffadmin
2. Verify cron is configured (see SCHEDULED_TASKS_SETUP.md)
3. Check CRON_SECRET environment variable

### Emails not being sent

1. Verify email templates are seeded
2. Check email service configuration
3. View task run details for error messages

### Task stuck in "Running" status

1. This usually indicates a crashed execution
2. Check server logs for errors
3. Platform admin can reset status in `/admin/tasks`
