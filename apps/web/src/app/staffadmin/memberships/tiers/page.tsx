import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Plus, Users } from 'lucide-react'
import { listMembershipTiers } from '@/app/actions/membership-tiers'

export default async function MembershipTiersPage() {
  const tiers = await listMembershipTiers()

  return (
    <div className="container mx-auto py-rn-8 space-y-rn-6 px-rn-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-rn-4">
        <div className="flex items-center gap-rn-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/staffadmin/memberships">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="rn-h1">Membership Tiers</h1>
            <p className="rn-meta text-rn-text-muted">Configure membership levels and benefits</p>
          </div>
        </div>
        <Button asChild>
          <Link href="/staffadmin/memberships/tiers/new">
            <Plus className="mr-2 h-4 w-4" />
            New Tier
          </Link>
        </Button>
      </div>

      <div className="grid gap-rn-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {tiers.map((tier) => (
          <Card key={tier.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{tier.name}</CardTitle>
                  {tier.description && (
                    <CardDescription className="mt-2">{tier.description}</CardDescription>
                  )}
                </div>
                {!tier.enabled && (
                  <Badge variant="outline">Disabled</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-medium">{(tier.priceCents / 100).toFixed(0)} NOK/year</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Members</span>
                  <span className="font-medium flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {tier.memberCount}
                  </span>
                </div>
              </div>

              {tier.benefits && tier.benefits.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Benefits:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {tier.benefits.map((benefit, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-2">
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/staffadmin/memberships/tiers/${tier.id}`}>
                    Edit Tier
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {tiers.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No membership tiers configured yet</p>
            <Button asChild>
              <Link href="/staffadmin/memberships/tiers/new">
                <Plus className="mr-2 h-4 w-4" />
                Create First Tier
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
