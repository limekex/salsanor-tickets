import { getPublicMembershipTiers } from '@/app/actions/membership-tiers'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { CheckCircle2, ArrowLeft } from 'lucide-react'

type Params = Promise<{ slug: string }>

export default async function MembershipPage({ params }: { params: Params }) {
  const { slug } = await params
  const data = await getPublicMembershipTiers(slug)

  if (!data) {
    return notFound()
  }

  const { organizer, tiers } = data

  if (!organizer.membershipEnabled) {
    return (
      <div className="container mx-auto py-10 max-w-4xl">
        <Link href={`/org/${slug}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {organizer.name}
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Membership Not Available</CardTitle>
            <CardDescription>
              {organizer.name} does not currently offer memberships.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!organizer.membershipSalesOpen) {
    return (
      <div className="container mx-auto py-10 max-w-4xl">
        <Link href={`/org/${slug}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {organizer.name}
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Membership Sales Closed</CardTitle>
            <CardDescription>
              {organizer.name} is not currently accepting new memberships. Please check back later.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10 max-w-6xl">
      <Link href={`/org/${slug}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to {organizer.name}
      </Link>

      <div className="space-y-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">{organizer.name} Membership</h1>
          {organizer.membershipDescription && (
            <p className="text-muted-foreground mt-2 text-lg">
              {organizer.membershipDescription}
            </p>
          )}
        </div>
      </div>

      {tiers.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Membership Tiers Available</CardTitle>
            <CardDescription>
              There are currently no membership options to choose from.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tiers.map((tier: any) => (
            <Card key={tier.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{tier.name}</CardTitle>
                    {tier.description && (
                      <CardDescription className="mt-2">{tier.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    {tier.discountPercent > 0 && (
                      <Badge variant="secondary">
                        {tier.discountPercent}% off
                      </Badge>
                    )}
                    {tier.validationRequired && (
                      <Badge variant="outline" className="text-xs">
                        Approval Required
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-3xl font-bold">
                    {(tier.priceCents / 100).toLocaleString('nb-NO', {
                      style: 'currency',
                      currency: 'NOK',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </div>
                  <div className="text-sm text-muted-foreground">per year</div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                {tier.benefits.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Benefits:</div>
                    <ul className="space-y-2">
                      {tier.benefits.map((benefit: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <Button className="w-full" asChild>
                  <Link href={`/org/${slug}/membership/${tier.id}`}>
                    Select {tier.name}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
