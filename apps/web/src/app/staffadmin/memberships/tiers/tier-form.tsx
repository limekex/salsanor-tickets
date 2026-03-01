'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Palette } from 'lucide-react'
import { createMembershipTier, updateMembershipTier } from '@/app/actions/membership-tiers'

// Preset colors for tier accent
const PRESET_COLORS = [
  { name: 'Slate', hex: '#475569' },
  { name: 'Blue', hex: '#2563eb' },
  { name: 'Green', hex: '#16a34a' },
  { name: 'Purple', hex: '#9333ea' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Red', hex: '#dc2626' },
  { name: 'Teal', hex: '#0d9488' },
  { name: 'Pink', hex: '#db2777' },
  { name: 'Indigo', hex: '#4f46e5' },
  { name: 'Orange', hex: '#ea580c' },
]

/**
 * Calculate relative luminance and return appropriate text color
 * Returns white for dark backgrounds, black for light backgrounds
 */
function getContrastTextColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  
  return luminance > 0.5 ? '#000000' : '#ffffff'
}

interface TierFormProps {
  tier?: {
    id: string
    name: string
    slug: string
    description: string | null
    priceCents: number
    benefits: string[]
    discountPercent: number
    priority: number
    enabled: boolean
    validationRequired: boolean
    mvaEnabled: boolean
    accentColor: string | null
    organizerVatRegistered?: boolean
  }
  organizerVatRegistered?: boolean
}

export function TierForm({ tier, organizerVatRegistered = true }: TierFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isVatRegistered = organizerVatRegistered || tier?.organizerVatRegistered || false

  const [name, setName] = useState(tier?.name || '')
  const [slug, setSlug] = useState(tier?.slug || '')
  const [description, setDescription] = useState(tier?.description || '')
  const [price, setPrice] = useState(tier ? (tier.priceCents / 100).toString() : '0')
  const [priority, setPriority] = useState(tier?.priority?.toString() || '0')
  const [enabled, setEnabled] = useState(tier?.enabled ?? true)
  const [validationRequired, setValidationRequired] = useState(tier?.validationRequired ?? false)
  const [mvaEnabled, setMvaEnabled] = useState(tier?.mvaEnabled ?? true)
  const [accentColor, setAccentColor] = useState(tier?.accentColor || '#475569')
  const [benefits, setBenefits] = useState<string[]>(tier?.benefits || [])
  const [newBenefit, setNewBenefit] = useState('')

  // Calculate contrast text color for preview
  const textColor = getContrastTextColor(accentColor)

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    setName(value)
    if (!tier) { // Only auto-generate for new tiers
      const autoSlug = value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
      setSlug(autoSlug)
    }
  }

  const addBenefit = () => {
    if (newBenefit.trim()) {
      setBenefits([...benefits, newBenefit.trim()])
      setNewBenefit('')
    }
  }

  const removeBenefit = (index: number) => {
    setBenefits(benefits.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const data = {
        name,
        slug,
        description: description || undefined,
        priceCents: Math.round(parseFloat(price) * 100),
        benefits,
        discountPercent: 0, // Discounts are now configured via Discount Rules
        priority: parseInt(priority),
        enabled,
        validationRequired,
        mvaEnabled,
        accentColor: accentColor || undefined,
      }

      if (tier) {
        await updateMembershipTier(tier.id, data)
      } else {
        await createMembershipTier(data)
      }

      router.push('/staffadmin/memberships/tiers')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tier')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{tier ? 'Edit' : 'Create'} Membership Tier</CardTitle>
          <CardDescription>
            Configure pricing, benefits, and discount percentage for this membership level
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Tier Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., Normal, Supporting, Family"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g., normal, supporting"
                required
                pattern="[a-z0-9-]+"
              />
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, and hyphens only
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this membership level..."
              rows={2}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="price">Annual Price (NOK) *</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">
                  💡 <strong>Tip:</strong> You can set discounts for your membership tiers on the{' '}
                  <a href="/staffadmin/discounts" className="text-primary hover:underline font-medium">
                    Discount Rules page
                  </a>
                  . This allows for more flexible pricing strategies.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Display Priority</Label>
              <Input
                id="priority"
                type="number"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Lower numbers appear first
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Benefits</Label>
            {benefits.length > 0 && (
              <div className="space-y-2">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Badge variant="secondary" className="flex-1 justify-between py-2">
                      <span>{benefit}</span>
                      <button
                        type="button"
                        onClick={() => removeBenefit(index)}
                        className="ml-2 hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={newBenefit}
                onChange={(e) => setNewBenefit(e.target.value)}
                placeholder="Add a benefit..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addBenefit()
                  }
                }}
              />
              <Button type="button" onClick={addBenefit} variant="outline" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Tier Accent Color */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <Label>Choose Tier Accent Color</Label>
            </div>
            <p className="text-sm text-muted-foreground -mt-2">
              This color will be used for the membership card and wallet pass background
            </p>
            
            {/* Color preview card */}
            <div 
              className="rounded-lg p-4 transition-colors"
              style={{ backgroundColor: accentColor, color: textColor }}
            >
              <div className="text-xs opacity-80">PREVIEW</div>
              <div className="font-bold">{name || 'Tier Name'}</div>
              <div className="text-sm mt-1">Member Name</div>
            </div>
            
            {/* Preset colors */}
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color.hex}
                  type="button"
                  onClick={() => setAccentColor(color.hex)}
                  className={`w-10 h-10 rounded-full border-2 transition-all ${
                    accentColor === color.hex 
                      ? 'border-primary ring-2 ring-primary ring-offset-2' 
                      : 'border-transparent hover:border-muted-foreground/50'
                  }`}
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                />
              ))}
            </div>
            
            {/* Custom color input */}
            <div className="flex items-center gap-3">
              <Input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-12 h-10 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                placeholder="#475569"
                pattern="^#[0-9A-Fa-f]{6}$"
                className="w-28 font-mono"
              />
              <span className="text-sm text-muted-foreground">Custom color</span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="mvaEnabled">Calculate VAT/MVA</Label>
              <p className="text-sm text-muted-foreground">
                {isVatRegistered 
                  ? "When checked: VAT/MVA will be calculated and added to the price. When unchecked: Product is VAT-free" 
                  : "Organization must be VAT registered to charge MVA"}
              </p>
            </div>
            <Switch
              id="mvaEnabled"
              checked={mvaEnabled}
              onCheckedChange={setMvaEnabled}
              disabled={!isVatRegistered}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="validationRequired">Require Admin Approval</Label>
              <p className="text-sm text-muted-foreground">
                Members must be manually approved by org admin
              </p>
            </div>
            <Switch
              id="validationRequired"
              checked={validationRequired}
              onCheckedChange={setValidationRequired}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="enabled">Enable Tier</Label>
              <p className="text-sm text-muted-foreground">
                Allow new memberships at this level
              </p>
            </div>
            <Switch
              id="enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : tier ? 'Update Tier' : 'Create Tier'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
