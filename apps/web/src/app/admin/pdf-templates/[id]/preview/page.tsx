import { prisma } from '@/lib/db'
import { requireAdmin } from '@/utils/auth-admin'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft, Download, Pencil } from 'lucide-react'
import { notFound } from 'next/navigation'
import { PdfTemplateType } from '@prisma/client'

const templateTypeLabels: Record<PdfTemplateType, string> = {
    EVENT_TICKET: 'Eventbillett',
    COURSE_TICKET: 'Kursbevis',
    ORDER_RECEIPT: 'Ordrekvittering',
    MEMBERSHIP_CARD: 'Medlemskort',
    CREDIT_NOTE: 'Kreditnota',
}

interface PreviewPdfTemplatePageProps {
    params: Promise<{ id: string }>
}

export default async function PreviewPdfTemplatePage({ params }: PreviewPdfTemplatePageProps) {
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
                <div className="flex-1">
                    <h1 className="rn-h2">Forhåndsvisning</h1>
                    <p className="rn-meta text-rn-text-muted">
                        {template.name} - {templateTypeLabels[template.type]}
                    </p>
                </div>
                <div className="flex gap-rn-2">
                    <Button asChild variant="outline">
                        <Link href={`/admin/pdf-templates/${id}`}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Rediger
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link href={`/api/admin/pdf-templates/${id}/preview`} target="_blank">
                            <Download className="h-4 w-4 mr-2" />
                            Last ned PDF
                        </Link>
                    </Button>
                </div>
            </div>

            {/* PDF Preview iframe */}
            <Card>
                <CardHeader>
                    <CardTitle>PDF-forhåndsvisning</CardTitle>
                    <CardDescription>
                        Eksempel på hvordan {templateTypeLabels[template.type].toLowerCase()} vil se ut med testdata
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border border-rn-border rounded-lg overflow-hidden bg-gray-100">
                        <iframe 
                            src={`/api/admin/pdf-templates/${id}/preview`}
                            className="w-full h-[800px]"
                            title="PDF Preview"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Template configuration summary */}
            <Card>
                <CardHeader>
                    <CardTitle>Malkonfigurasjon</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-2 gap-rn-4">
                        <div>
                            <h3 className="font-semibold mb-rn-2">Inkludert informasjon</h3>
                            <ul className="space-y-1 text-sm">
                                <li className="flex items-center gap-2">
                                    <span className={template.includeSellerInfo ? 'text-green-600' : 'text-rn-text-muted'}>
                                        {template.includeSellerInfo ? '✓' : '✗'}
                                    </span>
                                    Selgerinformasjon
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className={template.includePlatformInfo ? 'text-green-600' : 'text-rn-text-muted'}>
                                        {template.includePlatformInfo ? '✓' : '✗'}
                                    </span>
                                    Plattforminformasjon
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className={template.includeBuyerInfo ? 'text-green-600' : 'text-rn-text-muted'}>
                                        {template.includeBuyerInfo ? '✓' : '✗'}
                                    </span>
                                    Kjøperinformasjon
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className={template.includeVatBreakdown ? 'text-green-600' : 'text-rn-text-muted'}>
                                        {template.includeVatBreakdown ? '✓' : '✗'}
                                    </span>
                                    MVA-spesifikasjon
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className={template.includePaymentInfo ? 'text-green-600' : 'text-rn-text-muted'}>
                                        {template.includePaymentInfo ? '✓' : '✗'}
                                    </span>
                                    Betalingsinformasjon
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className={template.includeTerms ? 'text-green-600' : 'text-rn-text-muted'}>
                                        {template.includeTerms ? '✓' : '✗'}
                                    </span>
                                    Vilkår og betingelser
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-rn-2">Status</h3>
                            <ul className="space-y-1 text-sm">
                                <li>
                                    <span className="text-rn-text-muted">Standard:</span>{' '}
                                    {template.isDefault ? 'Ja' : 'Nei'}
                                </li>
                                <li>
                                    <span className="text-rn-text-muted">Aktiv:</span>{' '}
                                    {template.isActive ? 'Ja' : 'Nei'}
                                </li>
                                <li>
                                    <span className="text-rn-text-muted">Opprettet:</span>{' '}
                                    {template.createdAt.toLocaleDateString('nb-NO')}
                                </li>
                                <li>
                                    <span className="text-rn-text-muted">Sist oppdatert:</span>{' '}
                                    {template.updatedAt.toLocaleDateString('nb-NO')}
                                </li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
