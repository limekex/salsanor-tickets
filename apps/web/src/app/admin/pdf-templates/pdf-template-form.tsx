'use client'

import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { PdfTemplateType } from '@prisma/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createPdfTemplate, updatePdfTemplate, PdfTemplateData } from '@/app/actions/admin/pdf-templates'
import { toast } from 'sonner'
import { Loader2, Save, FileText, Building2, Users, Receipt, FileCheck, CreditCard, QrCode } from 'lucide-react'

const templateTypeLabels: Record<PdfTemplateType, string> = {
    EVENT_TICKET: 'Eventbillett',
    COURSE_TICKET: 'Kursbevis',
    ORDER_RECEIPT: 'Ordrekvittering',
    MEMBERSHIP_CARD: 'Medlemskort',
    CREDIT_NOTE: 'Kreditnota',
}

interface PdfTemplateFormProps {
    template?: {
        id: string
        name: string
        type: PdfTemplateType
        isDefault: boolean
        isActive: boolean
        headerConfig: any
        bodyConfig: any
        footerConfig: any
        qrConfig: any
        includeSellerInfo: boolean
        includePlatformInfo: boolean
        includeBuyerInfo: boolean
        includeVatBreakdown: boolean
        includePaymentInfo: boolean
        includeTerms: boolean
        headerText: string | null
        footerText: string | null
        termsText: string | null
    } | null
    defaultType?: PdfTemplateType
}

export function PdfTemplateForm({ template, defaultType }: PdfTemplateFormProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [selectedType, setSelectedType] = useState<PdfTemplateType>(
        template?.type || defaultType || 'EVENT_TICKET'
    )

    const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<PdfTemplateData>({
        defaultValues: {
            name: template?.name || '',
            type: template?.type || defaultType || 'EVENT_TICKET',
            isDefault: template?.isDefault ?? false,
            isActive: template?.isActive ?? true,
            includeSellerInfo: template?.includeSellerInfo ?? true,
            includePlatformInfo: template?.includePlatformInfo ?? true,
            includeBuyerInfo: template?.includeBuyerInfo ?? true,
            includeVatBreakdown: template?.includeVatBreakdown ?? true,
            includePaymentInfo: template?.includePaymentInfo ?? true,
            includeTerms: template?.includeTerms ?? false,
            headerText: template?.headerText || '',
            footerText: template?.footerText || 'Denne billetten er personlig og kan ikke overdras.',
            termsText: template?.termsText || '',
            qrConfig: template?.qrConfig || {
                size: 150,
                position: 'center',
                showInstructions: true,
                instructionText: 'Skann QR-koden ved innsjekk'
            }
        }
    })

    const onSubmit = (data: PdfTemplateData) => {
        startTransition(async () => {
            try {
                data.type = selectedType
                
                if (template) {
                    await updatePdfTemplate(template.id, data)
                    toast.success('Mal oppdatert')
                } else {
                    await createPdfTemplate(data)
                    toast.success('Mal opprettet')
                    router.push('/admin/pdf-templates')
                }
            } catch {
                toast.error('Kunne ikke lagre malen')
            }
        })
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-rn-6">
            {/* Basic settings */}
            <Card>
                <CardHeader>
                    <CardTitle>Grunninnstillinger</CardTitle>
                    <CardDescription>Navn og type for malen</CardDescription>
                </CardHeader>
                <CardContent className="space-y-rn-4">
                    <div className="grid md:grid-cols-2 gap-rn-4">
                        <div className="space-y-rn-2">
                            <Label htmlFor="name">Malnavn</Label>
                            <Input 
                                id="name"
                                {...register('name', { required: 'Navn er påkrevd' })}
                                placeholder="f.eks. Standard eventbillett"
                            />
                            {errors.name && (
                                <p className="text-sm text-destructive">{errors.name.message}</p>
                            )}
                        </div>

                        <div className="space-y-rn-2">
                            <Label htmlFor="type">Maltype</Label>
                            <Select 
                                value={selectedType}
                                onValueChange={(value: PdfTemplateType) => setSelectedType(value)}
                                disabled={!!template}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(templateTypeLabels).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex items-center gap-rn-6">
                        <div className="flex items-center gap-rn-2">
                            <Switch 
                                id="isDefault"
                                checked={watch('isDefault')}
                                onCheckedChange={(checked) => setValue('isDefault', checked)}
                            />
                            <Label htmlFor="isDefault">Standard mal for denne typen</Label>
                        </div>

                        <div className="flex items-center gap-rn-2">
                            <Switch 
                                id="isActive"
                                checked={watch('isActive')}
                                onCheckedChange={(checked) => setValue('isActive', checked)}
                            />
                            <Label htmlFor="isActive">Aktiv</Label>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Legal compliance toggles */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-rn-2">
                        <FileCheck className="h-5 w-5" />
                        Juridiske krav
                    </CardTitle>
                    <CardDescription>
                        Velg hvilken informasjon som skal inkluderes i henhold til norsk lovgivning
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-2 gap-rn-4">
                        <div className="flex items-center justify-between p-rn-3 border border-rn-border rounded-lg">
                            <div className="flex items-center gap-rn-2">
                                <Building2 className="h-4 w-4 text-rn-text-muted" />
                                <div>
                                    <Label htmlFor="includeSellerInfo">Selgerinformasjon</Label>
                                    <p className="text-xs text-rn-text-muted">Arrangørens juridiske info</p>
                                </div>
                            </div>
                            <Switch 
                                id="includeSellerInfo"
                                checked={watch('includeSellerInfo')}
                                onCheckedChange={(checked) => setValue('includeSellerInfo', checked)}
                            />
                        </div>

                        <div className="flex items-center justify-between p-rn-3 border border-rn-border rounded-lg">
                            <div className="flex items-center gap-rn-2">
                                <CreditCard className="h-4 w-4 text-rn-text-muted" />
                                <div>
                                    <Label htmlFor="includePlatformInfo">Plattforminformasjon</Label>
                                    <p className="text-xs text-rn-text-muted">RegiNor som formidler</p>
                                </div>
                            </div>
                            <Switch 
                                id="includePlatformInfo"
                                checked={watch('includePlatformInfo')}
                                onCheckedChange={(checked) => setValue('includePlatformInfo', checked)}
                            />
                        </div>

                        <div className="flex items-center justify-between p-rn-3 border border-rn-border rounded-lg">
                            <div className="flex items-center gap-rn-2">
                                <Users className="h-4 w-4 text-rn-text-muted" />
                                <div>
                                    <Label htmlFor="includeBuyerInfo">Kjøperinformasjon</Label>
                                    <p className="text-xs text-rn-text-muted">Kundens navn og e-post</p>
                                </div>
                            </div>
                            <Switch 
                                id="includeBuyerInfo"
                                checked={watch('includeBuyerInfo')}
                                onCheckedChange={(checked) => setValue('includeBuyerInfo', checked)}
                            />
                        </div>

                        <div className="flex items-center justify-between p-rn-3 border border-rn-border rounded-lg">
                            <div className="flex items-center gap-rn-2">
                                <Receipt className="h-4 w-4 text-rn-text-muted" />
                                <div>
                                    <Label htmlFor="includeVatBreakdown">MVA-spesifikasjon</Label>
                                    <p className="text-xs text-rn-text-muted">Grunnlag, sats og beløp</p>
                                </div>
                            </div>
                            <Switch 
                                id="includeVatBreakdown"
                                checked={watch('includeVatBreakdown')}
                                onCheckedChange={(checked) => setValue('includeVatBreakdown', checked)}
                            />
                        </div>

                        <div className="flex items-center justify-between p-rn-3 border border-rn-border rounded-lg">
                            <div className="flex items-center gap-rn-2">
                                <CreditCard className="h-4 w-4 text-rn-text-muted" />
                                <div>
                                    <Label htmlFor="includePaymentInfo">Betalingsinformasjon</Label>
                                    <p className="text-xs text-rn-text-muted">Betalingsmetode og dato</p>
                                </div>
                            </div>
                            <Switch 
                                id="includePaymentInfo"
                                checked={watch('includePaymentInfo')}
                                onCheckedChange={(checked) => setValue('includePaymentInfo', checked)}
                            />
                        </div>

                        <div className="flex items-center justify-between p-rn-3 border border-rn-border rounded-lg">
                            <div className="flex items-center gap-rn-2">
                                <FileText className="h-4 w-4 text-rn-text-muted" />
                                <div>
                                    <Label htmlFor="includeTerms">Vilkår og betingelser</Label>
                                    <p className="text-xs text-rn-text-muted">Egendefinert tekst</p>
                                </div>
                            </div>
                            <Switch 
                                id="includeTerms"
                                checked={watch('includeTerms')}
                                onCheckedChange={(checked) => setValue('includeTerms', checked)}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* QR Code settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-rn-2">
                        <QrCode className="h-5 w-5" />
                        QR-kode innstillinger
                    </CardTitle>
                    <CardDescription>
                        Konfigurasjon for QR-koden som brukes til innsjekk
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-rn-4">
                    <div className="grid md:grid-cols-2 gap-rn-4">
                        <div className="space-y-rn-2">
                            <Label>QR-kode størrelse (piksler)</Label>
                            <Input 
                                type="number"
                                min={100}
                                max={300}
                                defaultValue={watch('qrConfig')?.size || 150}
                                onChange={(e) => setValue('qrConfig', {
                                    ...watch('qrConfig'),
                                    size: parseInt(e.target.value)
                                })}
                            />
                        </div>

                        <div className="space-y-rn-2">
                            <Label>Instruksjonstekst</Label>
                            <Input 
                                defaultValue={watch('qrConfig')?.instructionText || 'Skann QR-koden ved innsjekk'}
                                onChange={(e) => setValue('qrConfig', {
                                    ...watch('qrConfig'),
                                    instructionText: e.target.value
                                })}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Custom text fields */}
            <Card>
                <CardHeader>
                    <CardTitle>Egendefinert tekst</CardTitle>
                    <CardDescription>Tilpass teksten som vises på dokumentet</CardDescription>
                </CardHeader>
                <CardContent className="space-y-rn-4">
                    <div className="space-y-rn-2">
                        <Label htmlFor="footerText">Bunntekst</Label>
                        <Input 
                            id="footerText"
                            {...register('footerText')}
                            placeholder="Denne billetten er personlig og kan ikke overdras."
                        />
                    </div>

                    {watch('includeTerms') && (
                        <div className="space-y-rn-2">
                            <Label htmlFor="termsText">Vilkår og betingelser</Label>
                            <Textarea 
                                id="termsText"
                                {...register('termsText')}
                                placeholder="Skriv inn vilkår og betingelser som skal vises på dokumentet..."
                                rows={4}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex justify-end gap-rn-2">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                    Avbryt
                </Button>
                <Button type="submit" disabled={isPending}>
                    {isPending ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Lagrer...
                        </>
                    ) : (
                        <>
                            <Save className="h-4 w-4 mr-2" />
                            {template ? 'Oppdater mal' : 'Opprett mal'}
                        </>
                    )}
                </Button>
            </div>
        </form>
    )
}
