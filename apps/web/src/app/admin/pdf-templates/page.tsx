import { prisma } from '@/lib/db'
import { requireAdmin } from '@/utils/auth-admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft, Plus, FileText, Ticket, Receipt, CreditCard, Eye, Pencil, FileX2 } from 'lucide-react'
import { PdfTemplateType } from '@prisma/client'

const templateTypeLabels: Record<PdfTemplateType, { label: string; icon: typeof FileText }> = {
    EVENT_TICKET: { label: 'Eventbillett', icon: Ticket },
    COURSE_TICKET: { label: 'Kursbevis', icon: FileText },
    ORDER_RECEIPT: { label: 'Ordrekvittering', icon: Receipt },
    INVOICE: { label: 'Faktura', icon: FileText },
    MEMBERSHIP_CARD: { label: 'Medlemskort', icon: CreditCard },
    CREDIT_NOTE: { label: 'Kreditnota', icon: FileX2 },
}

export default async function PdfTemplatesPage() {
    await requireAdmin()

    const templates = await prisma.pdfTemplate.findMany({
        orderBy: [
            { type: 'asc' },
            { isDefault: 'desc' },
            { name: 'asc' }
        ]
    })

    // Group templates by type
    const templatesByType = templates.reduce((acc, template) => {
        if (!acc[template.type]) {
            acc[template.type] = []
        }
        acc[template.type].push(template)
        return acc
    }, {} as Record<PdfTemplateType, typeof templates>)

    return (
        <div className="space-y-rn-6">
            <div className="flex items-center gap-rn-4">
                <Button asChild variant="ghost" size="sm">
                    <Link href="/admin">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Link>
                </Button>
                <div className="flex-1">
                    <h1 className="rn-h2">PDF-maler</h1>
                    <p className="rn-meta text-rn-text-muted">
                        Administrer maler for billetter, kvitteringer og medlemskort
                    </p>
                </div>
                <Button asChild>
                    <Link href="/admin/pdf-templates/new">
                        <Plus className="h-4 w-4 mr-2" />
                        Ny mal
                    </Link>
                </Button>
            </div>

            <div className="space-y-rn-6">
                {Object.values(PdfTemplateType).map(type => {
                    const typeInfo = templateTypeLabels[type]
                    const typeTemplates = templatesByType[type] || []
                    const Icon = typeInfo.icon

                    return (
                        <Card key={type}>
                            <CardHeader>
                                <div className="flex items-center gap-rn-2">
                                    <Icon className="h-5 w-5 text-rn-primary" />
                                    <CardTitle>{typeInfo.label}</CardTitle>
                                </div>
                                <CardDescription>
                                    {typeTemplates.length === 0 
                                        ? 'Ingen maler opprettet. Standardmal vil bli brukt.'
                                        : `${typeTemplates.length} mal${typeTemplates.length > 1 ? 'er' : ''}`
                                    }
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {typeTemplates.length === 0 ? (
                                    <div className="text-center py-rn-4">
                                        <p className="text-rn-text-muted mb-rn-4">
                                            Opprett en mal for å tilpasse {typeInfo.label.toLowerCase()}
                                        </p>
                                        <Button asChild variant="outline">
                                            <Link href={`/admin/pdf-templates/new?type=${type}`}>
                                                <Plus className="h-4 w-4 mr-2" />
                                                Opprett {typeInfo.label}-mal
                                            </Link>
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-rn-3">
                                        {typeTemplates.map(template => (
                                            <div 
                                                key={template.id}
                                                className="flex items-center justify-between p-rn-3 border border-rn-border rounded-lg"
                                            >
                                                <div className="flex items-center gap-rn-3">
                                                    <FileText className="h-5 w-5 text-rn-text-muted" />
                                                    <div>
                                                        <div className="flex items-center gap-rn-2">
                                                            <span className="font-medium">{template.name}</span>
                                                            {template.isDefault && (
                                                                <Badge variant="secondary">Standard</Badge>
                                                            )}
                                                            {!template.isActive && (
                                                                <Badge variant="outline">Inaktiv</Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-rn-text-muted">
                                                            Oppdatert {template.updatedAt.toLocaleDateString('nb-NO')}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-rn-2">
                                                    <Button asChild variant="ghost" size="sm">
                                                        <Link href={`/admin/pdf-templates/${template.id}/preview`}>
                                                            <Eye className="h-4 w-4 mr-1" />
                                                            Forhåndsvis
                                                        </Link>
                                                    </Button>
                                                    <Button asChild variant="ghost" size="sm">
                                                        <Link href={`/admin/pdf-templates/${template.id}`}>
                                                            <Pencil className="h-4 w-4 mr-1" />
                                                            Rediger
                                                        </Link>
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* Legal compliance info */}
            <Card>
                <CardHeader>
                    <CardTitle>Lovkrav for norske billetter</CardTitle>
                    <CardDescription>
                        I henhold til bokføringsloven og merverdiavgiftsloven
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-2 gap-rn-6">
                        <div>
                            <h3 className="font-semibold mb-rn-2">Selgerinformasjon (Arrangør)</h3>
                            <ul className="list-disc pl-5 space-y-1 text-sm text-rn-text-muted">
                                <li>Juridisk firmanavn</li>
                                <li>Organisasjonsnummer</li>
                                <li>Forretningsadresse</li>
                                <li>MVA-nummer (hvis MVA-registrert)</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-rn-2">Plattforminformasjon (Formidler)</h3>
                            <ul className="list-disc pl-5 space-y-1 text-sm text-rn-text-muted">
                                <li>Plattformens firmanavn</li>
                                <li>Organisasjonsnummer</li>
                                <li>Kontaktinformasjon</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-rn-2">Kjøperinformasjon</h3>
                            <ul className="list-disc pl-5 space-y-1 text-sm text-rn-text-muted">
                                <li>Navn</li>
                                <li>E-postadresse</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-rn-2">Transaksjonsinformasjon</h3>
                            <ul className="list-disc pl-5 space-y-1 text-sm text-rn-text-muted">
                                <li>Ordrenummer</li>
                                <li>Transaksjonsdato</li>
                                <li>Betalingsmetode</li>
                                <li>MVA-spesifikasjon (grunnlag, sats, beløp)</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
