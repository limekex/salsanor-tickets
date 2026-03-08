# Scheduled Tasks System - Setup Guide

## Overview

The SalsaNor platform includes a scheduled task system for automated operations like:
- **Session reminders** - Email participants before their class
- **Break period reminders** - Notify participants about upcoming breaks
- **Low attendance warnings** - Alert participants with low attendance
- **Membership expiry warnings** - Remind members before expiration
- **Waitlist cleanup** - Remove expired waitlist offers

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CRON SERVICE (Vercel/External)                     │
│                                                                             │
│   Every day at 8 AM ──────────► GET /api/cron/run-all?taskType=SESSION_REMINDER
│   Every Friday at 10 AM ──────► GET /api/cron/run-all?taskType=BREAK_REMINDER
│   Every Monday at 9 AM ───────► GET /api/cron/run-all?taskType=LOW_ATTENDANCE_WARN
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        /api/cron/run-all (Global Endpoint)                   │
│                                                                             │
│   1. Authenticates with CRON_SECRET                                         │
│   2. Finds ALL active tasks of this type across all organizations           │
│   3. For each org with active task, calls /api/cron/run-task                │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        /api/cron/run-task (Per-Task Endpoint)                │
│                                                                             │
│   1. Creates ScheduledTaskRun record                                        │
│   2. Executes task-specific logic (e.g., send emails)                       │
│   3. Updates run status (SUCCESS/FAILED)                                    │
│   4. Updates task statistics (lastRunAt, runCount, etc.)                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Task Types

| Task Type | Default Schedule | Description |
|-----------|-----------------|-------------|
| `SESSION_REMINDER` | `0 8 * * *` (8 AM daily) | Sends reminder emails X hours before class |
| `BREAK_REMINDER` | `0 10 * * 5` (10 AM Fridays) | Notifies about upcoming break periods |
| `MISSED_SESSION_NOTIFY` | `0 22 * * *` (10 PM daily) | Notifies about missed sessions |
| `LOW_ATTENDANCE_WARN` | `0 9 * * 1` (9 AM Mondays) | Weekly low attendance warnings |
| `MEMBERSHIP_EXPIRY_WARN` | `0 10 * * *` (10 AM daily) | Membership expiration reminders |
| `WAITLIST_CLEANUP` | `0 */4 * * *` (Every 4 hours) | Removes expired waitlist offers |
| `REPORT_GENERATION` | `0 6 1 * *` (6 AM 1st of month) | Generates periodic reports |

## Setup Instructions

### Step 1: Set Environment Variables

Add the following to your environment variables (`.env.local`, Vercel dashboard, etc.):

```bash
# Required: Secret token for cron authentication
CRON_SECRET=your-secure-random-string-here

# Required: Base URL for internal API calls
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

> **Generating a secure CRON_SECRET:**
> ```bash
> # Using openssl
> openssl rand -hex 32
> 
> # Using Node.js
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

### Step 2: Configure Vercel Cron (Recommended)

Add the following to your `vercel.json` file in the project root:

```json
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
}
```

> **Note:** Vercel Cron automatically includes the `CRON_SECRET` in the Authorization header when calling your API routes.

### Step 3: Configure Vercel Cron Secret

In the Vercel dashboard:
1. Go to your project settings
2. Navigate to **Settings → Environment Variables**
3. Add `CRON_SECRET` with your secure value
4. Make sure it's set for **Production** (and Preview if needed)

### Alternative: External Cron Service

If not using Vercel Cron, you can use any external cron service (cron-job.org, EasyCron, AWS EventBridge, etc.):

```bash
# Example curl command for testing
curl -X GET "https://your-domain.com/api/cron/run-all?taskType=SESSION_REMINDER" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

#### Cron Job Configuration Template

| Task | URL | Schedule | HTTP Method |
|------|-----|----------|-------------|
| Session Reminders | `/api/cron/run-all?taskType=SESSION_REMINDER` | `0 8 * * *` | GET |
| Break Reminders | `/api/cron/run-all?taskType=BREAK_REMINDER` | `0 10 * * 5` | GET |
| Low Attendance | `/api/cron/run-all?taskType=LOW_ATTENDANCE_WARN` | `0 9 * * 1` | GET |
| Membership Expiry | `/api/cron/run-all?taskType=MEMBERSHIP_EXPIRY_WARN` | `0 10 * * *` | GET |
| Waitlist Cleanup | `/api/cron/run-all?taskType=WAITLIST_CLEANUP` | `0 */4 * * *` | GET |

**Required Headers:**
```
Authorization: Bearer YOUR_CRON_SECRET
```

## Admin Interface

### Platform Admin (`/admin/tasks`)

Platform administrators can:
- View all scheduled tasks across all organizations
- See which organizations have which tasks enabled
- Trigger a task type across all orgs simultaneously
- View recent task runs and success rates
- Access cron setup instructions

### Organization Admin (`/staffadmin/tasks`)

Organization administrators can:
- Enable/disable task types for their organization
- Configure task-specific settings (e.g., hours before session to send reminder)
- View task run history for their organization
- Manually trigger tasks for testing

## Database Schema

### ScheduledTask

```prisma
model ScheduledTask {
  id              String            @id @default(uuid())
  organizerId     String?           // null = platform-wide
  name            String
  taskType        ScheduledTaskType
  cronExpression  String
  isActive        Boolean           @default(true)
  config          Json?             // Task-specific configuration
  lastRunAt       DateTime?
  lastRunStatus   TaskRunStatus?
  lastRunMessage  String?
  nextRunAt       DateTime?
  runCount        Int               @default(0)
  failCount       Int               @default(0)
  
  // Relations
  Organizer       Organizer?
  CreatedBy       UserAccount?
  TaskRuns        ScheduledTaskRun[]
}
```

### ScheduledTaskRun

```prisma
model ScheduledTaskRun {
  id              String        @id @default(uuid())
  taskId          String
  startedAt       DateTime      @default(now())
  completedAt     DateTime?
  status          TaskRunStatus
  message         String?
  itemsProcessed  Int           @default(0)
  itemsFailed     Int           @default(0)
  details         Json?
  
  Task            ScheduledTask
}
```

## Task Configuration Options

Each task type can be configured with specific settings via the `config` JSON field:

### SESSION_REMINDER
```json
{
  "hoursBefore": 4,           // Hours before class to send reminder (default: 4)
  "templateSlug": "session-reminder"  // Email template to use
}
```

### LOW_ATTENDANCE_WARN
```json
{
  "threshold": 50,            // Attendance percentage threshold (default: 50)
  "minSessions": 3            // Minimum sessions before warning (default: 3)
}
```

### MEMBERSHIP_EXPIRY_WARN
```json
{
  "daysBefore": [30, 7, 1]    // Days before expiry to send reminders
}
```

### WAITLIST_CLEANUP
```json
{
  "expireAfterHours": 48      // Hours until waitlist offer expires
}
```

## Monitoring & Troubleshooting

### Check Recent Runs

1. Go to `/admin/tasks` (platform admin)
2. View "Recent Task Runs" section
3. Check status (SUCCESS/FAILED) and item counts

### Manual Testing

1. Go to `/admin/tasks` or `/staffadmin/tasks`
2. Click "Run All" or "Run Now" button
3. Check run history for results

### Common Issues

| Issue | Possible Cause | Solution |
|-------|---------------|----------|
| 401 Unauthorized | Missing/incorrect CRON_SECRET | Verify env variable is set correctly |
| No tasks run | No active tasks | Enable tasks in staffadmin for each org |
| Emails not sent | Email service misconfigured | Check email service settings and templates |
| Task stuck in RUNNING | Long execution or crash | Check logs, may need manual status reset |

### Logs

Task execution logs can be found in:
- Vercel Function Logs (for Vercel deployments)
- Server logs for `run-task` and `run-all` routes
- Database: `ScheduledTaskRun.details` JSON field

## Security Considerations

1. **CRON_SECRET** should be:
   - At least 32 characters long
   - Randomly generated
   - Unique per environment
   - Rotated periodically

2. **Rate limiting**: The cron endpoints do not have built-in rate limiting. Consider adding if exposed publicly.

3. **Timeout**: Task execution should complete within the serverless function timeout (default 10s for Vercel, can be extended).

## Cron Schedule Reference

```
* * * * *
│ │ │ │ │
│ │ │ │ └── Day of week (0-7, Sun=0 or 7)
│ │ │ └──── Month (1-12)
│ │ └────── Day of month (1-31)
│ └──────── Hour (0-23)
└────────── Minute (0-59)
```

**Common patterns:**
- `0 8 * * *` - Every day at 8:00 AM
- `0 */4 * * *` - Every 4 hours
- `0 9 * * 1` - Every Monday at 9:00 AM
- `0 10 * * 5` - Every Friday at 10:00 AM
- `0 6 1 * *` - First day of every month at 6:00 AM

## Email Templates Required

The following email templates must be seeded for tasks to work:

| Template Slug | Used By |
|---------------|---------|
| `session-reminder` | SESSION_REMINDER |
| `break-reminder` | BREAK_REMINDER |
| `attendance-low-warning` | LOW_ATTENDANCE_WARN |
| `missed-session` | MISSED_SESSION_NOTIFY |

Run the seed script to add these templates:
```bash
cd packages/database && npx tsx scripts/seed-email-templates.ts
```
