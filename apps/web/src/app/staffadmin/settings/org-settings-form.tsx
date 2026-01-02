'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Building2 } from 'lucide-react'
import { useState, useTransition } from 'react'
import { updateOrganizerSettings } from '@/app/actions/staffadmin'
import Link from 'next/link'
import type { Organizer } from '@salsanor/database'

interface OrgSettingsFormProps {
    organizer: Organizer
}

export function OrgSettingsForm({ organizer }: OrgSettingsFormProps) {
    const [isPending, startTransition] = useTransition()
    const [isEditing, setIsEditing] = useState(false)
    const [formData, setFormData] = useState({
        name: organizer.name,
        description: organizer.description || '',
        website: organizer.website || '',
        contactEmail: organizer.contactEmail || '',
        city: organizer.city || '',
    })
    const [error, setError] = useState<string | null>(null)

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
