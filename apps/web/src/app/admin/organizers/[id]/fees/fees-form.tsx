'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { updateOrganizerFees } from '@/app/actions/organizers'
import { AlertCircle, Check } from 'lucide-react'
import { Switch } from '@/components/ui/switch'

interface OrganizerFeesFormProps {
  organizerId: string
  currentFeePercent: number | null
  currentFeeFixed: number | null
  globalFeePercent: number
  globalFeeFixed: number
}

export function OrganizerFeesForm({ 
  organizerId, 
  currentFeePercent, 
  currentFeeFixed,
  globalFeePercent,
  globalFeeFixed
}: OrganizerFeesFormProps) {
  const [useCustomFees, setUseCustomFees] = useState(
    currentFeePercent !== null || currentFeeFixed !== null
  )
  const [feePercent, setFeePercent] = useState(
    currentFeePercent !== null ? currentFeePercent.toString() : globalFeePercent.toString()
  )
  const [feeFixed, setFeeFixed] = useState(
    currentFeeFixed !== null ? (currentFeeFixed / 100).toString() : (globalFeeFixed / 100).toString()
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const result = await updateOrganizerFees({
        organizerId,
        platformFeePercent: useCustomFees ? parseFloat(feePercent) : null,
        platformFeeFixed: useCustomFees ? Math.round(parseFloat(feeFixed) * 100) : null,
      })

      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update fees')
    } finally {
      setLoading(false)
    }
  }

  const exampleOrder = 1000
  const calculatedPercent = parseFloat(feePercent) || 0
  const calculatedFixed = parseFloat(feeFixed) || 0
  const exampleFee = (exampleOrder * calculatedPercent / 100) + calculatedFixed

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="useCustomFees">Use Custom Fees</Label>
          <div className="text-sm text-muted-foreground">
            Override global platform fees for this organizer
          </div>
        </div>
        <Switch
          id="useCustomFees"
          checked={useCustomFees}
          onCheckedChange={(checked) => {
            setUseCustomFees(checked)
            if (!checked) {
              setFeePercent(globalFeePercent.toString())
              setFeeFixed((globalFeeFixed / 100).toString())
            }
          }}
        />
      </div>

      {useCustomFees && (
        <>
          <div className="space-y-2">
            <Label htmlFor="feePercent">Percentage Fee (%)</Label>
            <Input
              id="feePercent"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={feePercent}
              onChange={(e) => setFeePercent(e.target.value)}
              placeholder="0.00"
              required
            />
            <p className="text-xs text-muted-foreground">
              Platform commission as percentage of transaction amount
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feeFixed">Fixed Fee (NOK)</Label>
            <Input
              id="feeFixed"
              type="number"
              step="0.01"
              min="0"
              value={feeFixed}
              onChange={(e) => setFeeFixed(e.target.value)}
              placeholder="0.00"
              required
            />
            <p className="text-xs text-muted-foreground">
              Fixed fee per transaction in NOK
            </p>
          </div>

          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="text-sm font-medium">Example Calculation</div>
            <div className="text-sm text-muted-foreground">
              For a {exampleOrder} NOK order:
            </div>
            <div className="text-sm">
              • Percentage: {calculatedPercent}% = {(exampleOrder * calculatedPercent / 100).toFixed(2)} NOK
            </div>
            <div className="text-sm">
              • Fixed: {calculatedFixed.toFixed(2)} NOK
            </div>
            <div className="text-sm font-medium pt-2 border-t">
              Total Platform Fee: {exampleFee.toFixed(2)} NOK
            </div>
            <div className="text-sm text-muted-foreground">
              Organizer receives: {(exampleOrder - exampleFee).toFixed(2)} NOK
            </div>
          </div>
        </>
      )}

      {!useCustomFees && (
        <Alert>
          <AlertDescription>
            This organizer will use the global platform fees: <strong>{globalFeePercent}%</strong> + <strong>{(globalFeeFixed / 100).toFixed(2)} NOK</strong>
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 text-green-900 border-green-200">
          <Check className="h-4 w-4" />
          <AlertDescription>Fees updated successfully!</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Save Fees'}
      </Button>
    </form>
  )
}
