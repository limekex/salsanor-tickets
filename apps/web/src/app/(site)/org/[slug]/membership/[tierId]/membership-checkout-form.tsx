'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { createMembershipOrder } from '@/app/actions/memberships'
import { createClient } from '@/utils/supabase/client'
import { PhotoCapture } from '@/components/photo-capture'

interface MembershipCheckoutFormProps {
  organizerSlug: string
  organizerName: string
  tier: {
    id: string
    name: string
    slug: string
    description: string | null
    priceCents: number
    benefits: string[]
    discountPercent: number
    validationRequired: boolean
  }
}

export function MembershipCheckoutForm({ organizerSlug, organizerName, tier }: MembershipCheckoutFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    firstName: '',
    lastName: '',
    photoDataUrl: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Check if user is logged in
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // Redirect to login with return URL
        router.push(`/auth/login?redirect=/org/${organizerSlug}/membership/${tier.id}`)
        return
      }

      const result = await createMembershipOrder({
        tierId: tier.id,
        ...formData,
      })

      if (result.error) {
        setError(result.error)
        return
      }

      if (result.orderId) {
        // For memberships requiring approval, redirect to pending page
        if (result.requiresApproval) {
          router.push(`/org/${organizerSlug}/membership/pending?orderId=${result.orderId}`)
        }
        // For free memberships without approval, redirect to success page
        else if (result.skipPayment) {
          router.push(`/success?orderId=${result.orderId}`)
        } else {
          // Redirect to payment
          router.push(`/checkout/${result.orderId}`)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order')
    } finally {
      setLoading(false)
    }
  }

  const priceWithMva = tier.priceCents * 1.25 // Assuming 25% MVA

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Purchase {tier.name} Membership</CardTitle>
          <CardDescription>
            {organizerName} • Annual Membership
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Validation Required Notice */}
          {tier.validationRequired && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Manual Approval Required</strong>
                <p className="mt-1 text-sm">
                  This membership tier requires admin approval. You will receive confirmation via email once your application has been reviewed.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Tier Details */}
          <div className="space-y-4">
            {tier.description && (
              <p className="text-sm text-muted-foreground">{tier.description}</p>
            )}

            {tier.benefits.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Included Benefits:</div>
                <ul className="space-y-2">
                  {tier.benefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {tier.discountPercent > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {tier.discountPercent}% discount on courses
                </Badge>
              </div>
            )}
          </div>

          <Separator />

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="font-medium">Contact Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            {/* Photo Capture */}
            <PhotoCapture
              onPhotoCapture={(photoDataUrl) => setFormData({ ...formData, photoDataUrl })}
              currentPhoto={formData.photoDataUrl}
            />
          </div>

          <Separator />

          {/* Price Summary */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Membership ({tier.name})</span>
              <span>
                {(tier.priceCents / 100).toLocaleString('nb-NO', {
                  style: 'currency',
                  currency: 'NOK',
                })}
              </span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>MVA (25%)</span>
              <span>
                {((priceWithMva - tier.priceCents) / 100).toLocaleString('nb-NO', {
                  style: 'currency',
                  currency: 'NOK',
                })}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span>
                {(priceWithMva / 100).toLocaleString('nb-NO', {
                  style: 'currency',
                  currency: 'NOK',
                })}
              </span>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Processing...' : tier.priceCents === 0 ? 'Complete Registration' : 'Continue to Payment'}
          </Button>
        </CardContent>
      </Card>
    </form>
  )
}
