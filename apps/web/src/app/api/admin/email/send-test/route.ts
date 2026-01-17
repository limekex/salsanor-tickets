import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/utils/auth-admin'
import { emailService } from '@/lib/email/email-service'

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const body = await request.json()
    const { templateSlug, recipientEmail, variables, language } = body

    if (!templateSlug || !recipientEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: templateSlug and recipientEmail are required' },
        { status: 400 }
      )
    }

    console.log('[send-test] Sending test email:', { templateSlug, recipientEmail, language })

    const result = await emailService.sendTransactional({
      templateSlug,
      recipientEmail,
      variables,
      language,
    })

    if (!result.success) {
      console.error('[send-test] Email service returned error:', result.error)
      return NextResponse.json(
        { error: result.error || 'Failed to send test email' },
        { status: 500 }
      )
    }

    console.log('[send-test] Email sent successfully:', result.messageId)
    return NextResponse.json({ success: true, messageId: result.messageId })
  } catch (error) {
    console.error('[send-test] Exception sending test email:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to send test email: ${errorMessage}` },
      { status: 500 }
    )
  }
}
