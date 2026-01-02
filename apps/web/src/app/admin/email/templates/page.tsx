import { getEmailTemplates } from '@/app/actions/admin/email-templates'
import { EmailTemplateEditor } from './email-template-editor'

export default async function EmailTemplatesPage() {
  const templates = await getEmailTemplates()

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Email Templates</h1>
        <p className="text-muted-foreground mt-2">
          Manage and customize email templates sent to users
        </p>
      </div>

      <EmailTemplateEditor templates={templates} />
    </div>
  )
}
