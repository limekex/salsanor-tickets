
import { getAllOrganizers } from '@/app/actions/organizers'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default async function OrganizersPage() {
    const organizers = await getAllOrganizers()

    return (
        <div className="space-y-rn-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="rn-h2">Organizers</h2>
                    <p className="rn-meta text-rn-text-muted">Manage course organizers</p>
                </div>
                <Button asChild>
                    <Link href="/admin/organizers/new">Create Organizer</Link>
                </Button>
            </div>

            <div className="grid gap-rn-4 md:grid-cols-2 lg:grid-cols-3">
                {organizers.map((org) => (
                    <Card key={org.id}>
                        <CardHeader>
                            <CardTitle>{org.name}</CardTitle>
                            <CardDescription>
                                {org.city && `${org.city}, `}{org.country}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="text-sm">
                                <span className="text-muted-foreground">Slug:</span> <code className="ml-1">{org.slug}</code>
                            </div>
                            <div className="text-sm">
                                <span className="text-muted-foreground">Periods:</span> {org._count.CoursePeriod}
                            </div>
                            {org.contactEmail && (
                                <div className="text-sm">
                                    <span className="text-muted-foreground">Contact:</span> {org.contactEmail}
                                </div>
                            )}
                            {org.stripeConnectAccountId && (
                                <div className="text-sm">
                                    <span className="text-muted-foreground">Stripe:</span>{' '}
                                    {org.platformFeePercent !== null ? (
                                        <span className="text-green-600 font-medium">Custom fees</span>
                                    ) : (
                                        <span className="text-muted-foreground">Default fees</span>
                                    )}
                                </div>
                            )}
                            <div className="flex gap-2 pt-2">
                                <Button asChild variant="outline" size="sm">
                                    <Link href={`/admin/organizers/${org.id}/edit`}>Edit</Link>
                                </Button>
                                <Button asChild variant="outline" size="sm">
                                    <Link href={`/admin/organizers/${org.id}/fees`}>Fees</Link>
                                </Button>
                                <Button asChild variant="ghost" size="sm">
                                    <Link href={`/org/${org.slug}`} target="_blank">View</Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {organizers.length === 0 && (
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        No organizers yet. Create your first one to get started.
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
