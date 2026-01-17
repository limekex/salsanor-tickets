'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Building2 } from 'lucide-react'
import { useState, useTransition, useEffect } from 'react'
import { updateOrganizerSettings } from '@/app/actions/staffadmin'
import Link from 'next/link'
import type { Organizer } from '@salsanor/database'

interface OrgSettingsFormProps {
    organizer: Organizer
}

export function OrgSettingsForm({ organizer }: OrgSettingsFormProps) {
    const [isPending, startTransition] = useTransition()
    const [isEditing, setIsEditing] = useState(false)
    const [prefixValidation, setPrefixValidation] = useState<{ checking: boolean; message: string | null }>({
        checking: false,
        message: null
    })
    const [formData, setFormData] = useState({
        name: organizer.name,
        description: organizer.description || '',
        website: organizer.website || '',
        contactEmail: organizer.contactEmail || '',
        city: organizer.city || '',
        organizationNumber: organizer.organizationNumber || '',
        legalName: organizer.legalName || '',
        legalAddress: organizer.legalAddress || '',
        legalEmail: organizer.legalEmail || '',
        companyType: organizer.companyType || '',
        vatRegistered: organizer.vatRegistered ?? false,
        mvaRate: organizer.mvaRate ? Number(organizer.mvaRate) : 25,
        bankAccount: organizer.bankAccount || '',
        orderPrefix: organizer.orderPrefix || 'ORD',
    })
    const [error, setError] = useState<string | null>(null)

    // Debounced prefix check
    useEffect(() => {
        const timeoutId = setTimeout(async () => {
            const prefix = formData.orderPrefix
            if (!prefix || prefix.length < 3) {
                setPrefixValidation({ checking: false, message: null })
                return
            }

            setPrefixValidation({ checking: true, message: null })

            try {
                const params = new URLSearchParams({
                    prefix: prefix,
                    excludeId: organizer.id
                })
                const response = await fetch(`/api/organizers/check-prefix?${params}`)
                const data = await response.json()

                if (!data.available) {
                    setPrefixValidation({ checking: false, message: data.message })
                } else {
                    setPrefixValidation({ checking: false, message: null })
                }
            } catch (error) {
                console.error('Error checking prefix:', error)
                setPrefixValidation({ checking: false, message: null })
            }
        }, 500)

        return () => clearTimeout(timeoutId)
    }, [formData.orderPrefix, organizer.id])

    console.log('OrgSettingsForm render - isEditing:', isEditing, 'isPending:', isPending)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)

        const data = new FormData()
        data.append('name', formData.name)
        data.append('description', formData.description)
        data.append('website', formData.website)
        data.append('contactEmail', formData.contactEmail)
        data.append('city', formData.city)
        data.append('organizationNumber', formData.organizationNumber)
        data.append('legalName', formData.legalName)
        data.append('legalAddress', formData.legalAddress)
        data.append('legalEmail', formData.legalEmail)
        data.append('companyType', formData.companyType)
        data.append('vatRegistered', formData.vatRegistered.toString())
        data.append('mvaRate', formData.mvaRate.toString())
        data.append('bankAccount', formData.bankAccount)
        data.append('orderPrefix', formData.orderPrefix)

        startTransition(async () => {
            const result = await updateOrganizerSettings(organizer.id, data)
            
            if (result?.error) {
                setError(result.error.name?.[0] || result.error._form?.[0] || 'Failed to update')
            } else {
                setIsEditing(false)
            }
        })
    }

    function handleCancel() {
        setFormData({
            name: organizer.name,
            description: organizer.description || '',
            website: organizer.website || '',
            contactEmail: organizer.contactEmail || '',
            city: organizer.city || '',
            organizationNumber: organizer.organizationNumber || '',
            legalName: organizer.legalName || '',
            legalAddress: organizer.legalAddress || '',
            legalEmail: organizer.legalEmail || '',
            companyType: organizer.companyType || '',
            vatRegistered: organizer.vatRegistered ?? false,
            mvaRate: organizer.mvaRate ? Number(organizer.mvaRate) : 25,
            bankAccount: organizer.bankAccount || '',
            orderPrefix: organizer.orderPrefix || 'ORD',
        })
        setIsEditing(false)
        setError(null)
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        <Building2 className="h-6 w-6" />
                    </div>
                    <div>
                        <CardTitle>{organizer.name}</CardTitle>
                        <CardDescription>Organization ID: {organizer.id}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor={`name-${organizer.id}`}>Organization Name *</Label>
                            <Input 
                                id={`name-${organizer.id}`}
                                value={formData.name} 
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                disabled={!isEditing || isPending}
                                required
                            />
                        </div>
                        
                        <div className="grid gap-2">
                            <Label htmlFor={`description-${organizer.id}`}>Description</Label>
                            <Textarea
                                id={`description-${organizer.id}`}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                disabled={!isEditing || isPending}
                                rows={3}
                                placeholder="Brief description of your organization..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor={`city-${organizer.id}`}>City</Label>
                                <Input 
                                    id={`city-${organizer.id}`}
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    disabled={!isEditing || isPending}
                                    placeholder="Oslo"
                                />
                            </div>
                            
                            <div className="grid gap-2">
                                <Label htmlFor={`contactEmail-${organizer.id}`}>Contact Email</Label>
                                <Input 
                                    id={`contactEmail-${organizer.id}`}
                                    type="email"
                                    value={formData.contactEmail}
                                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                                    disabled={!isEditing || isPending}
                                    placeholder="contact@organization.com"
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor={`website-${organizer.id}`}>Website</Label>
                            <Input 
                                id={`website-${organizer.id}`}
                                type="url"
                                value={formData.website}
                                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                disabled={!isEditing || isPending}
                                placeholder="https://www.organization.com"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label>Slug / URL Path</Label>
                            <Input value={organizer.slug} disabled />
                            <p className="text-xs text-muted-foreground">
                                Public URL: /org/{organizer.slug} (Cannot be changed)
                            </p>
                        </div>

                        <div className="border-t pt-4 space-y-4">
                            <h3 className="text-lg font-semibold">Legal & Business Information</h3>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor={`organizationNumber-${organizer.id}`}>Organization Number</Label>
                                    <Input 
                                        id={`organizationNumber-${organizer.id}`}
                                        value={formData.organizationNumber}
                                        onChange={(e) => setFormData({ ...formData, organizationNumber: e.target.value })}
                                        disabled={!isEditing || isPending}
                                        placeholder="123456789"
                                        maxLength={9}
                                    />
                                    <p className="text-xs text-muted-foreground">9-digit Norwegian org.nr</p>
                                </div>
                                
                                <div className="grid gap-2">
                                    <Label htmlFor={`companyType-${organizer.id}`}>Company Type</Label>
                                    <Select 
                                        value={formData.companyType} 
                                        onValueChange={(value) => setFormData({ ...formData, companyType: value })}
                                        disabled={!isEditing || isPending}
                                    >
                                        <SelectTrigger id={`companyType-${organizer.id}`}>
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="AS">AS (Aksjeselskap)</SelectItem>
                                            <SelectItem value="ASA">ASA (Allmennaksjeselskap)</SelectItem>
                                            <SelectItem value="ENK">ENK (Enkeltpersonforetak)</SelectItem>
                                            <SelectItem value="DA">DA (Ansvarlig selskap)</SelectItem>
                                            <SelectItem value="NUF">NUF (Norskregistrert utenlandsk foretak)</SelectItem>
                                            <SelectItem value="BA">BA (Samvirkeforetak)</SelectItem>
                                            <SelectItem value="FLI">FLI (Fylkeskommunalt foretak)</SelectItem>
                                            <SelectItem value="IKJP">IKJP (Interkommunalt selskap)</SelectItem>
                                            <SelectItem value="KF">KF (Kommunalt foretak)</SelectItem>
                                            <SelectItem value="STI">STI (Stiftelse)</SelectItem>
                                            <SelectItem value="SA">SA (Selskap med delt ansvar)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor={`legalName-${organizer.id}`}>Legal Name</Label>
                                    <Input 
                                        id={`legalName-${organizer.id}`}
                                        value={formData.legalName}
                                        onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                                        disabled={!isEditing || isPending}
                                        placeholder="SalsaNor Oslo AS"
                                    />
                                    <p className="text-xs text-muted-foreground">Official registered company name</p>
                                </div>
                                
                                <div className="grid gap-2">
                                    <Label htmlFor={`bankAccount-${organizer.id}`}>Bank Account</Label>
                                    <Input 
                                        id={`bankAccount-${organizer.id}`}
                                        value={formData.bankAccount}
                                        onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                                        disabled={!isEditing || isPending}
                                        placeholder="1234.56.78901"
                                    />
                                    <p className="text-xs text-muted-foreground">Norwegian bank account number</p>
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor={`legalAddress-${organizer.id}`}>Legal Address</Label>
                                <Input 
                                    id={`legalAddress-${organizer.id}`}
                                    value={formData.legalAddress}
                                    onChange={(e) => setFormData({ ...formData, legalAddress: e.target.value })}
                                    disabled={!isEditing || isPending}
                                    placeholder="Gate 123, 0123 Oslo"
                                />
                                <p className="text-xs text-muted-foreground">Full legal address (format: Street, PostalCode City)</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor={`legalEmail-${organizer.id}`}>Legal Email</Label>
                                    <Input 
                                        id={`legalEmail-${organizer.id}`}
                                        type="email"
                                        value={formData.legalEmail}
                                        onChange={(e) => setFormData({ ...formData, legalEmail: e.target.value })}
                                        disabled={!isEditing || isPending}
                                        placeholder="legal@organization.com"
                                    />
                                    <p className="text-xs text-muted-foreground">Email shown on invoices and receipts</p>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor={`orderPrefix-${organizer.id}`}>Order Number Prefix</Label>
                                    <Input 
                                        id={`orderPrefix-${organizer.id}`}
                                        value={formData.orderPrefix}
                                        onChange={(e) => setFormData({ ...formData, orderPrefix: e.target.value.toUpperCase() })}
                                        disabled={!isEditing || isPending}
                                        placeholder="ORD"
                                        maxLength={5}
                                    />
                                    {prefixValidation.checking ? (
                                        <p className="text-xs text-muted-foreground">Checking availability...</p>
                                    ) : prefixValidation.message ? (
                                        <p className="text-xs text-destructive">{prefixValidation.message}</p>
                                    ) : (
                                        <p className="text-xs text-muted-foreground">3-5 characters (A-Z, 0-9 only)</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-start space-x-3 space-y-0">
                                <Checkbox 
                                    id={`vatRegistered-${organizer.id}`}
                                    checked={formData.vatRegistered}
                                    onCheckedChange={(checked) => setFormData({ ...formData, vatRegistered: checked as boolean })}
                                    disabled={!isEditing || isPending}
                                />
                                <div className="space-y-1 leading-none">
                                    <Label htmlFor={`vatRegistered-${organizer.id}`}>
                                        VAT Registered (MVA-registrert)
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Check if organization is registered for VAT/MVA
                                    </p>
                                </div>
                            </div>

                            {formData.vatRegistered && (
                                <div className="grid gap-2">
                                    <Label htmlFor={`mvaRate-${organizer.id}`}>MVA Rate (%)</Label>
                                    <Select 
                                        value={formData.mvaRate.toString()} 
                                        onValueChange={(value) => setFormData({ ...formData, mvaRate: Number(value) })}
                                        disabled={!isEditing || isPending}
                                    >
                                        <SelectTrigger id={`mvaRate-${organizer.id}`}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="0">0% (No VAT)</SelectItem>
                                            <SelectItem value="12">12% (Reduced rate - food, transport)</SelectItem>
                                            <SelectItem value="15">15% (Reduced rate - food services)</SelectItem>
                                            <SelectItem value="25">25% (Standard rate)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        Norwegian VAT rate for your products/services
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {error && <p className="text-sm text-destructive">{error}</p>}

                    <div className="flex gap-2">
                        {!isEditing ? (
                            <Button 
                                type="button" 
                                onClick={() => {
                                    console.log('Edit button clicked, setting isEditing to true')
                                    setIsEditing(true)
                                }}
                            >
                                Edit Organization
                            </Button>
                        ) : (
                            <>
                                <Button onClick={handleSubmit} disabled={isPending}>
                                    {isPending ? 'Saving...' : 'Save Changes'}
                                </Button>
                                <Button variant="outline" onClick={handleCancel} disabled={isPending}>
                                    Cancel
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2">Quick Links</h4>
                    <div className="grid gap-2 md:grid-cols-2">
                        <Button asChild variant="outline" size="sm">
                            <Link href={`/org/${organizer.slug}`}>
                                View Public Page
                            </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                            <Link href={`/staffadmin/periods`}>
                                Manage Periods
                            </Link>
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
