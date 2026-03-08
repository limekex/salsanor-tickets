import { prisma } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, BarChart2 } from 'lucide-react'
import Link from 'next/link'
import { getSelectedOrganizerForAdmin } from '@/utils/auth-org-admin'
import { ConversionTrackingForm } from './conversion-tracking-form'

export default async function ConversionTrackingPage() {
    const organizerId = await getSelectedOrganizerForAdmin()

    const organizer = await prisma.organizer.findUnique({
        where: { id: organizerId },
        select: {
            id: true,
            name: true,
            slug: true,
            googleAnalyticsId: true,
            facebookPixelId: true,
            googleAdsConversionId: true,
            googleAdsConversionLabel: true,
        }
    })

    if (!organizer) {
        throw new Error('Organization not found')
    }

    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl">
            <div className="mb-6">
                <Button asChild variant="ghost" size="sm">
                    <Link href="/staffadmin/settings">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Settings
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-rn-primary/10 rounded-lg">
                            <BarChart2 className="h-6 w-6 text-rn-primary" />
                        </div>
                        <div>
                            <CardTitle>Conversion Tracking</CardTitle>
                            <CardDescription>
                                Configure analytics and ad conversion tracking for {organizer.name}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                        <h4 className="font-medium">How it works</h4>
                        <p className="text-sm text-muted-foreground">
                            When a buyer arrives on RegiNor from your website (carrying UTM parameters
                            from a Google or Meta ad), we automatically capture those UTM values and
                            store them on the order. When payment succeeds, we fire the appropriate
                            conversion events to the platforms configured below — closing the loop
                            between your ad spend and actual registrations.
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Make sure the links on your website that lead to RegiNor include the UTM
                            parameters from the ad (e.g.{' '}
                            <code className="bg-background px-1.5 py-0.5 rounded text-xs font-mono">
                                https://reginor.no/org/{organizer.slug}/courses?utm_source=google&amp;utm_medium=cpc&amp;utm_campaign=salsa-spring
                            </code>
                            ).
                        </p>
                    </div>

                    <ConversionTrackingForm organizer={organizer} />
                </CardContent>
            </Card>
        </div>
    )
}
