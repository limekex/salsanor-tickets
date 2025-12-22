# Implement Email System with Templates

## Priority
**HIGH** - Dependency for multiple features (tickets, memberships, waitlist, payments)

## Description
Build a comprehensive email system with global configuration, organization-specific settings, customizable templates, and support for both transactional and bulk emails. The system must support Norwegian and English languages, with drag-and-drop template editing for non-technical users.

## Current Status
- ✅ Email provider configured (Brevo/SendGrid)
- ✅ 18 email templates (9 types × 2 languages)
- ✅ Template editor (HTML/text editing with preview)
- ✅ Email sending infrastructure (emailService)
- ✅ Email tracking/logging (EmailLog model)
- ⬜ Drag & drop template builder
- ⬜ Advanced analytics dashboard
- ⬜ Bulk email sending
- ⬜ A/B testing

**Last Updated:** 21. desember 2025  
**See Also:** [Email System Status Report](../EMAIL_SYSTEM_STATUS.md)

## Requirements

### Global Email Configuration (ADMIN only)
- [x] Email provider selection
  - ✅ Brevo (implemented)
  - ⬜ SendGrid (alternative)
  - ⬜ AWS SES (enterprise)
  - ⬜ SMTP fallback
- [x] API key/credentials management
- [x] Default sender configuration
  - From name: Configurable
  - From email: Configurable
  - Reply-to: Configurable
- [ ] Rate limiting configuration
  - Per-hour limits
  - Per-day limits
  - Burst protection
- [ ] Bounce/complaint handling
  - Webhook endpoints
  - Automatic suppression list
- [x] Test email functionality
  - Send test to admin email
  - Verify configuration

### Organization Email Settings (ORG_ADMIN)
- [ ] Override sender details
  - From name: "[Organization Name]"
  - From email: Custom domain or platform subdomain
  - Reply-to: Organization contact email
- [ ] Email signature
  - Organization logo
  - Contact information
  - Social media links
- [ ] Language preferences
  - Primary language (Norwegian/English)
  - Fallback language
- [ ] Notification preferences
  - Enable/disable specific email types
  - CC copies to organization email
  - BCC admin on all emails

### Email Templates
- [x] Template categories:
  - **Transactional** (order confirmations, tickets, payments)
  - **Notifications** (waitlist updates, membership approvals)
  - **Marketing** (newsletters, announcements)
  - **System** (password reset, account verification)
- [x] Default templates (Norwegian + English):
  - [x] Order confirmation
  - [ ] Ticket delivery (uses order confirmation for now)
  - [ ] Payment receipt (uses order confirmation for now)
  - [x] Payment failed
  - [ ] Waitlist confirmation
  - [x] Waitlist offer (spot available)
  - [ ] Waitlist expired
  - [x] Membership approval
  - [ ] Membership rejection (uses generic notification)
  - [x] Membership renewal reminder
  - [x] Event reminder
  - [x] Password reset
  - [x] Welcome email
  - [x] Test email (for testing configuration)
- [x] Template variables:
  - ✅ All major variables implemented (recipientName, organizationName, eventName, etc.)
  - ✅ Variable substitution working
  - ✅ Preview with sample data

### Template Editor (Drag & Drop)
- [x] Basic template editor
  - [x] HTML editor with syntax highlighting
  - [x] Text content editor (plain text fallback)
  - [x] Live preview with variable substitution
  - [x] Subject and preheader editing
  - [x] Template selection by category and language
  - [x] Save functionality
- [ ] Advanced drag & drop builder
  - [ ] Drag & drop components:
    - [ ] Header with logo
    - [ ] Text blocks
    - [ ] Buttons (CTA)
    - [ ] Images
    - [ ] Dividers
    - [ ] Footer
  - [ ] Pre-built layouts:
    - [ ] Single column
    - [ ] Two column
    - [ ] Hero with image
  - [ ] Responsive preview (mobile/desktop)
- [x] Variable insertion
  - ✅ Display of available variables
  - ✅ Preview with sample data
  - ⬜ Click to insert dropdown
- [ ] Template versioning
  - Save drafts
  - Publish/unpublish
  - Version history
  - Rollback capability
- [ ] A/B testing support
  - Create variants
  - Track performance
  - Auto-select winner
    - Single column
    - Two column
    - Hero with image
  - Responsive preview (mobile/desktop)
- [ ] HTML editor (advanced users)
  - Syntax highlighting
  - Live preview
  - HTML validation
- [ ] Variable insertion
  - Dropdown menu of available variables
  - Click to insert
  - Preview with sample data
- [ ] Template versioning
  - Save drafts
  - Publish/unpublish
  - Version history
  - Rollback capability
- [ ] A/B testing support
  - Create variants
  - Track performance
  - Auto-select winner

### Email Sending Infrastructure
- [x] Basic transactional sending
  - ✅ EmailService singleton
  - ✅ Brevo integration
  - ✅ Template loading and rendering
  - ✅ Variable substitution
  - ✅ Error handling
- [ ] Queueing system
  - Background job processing (Bull/BullMQ)
  - Retry logic with exponential backoff
  - Dead letter queue for failures
- [ ] Batch sending
  - Bulk email support (newsletters)
  - Rate limiting per provider
  - Progress tracking
- [ ] Priority levels
  - High: Transactional (immediate)
  - Medium: Notifications (5min delay)
  - Low: Marketing (scheduled)
- [ ] Scheduling
  - Send at specific time
  - Send in recipient timezone
  - Recurring emails

### Email Tracking & Analytics
- [x] Basic logging
  - ✅ EmailLog table
  - ✅ Status tracking (SENT, DELIVERED, FAILED, BOUNCED)
  - ✅ Template usage tracking
  - ✅ Error message logging
  - ✅ Admin UI for viewing logs
- [ ] Delivery tracking
  - Sent count (✅ basic)
  - Delivered count (⬜ webhook needed)
  - Bounced count (⬜ webhook needed)
  - Failed count (✅ basic)
- [ ] Engagement tracking
  - Open rate (pixel tracking)
  - Click rate (link tracking)
  - Time to open
  - Device/client detection
- [ ] Per-template analytics
  - Performance dashboard
  - Comparison over time
  - Best performing templates
- [ ] Per-organization analytics
  - Email volume
  - Delivery rate
  - Engagement metrics

### Database Schema

**Status:** ✅ Implemented in `packages/database/prisma/schema.prisma`

All models below are fully implemented and migrated:

```prisma
model EmailProvider {
  id              String   @id @default(uuid())
  provider        EmailProviderType // BREVO, RESEND, SENDGRID, SES, SMTP
  apiKey          String?  // Encrypted
  smtpHost        String?
  smtpPort        Int?
  smtpUsername    String?
  smtpPassword    String?  // Encrypted
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model EmailSettings {
  id                String   @id @default(uuid())
  organizerId       String?  @unique // null = global settings
  fromName          String
  fromEmail         String
  replyToEmail      String
  enableLogo        Boolean  @default(true)
  enableSignature   Boolean  @default(true)
  signatureHtml     String?  @db.Text
  primaryLanguage   String   @default("no")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  organizer         Organizer? @relation(fields: [organizerId], references: [id])
}

model EmailTemplate {
  id              String   @id @default(uuid())
  organizerId     String?  // null = global template
  category        EmailCategory
  name            String   // "Order Confirmation"
  slug            String   // "order-confirmation"
  language        String   @default("no")
  subject         String
  preheader       String?  // Preview text
  htmlContent     String   @db.Text
  textContent     String?  @db.Text
  variables       Json     // Available variables for this template
  isActive        Boolean  @default(true)
  version         Int      @default(1)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  organizer       Organizer? @relation(fields: [organizerId], references: [id])
  emailLogs       EmailLog[]
  @@unique([organizerId, slug, language])
  @@index([category, isActive])
}

enum EmailCategory {
  TRANSACTIONAL
  NOTIFICATION
  MARKETING
  SYSTEM
}

model EmailLog {
  id                  String   @id @default(uuid())
  organizerId         String?
  templateId          String?
  recipientEmail      String
  recipientName       String?
  subject             String
  status              EmailStatus
  providerMessageId   String?
  sentAt              DateTime?
  deliveredAt         DateTime?
  openedAt            DateTime?
  clickedAt           DateTime?
  bouncedAt           DateTime?
  errorMessage        String?  @db.Text
  metadata            Json?    // Variables used, links clicked, etc
  createdAt           DateTime @default(now())
  template            EmailTemplate? @relation(fields: [templateId], references: [id])
  organizer           Organizer? @relation(fields: [organizerId], references: [id])
  @@index([recipientEmail])
  @@index([status])
  @@index([createdAt])
}

enum EmailStatus {
  QUEUED
  SENDING
  SENT
  DELIVERED
  OPENED
  CLICKED
  BOUNCED
  FAILED
}
```

## Technical Implementation

**Status:** ✅ Core implementation complete

### Implemented Components

### Email Service Layer

```typescript
// lib/email/email-service.ts
import { Resend } from 'resend'

export class EmailService {
  private resend: Resend
  
  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY)
  }
  
  async sendTransactional(params: {
    organizerId?: string
    templateSlug: string
    recipientEmail: string
    recipientName?: string
    variables: Record<string, any>
    language?: string
  }) {
    // 1. Load email settings for organization (or global)
    const settings = await this.getEmailSettings(params.organizerId)
    
    // 2. Load template
    const template = await this.getTemplate({
      organizerId: params.organizerId,
      slug: params.templateSlug,
      language: params.language || settings.primaryLanguage
    })
    
    if (!template) {
      throw new Error(`Template not found: ${params.templateSlug}`)
    }
    
    // 3. Render template with variables
    const rendered = this.renderTemplate(template, params.variables)
    
    // 4. Send via provider
    const result = await this.resend.emails.send({
      from: `${settings.fromName} <${settings.fromEmail}>`,
      to: params.recipientEmail,
      replyTo: settings.replyToEmail,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      headers: {
        'X-Entity-Ref-ID': params.organizerId || 'global'
      }
    })
    
    // 5. Log email
    await this.logEmail({
      organizerId: params.organizerId,
      templateId: template.id,
      recipientEmail: params.recipientEmail,
      recipientName: params.recipientName,
      subject: rendered.subject,
      status: 'SENT',
      providerMessageId: result.id,
      metadata: params.variables
    })
    
    return result
  }
  
  async sendBulk(params: {
    organizerId: string
    templateSlug: string
    recipients: Array<{
      email: string
      name?: string
      variables: Record<string, any>
    }>
    language?: string
  }) {
    // Queue bulk emails with rate limiting
    for (const recipient of params.recipients) {
      await this.queueEmail({
        organizerId: params.organizerId,
        templateSlug: params.templateSlug,
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        variables: recipient.variables,
        priority: 'LOW'
      })
    }
  }
  
  private renderTemplate(template: EmailTemplate, variables: Record<string, any>) {
    let html = template.htmlContent
    let subject = template.subject
    
    // Replace variables
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`
      html = html.replaceAll(placeholder, String(value))
      subject = subject.replaceAll(placeholder, String(value))
    }
    
    return {
      subject,
      html,
      text: this.htmlToText(html)
    }
  }
}
```

### Email Queue (BullMQ)

```typescript
// lib/email/email-queue.ts
import { Queue, Worker } from 'bullmq'
import { EmailService } from './email-service'

const emailQueue = new Queue('emails', {
  connection: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT)
  }
})

const emailWorker = new Worker('emails', async (job) => {
  const emailService = new EmailService()
  
  try {
    await emailService.sendTransactional(job.data)
  } catch (error) {
    console.error('Email send failed:', error)
    throw error // Will retry with backoff
  }
}, {
  connection: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT)
  },
  limiter: {
    max: 100, // 100 emails
    duration: 1000 // per second
  }
})

export async function queueEmail(params: any) {
  await emailQueue.add('send', params, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  })
}
```

## UI Components

### EmailSettingsForm (Global & Org)
- Provider selection
- API key input (masked)
- From/Reply-to configuration
- Test email button
- Save settings

### EmailTemplateList
- Table of templates
- Category filter
- Language filter
- Active/Inactive toggle
- Create new template button
- Edit/Delete actions

### EmailTemplateEditor
- Template builder (React Email or similar)
- Variable palette
- Preview pane
- Save draft/Publish buttons
- Send test email

### EmailAnalyticsDashboard
- Volume chart (sent over time)
- Delivery rate gauge
- Open rate gauge
- Click rate gauge
- Recent emails table
- Failed emails alert

## Required Routes

### Admin Routes
- `/admin/email/settings` - Global email configuration
- `/admin/email/templates` - Global template management
- `/admin/email/templates/new` - Create template
- `/admin/email/templates/[id]` - Edit template
- `/admin/email/analytics` - Global email analytics
- `/admin/email/logs` - Email delivery logs

### Staff Admin Routes
- `/staffadmin/email/settings` - Organization email settings
- `/staffadmin/email/templates` - Organization templates (inherits + overrides)
- `/staffadmin/email/send` - Send bulk email
- `/staffadmin/email/analytics` - Organization analytics

### API Routes
- `POST /api/admin/email/test` - Send test email
- `POST /api/admin/email/templates` - Create template
- `PUT /api/admin/email/templates/[id]` - Update template
- `DELETE /api/admin/email/templates/[id]` - Delete template
- `POST /api/email/send` - Queue email (internal)
- `POST /api/webhooks/email/[provider]` - Delivery webhooks

## Server Actions
- `admin/email-settings.ts` - Manage global settings
- `staffadmin/email-settings.ts` - Manage org settings
- `admin/email-templates.ts` - Template CRUD
- `email/send-transactional.ts` - Send single email
- `email/send-bulk.ts` - Queue bulk emails

## Integration Points

### Order Confirmation (Issue #8)
```typescript
await emailService.sendTransactional({
  organizerId: order.period.organizerId,
  templateSlug: 'order-confirmation',
  recipientEmail: order.purchaserPerson.email,
  recipientName: order.purchaserPerson.firstName,
  variables: {
    recipientName: order.purchaserPerson.firstName,
    orderTotal: formatCurrency(order.totalCents),
    ticketUrl: `${BASE_URL}/tickets/${ticket.id}`
  }
})
```

### Membership Approval (Issue #7)
```typescript
await emailService.sendTransactional({
  organizerId: membership.organizerId,
  templateSlug: 'membership-approved',
  recipientEmail: membership.person.email,
  recipientName: membership.person.firstName,
  variables: {
    recipientName: membership.person.firstName,
    memberNumber: membership.memberNumber,
    validUntil: format(membership.validTo, 'dd.MM.yyyy')
  }
})
```

### Waitlist Offer (Issue #4)
```typescript
await emailService.sendTransactional({
  organizerId: registration.period.organizerId,
  templateSlug: 'waitlist-offer',
  recipientEmail: registration.person.email,
  recipientName: registration.person.firstName,
  variables: {
    recipientName: registration.person.firstName,
    eventName: registration.track.title,
    paymentUrl: `${BASE_URL}/register/${registration.id}/pay`,
    expiryDate: format(addHours(new Date(), 48), 'dd.MM.yyyy HH:mm')
  }
})
```

## Testing Checklist
- [ ] Unit test: Template rendering with variables
- [ ] Unit test: Email validation
- [ ] Integration test: Send test email via Resend
- [ ] Integration test: Webhook handling
- [ ] Integration test: Queue processing
- [ ] Test: Bulk email rate limiting
- [ ] Test: Retry logic on failure
- [ ] Test: Template inheritance (org overrides global)
- [ ] Test: Multi-language template selection
- [ ] E2E: Send email from order confirmation

## Success Criteria
- [ ] Admin can configure email provider
- [ ] Admin can create/edit templates with drag-drop
- [ ] Organization can override sender details
- [ ] Organization can customize templates
- [ ] Transactional emails send within 1 second
- [ ] Bulk emails respect rate limits
- [ ] All emails are logged with delivery status
- [ ] Email analytics show open/click rates
- [ ] Failed emails are retried automatically
- [ ] Bounces are tracked and suppressed

## Dependencies
- Email provider account (Resend recommended)
- Redis for queue (or alternative job queue)
- Email template library (React Email/MJML)
- Analytics tracking (pixel/link tracking)

## Recommended Tools
- **Resend** - Modern email API for EU compliance
- **React Email** - Build templates with React components
- **BullMQ** - Redis-based job queue
- **GrapesJS** - Drag-and-drop email builder (optional)
- **MJML** - Responsive email markup language

## Related Issues
- #2 - Ticket fulfillment (order confirmation emails)
- #4 - Waitlist system (waitlist notification emails)
- #7 - Membership management (approval emails)
- #8 - Stripe webhooks (payment confirmation emails)

## References
- Resend Docs: https://resend.com/docs
- React Email: https://react.email
- Email Best Practices: https://www.emailonacid.com/blog/

## Notes
- Start with Resend for simplicity and EU compliance
- Use React Email for maintainable templates
- Consider storing templates as React components in code
- Implement webhook handling for delivery tracking
- Add unsubscribe functionality for marketing emails
- Ensure GDPR compliance for EU recipients
- Consider using Postmark for higher deliverability
- Add SPF/DKIM/DMARC configuration guide for custom domains
