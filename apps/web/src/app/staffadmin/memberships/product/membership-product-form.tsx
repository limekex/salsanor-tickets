'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { updateMembershipProduct } from '@/app/actions/memberships'
import Link from 'next/link'
import { Layers } from 'lucide-react'

interface MembershipProductFormProps {
  organizer: {
    id: string
    name: string
    slug: string
    membershipEnabled: boolean
    membershipSalesOpen: boolean
    membershipDescription: string | null
  }
}

export function MembershipProductForm({ organizer }: MembershipProductFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [enabled, setEnabled] = useState(organizer.membershipEnabled)
  const [salesOpen, setSalesOpen] = useState(organizer.membershipSalesOpen)
  const [description, setDescription] = useState(organizer.membershipDescription || '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await updateMembershipProduct({
        enabled,
        salesOpen,
        description: description || null,
      })

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Product Configuration</CardTitle>
          <CardDescription>
            Enable membership sales and configure the product description. Pricing and benefits are configured per tier.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="enabled">Enable Membership Product</Label>
              <p className="text-sm text-muted-foreground">
                Allow users to purchase memberships on your organization page
              </p>
            </div>
            <Switch
              id="enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          {enabled && (
            <>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="salesOpen">Sales Open</Label>
                  <p className="text-sm text-muted-foreground">
                    Control whether new membership purchases are currently allowed
                  </p>
                </div>
                <Switch
                  id="salesOpen"
                  checked={salesOpen}
                  onCheckedChange={setSalesOpen}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Product Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the membership program..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  This description will be shown on the public membership page
                </p>
              </div>

              <div className="rounded-lg border p-4 bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Membership Tiers</p>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Pricing, benefits, and discounts are configured per membership tier
                </p>
                <Button type="button" variant="outline" size="sm" asChild>
                  <Link href="/staffadmin/memberships/tiers">
                    <Layers className="h-4 w-4 mr-2" />
                    Manage Tiers
                  </Link>
                </Button>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Settings'}
            </Button>
            {enabled && (
              <Button type="button" variant="outline" asChild>
                <Link href={`/org/${organizer.slug}/membership`}>
                  Preview Public Page
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
