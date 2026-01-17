import * as brevo from '@getbrevo/brevo';
import { TransactionalEmailsApiApiKeys } from '@getbrevo/brevo';
import { convert } from 'html-to-text';
import { prisma } from '@/lib/db';
import type { EmailCategory } from '@prisma/client';
import { randomUUID } from 'crypto';

// Types
interface SendEmailParams {
  organizerId?: string;
  templateSlug: string;
  recipientEmail: string;
  recipientName?: string;
  variables: Record<string, any>;
  language?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
  }>;
}

interface SendBulkEmailParams {
  organizerId: string;
  templateSlug: string;
  recipients: Array<{
    email: string;
    name?: string;
    variables: Record<string, any>;
  }>;
  language?: string;
}

interface EmailSettings {
  fromName: string;
  fromEmail: string;
  replyToEmail: string;
  primaryLanguage: string;
}

interface EmailTemplate {
  id: string;
  subject: string;
  htmlContent: string;
  textContent: string | null;
}

class EmailService {
  private async getApiInstance(): Promise<brevo.TransactionalEmailsApi> {
    // Get email provider configuration from database
    const provider = await prisma.emailProvider.findFirst({
      where: { isActive: true },
    });

    if (!provider) {
      throw new Error('No active email provider configured. Please configure an email provider in Settings > Email.');
    }

    // API key: prefer environment variable, fallback to database (for backwards compatibility)
    const apiKey = process.env.BREVO_API_KEY || provider.apiKey;

    if (!apiKey) {
      throw new Error('BREVO_API_KEY must be set in environment variables.');
    }

    // Initialize Brevo API with key from environment
    const apiInstance = new brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(TransactionalEmailsApiApiKeys.apiKey, apiKey);

    return apiInstance;
  }

  /**
   * Get email settings for an organization or global settings
   */
  private async getEmailSettings(organizerId?: string): Promise<EmailSettings> {
    // Try to get organization-specific settings first
    if (organizerId) {
      const orgSettings = await prisma.emailSettings.findUnique({
        where: { organizerId },
      });
      if (orgSettings) {
        return orgSettings;
      }
    }

    // Fallback to global settings
    const globalSettings = await prisma.emailSettings.findFirst({
      where: { organizerId: null },
    });

    if (!globalSettings) {
      // Return default settings if nothing is configured
      return {
        fromName: 'RegiNor Platform',
        fromEmail: 'noreply@reginor.no',
        replyToEmail: 'support@reginor.no',
        primaryLanguage: 'no',
      };
    }

    return globalSettings;
  }

  /**
   * Get email template by slug, organization, and language
   */
  private async getTemplate(params: {
    organizerId?: string;
    slug: string;
    language: string;
  }): Promise<EmailTemplate | null> {
    const { organizerId, slug, language } = params;

    // Try organization-specific template first
    if (organizerId) {
      const orgTemplate = await prisma.emailTemplate.findFirst({
        where: {
          organizerId,
          slug,
          language,
          isActive: true,
        },
      });
      if (orgTemplate) {
        return orgTemplate;
      }
    }

    // Fallback to global template
    const globalTemplate = await prisma.emailTemplate.findFirst({
      where: {
        organizerId: null,
        slug,
        language,
        isActive: true,
      },
    });

    if (!globalTemplate) {
      return null;
    }

    return globalTemplate;
  }

  /**
   * Render template with variables
   */
  private renderTemplate(
    template: EmailTemplate,
    variables: Record<string, any>
  ): { subject: string; html: string; text: string } {
    let html = template.htmlContent;
    let subject = template.subject;
    let text = template.textContent || '';

    // Replace all variables in subject, HTML, and text
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      const stringValue = String(value ?? '');
      
      html = html.replace(placeholder, stringValue);
      subject = subject.replace(placeholder, stringValue);
      text = text.replace(placeholder, stringValue);
    }

    // If no text content, convert HTML to text
    if (!text) {
      text = convert(html, {
        wordwrap: 130,
        selectors: [
          { selector: 'a', options: { ignoreHref: false } },
          { selector: 'img', format: 'skip' },
        ],
      });
    }

    return { subject, html, text };
  }

  /**
   * Log email to database
   */
  private async logEmail(params: {
    organizerId?: string;
    templateId: string;
    recipientEmail: string;
    recipientName?: string;
    subject: string;
    status: string;
    providerMessageId?: string;
    metadata?: Record<string, any>;
    errorMessage?: string;
  }) {
    await prisma.emailLog.create({
      data: {
        id: randomUUID(),
        organizerId: params.organizerId || null,
        templateId: params.templateId,
        recipientEmail: params.recipientEmail,
        recipientName: params.recipientName || null,
        subject: params.subject,
        status: params.status as any,
        providerMessageId: params.providerMessageId || null,
        sentAt: params.status === 'SENT' ? new Date() : null,
        errorMessage: params.errorMessage || null,
        metadata: params.metadata || undefined,
      },
    });
  }

  /**
   * Send a transactional email
   */
  async sendTransactional(params: SendEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // 1. Get email settings
      const settings = await this.getEmailSettings(params.organizerId);

      // 2. Get template
      const template = await this.getTemplate({
        organizerId: params.organizerId,
        slug: params.templateSlug,
        language: params.language || settings.primaryLanguage,
      });

      if (!template) {
        throw new Error(`Template not found: ${params.templateSlug} (${params.language || settings.primaryLanguage})`);
      }

      // 3. Render template
      const rendered = this.renderTemplate(template, params.variables);

      // 4. Get API instance with credentials from database
      const apiInstance = await this.getApiInstance();

      // 5. Send via Brevo
      const sendSmtpEmail = new brevo.SendSmtpEmail();
      sendSmtpEmail.sender = {
        name: settings.fromName,
        email: settings.fromEmail,
      };
      sendSmtpEmail.to = [
        {
          email: params.recipientEmail,
          name: params.recipientName,
        },
      ];
      sendSmtpEmail.replyTo = {
        email: settings.replyToEmail,
      };
      sendSmtpEmail.subject = rendered.subject;
      sendSmtpEmail.htmlContent = rendered.html;
      sendSmtpEmail.textContent = rendered.text;
      sendSmtpEmail.headers = {
        'X-Entity-Ref-ID': params.organizerId || 'global',
      };

      // Add attachments if provided
      if (params.attachments && params.attachments.length > 0) {
        sendSmtpEmail.attachment = params.attachments.map(att => ({
          name: att.filename,
          content: att.content.toString('base64'),
        }));
      }

      const result = await apiInstance.sendTransacEmail(sendSmtpEmail);

      // 6. Log email
      await this.logEmail({
        organizerId: params.organizerId,
        templateId: template.id,
        recipientEmail: params.recipientEmail,
        recipientName: params.recipientName,
        subject: rendered.subject,
        status: 'SENT',
        providerMessageId: result.body?.messageId,
        metadata: params.variables,
      });

      return {
        success: true,
        messageId: result.body?.messageId,
      };
    } catch (error) {
      console.error('Failed to send email:', error);
      
      // Log detailed error information
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        console.error('Brevo API error details:', {
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          data: axiosError.response?.data,
          headers: axiosError.response?.headers,
        });
      }
      
      // Try to log the failure
      try {
        const template = await this.getTemplate({
          organizerId: params.organizerId,
          slug: params.templateSlug,
          language: params.language || 'no',
        });
        
        if (template) {
          await this.logEmail({
            organizerId: params.organizerId,
            templateId: template.id,
            recipientEmail: params.recipientEmail,
            recipientName: params.recipientName,
            subject: params.templateSlug,
            status: 'FAILED',
            errorMessage: error instanceof Error ? error.message : String(error),
            metadata: params.variables,
          });
        }
      } catch (logError) {
        console.error('Failed to log email error:', logError);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Send bulk emails (queued for future implementation)
   */
  async sendBulk(params: SendBulkEmailParams): Promise<{ success: boolean; queued: number; error?: string }> {
    // TODO: Implement queue system with BullMQ or similar
    // For now, send emails one by one with delay
    let queued = 0;

    for (const recipient of params.recipients) {
      try {
        await this.sendTransactional({
          organizerId: params.organizerId,
          templateSlug: params.templateSlug,
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          variables: recipient.variables,
          language: params.language,
        });
        queued++;
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to send bulk email to ${recipient.email}:`, error);
      }
    }

    return {
      success: queued > 0,
      queued,
    };
  }
}

// Export singleton instance
export const emailService = new EmailService();
