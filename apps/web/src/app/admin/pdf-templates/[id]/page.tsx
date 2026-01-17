import { prisma } from '@/lib/db'
import { requireAdmin } from '@/utils/auth-admin'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PdfTemplateForm } from '../pdf-template-form'
import { notFound } from 'next/navigation'

interface EditPdfTemplatePageProps {
    params: Promise<{ id: string }>
}

export default async function EditPdfTemplatePage({ params }: EditPdfTemplatePageProps) {
    await requireAdmin()
    
    const { id } = await params

    const template = await prisma.pdfTemplate.findUnique({
        where: { id }
    })

    if (!template) {
        notFound()
    }

    return (
        <div className="space-y-rn-6">
            <div className="flex items-center gap-rn-4">
                <Button asChild variant="ghost" size="sm">
                    <Link href="/admin/pdf-templates">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Tilbake
                    </Link>
                </Button>
                <div>
                    <h1 className="rn-h2">Rediger mal</h1>
                    <p className="rn-meta text-rn-text-muted">
                        {template.name}
                    </p>
                </div>
            </div>

            <PdfTemplateForm template={{
                ...template,
                headerConfig: template.headerConfig as any,
                bodyConfig: template.bodyConfig as any,
                footerConfig: template.footerConfig as any,
                qrConfig: template.qrConfig as any,
            }} />
        </div>
    )
}
