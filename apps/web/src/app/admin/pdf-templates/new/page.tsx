import { requireAdmin } from '@/utils/auth-admin'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PdfTemplateForm } from '../pdf-template-form'
import { PdfTemplateType } from '@prisma/client'

interface NewPdfTemplatePageProps {
    searchParams: Promise<{ type?: string }>
}

export default async function NewPdfTemplatePage({ searchParams }: NewPdfTemplatePageProps) {
    await requireAdmin()
    
    const params = await searchParams
    const defaultType = params.type as PdfTemplateType | undefined

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
                    <h1 className="rn-h2">Ny PDF-mal</h1>
                    <p className="rn-meta text-rn-text-muted">
                        Opprett en ny mal for billetter eller kvitteringer
                    </p>
                </div>
            </div>

            <PdfTemplateForm defaultType={defaultType} />
        </div>
    )
}
