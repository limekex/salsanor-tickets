'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState, useTransition } from 'react'
import { updateConversionTracking } from '@/app/actions/staffadmin'
import Link from 'next/link'

interface ConversionTrackingFormProps {
    organizer: {
        id: string
        name: string
        slug: string
        googleAnalyticsId: string | null
        facebookPixelId: string | null
        googleAdsConversionId: string | null
        googleAdsConversionLabel: string | null
    }
}

export function ConversionTrackingForm({ organizer }: ConversionTrackingFormProps) {
    const [isPending, startTransition] = useTransition()
    const [isEditing, setIsEditing] = useState(false)
    const [formData, setFormData] = useState({
        googleAnalyticsId: organizer.googleAnalyticsId || '',
        facebookPixelId: organizer.facebookPixelId || '',
        googleAdsConversionId: organizer.googleAdsConversionId || '',
        googleAdsConversionLabel: organizer.googleAdsConversionLabel || '',
    })
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        setSuccess(false)

        startTransition(async () => {
            try {
                const result = await updateConversionTracking(organizer.id, {
                    googleAnalyticsId: formData.googleAnalyticsId || null,
                    facebookPixelId: formData.facebookPixelId || null,
                    googleAdsConversionId: formData.googleAdsConversionId || null,
                    googleAdsConversionLabel: formData.googleAdsConversionLabel || null,
                })

                if (result.error) {
                    setError(result.error)
                } else {
                    setSuccess(true)
                    setIsEditing(false)
                }
            } catch {
                setError('Failed to update conversion tracking settings')
            }
        })
    }

    function handleCancel() {
        setFormData({
            googleAnalyticsId: organizer.googleAnalyticsId || '',
            facebookPixelId: organizer.facebookPixelId || '',
            googleAdsConversionId: organizer.googleAdsConversionId || '',
            googleAdsConversionLabel: organizer.googleAdsConversionLabel || '',
        })
        setIsEditing(false)
        setError(null)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                    {error}
                </div>
            )}

            {success && (
                <div className="bg-green-500/10 text-green-600 text-sm p-3 rounded-md">
                    Conversion tracking settings updated successfully
                </div>
            )}

            <div className="space-y-4">
                <h4 className="font-medium">Google Analytics</h4>
                <div className="grid gap-2">
                    <Label htmlFor="gaId">Google Analytics 4 Measurement ID</Label>
                    <Input
                        id="gaId"
                        value={formData.googleAnalyticsId}
                        onChange={(e) => setFormData({ ...formData, googleAnalyticsId: e.target.value })}
                        disabled={!isEditing || isPending}
                        placeholder="G-XXXXXXXXXX"
                    />
                    <p className="text-xs text-muted-foreground">
                        Your GA4 Measurement ID. Find it in Google Analytics → Admin → Data Streams → Your stream.
                    </p>
                </div>
            </div>

            <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium">Meta (Facebook/Instagram)</h4>
                <div className="grid gap-2">
                    <Label htmlFor="fbPixel">Meta Pixel ID</Label>
                    <Input
                        id="fbPixel"
                        value={formData.facebookPixelId}
                        onChange={(e) => setFormData({ ...formData, facebookPixelId: e.target.value })}
                        disabled={!isEditing || isPending}
                        placeholder="1234567890"
                    />
                    <p className="text-xs text-muted-foreground">
                        Your Meta Pixel ID. Find it in Meta Events Manager → Data Sources → Your Pixel.
                    </p>
                </div>
            </div>

            <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium">Google Ads</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="gadsId">Conversion ID</Label>
                        <Input
                            id="gadsId"
                            value={formData.googleAdsConversionId}
                            onChange={(e) => setFormData({ ...formData, googleAdsConversionId: e.target.value })}
                            disabled={!isEditing || isPending}
                            placeholder="AW-XXXXXXXXX"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="gadsLabel">Conversion Label</Label>
                        <Input
                            id="gadsLabel"
                            value={formData.googleAdsConversionLabel}
                            onChange={(e) => setFormData({ ...formData, googleAdsConversionLabel: e.target.value })}
                            disabled={!isEditing || isPending}
                            placeholder="XXXXXXXXXXXXXXXXXXX"
                        />
                    </div>
                </div>
                <p className="text-xs text-muted-foreground">
                    Find these in Google Ads → Tools & Settings → Conversions → Your conversion action → Tag setup.
                </p>
            </div>

            <div className="flex gap-3 pt-4 border-t">
                {isEditing ? (
                    <>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                        <Button type="button" variant="outline" onClick={handleCancel} disabled={isPending}>
                            Cancel
                        </Button>
                    </>
                ) : (
                    <Button type="button" onClick={() => setIsEditing(true)}>
                        Edit Settings
                    </Button>
                )}
            </div>

            <div className="pt-4 border-t">
                <Button asChild variant="outline" size="sm">
                    <Link href={`/staffadmin/analytics/conversions?organizerId=${organizer.id}`}>
                        View Conversion Analytics
                    </Link>
                </Button>
            </div>
        </form>
    )
}
