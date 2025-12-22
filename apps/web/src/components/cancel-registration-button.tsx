'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { toast } from 'sonner'
import { cancelRegistration } from '@/app/actions/cancel-registration'

interface CancelRegistrationButtonProps {
  registrationId: string
  participantName: string
  courseName: string
}

export function CancelRegistrationButton({
  registrationId,
  participantName,
  courseName,
}: CancelRegistrationButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [refundType, setRefundType] = useState<'none' | 'partial' | 'full'>('full')
  const [refundPercentage, setRefundPercentage] = useState(100)
  const [reason, setReason] = useState('')

  const handleCancel = async () => {
    setIsLoading(true)
    try {
      const percentage = refundType === 'none' ? 0 : refundType === 'full' ? 100 : refundPercentage

      const result = await cancelRegistration({
        registrationId,
        refundPercentage: percentage,
        reason: reason || undefined,
      })

      toast.success('Registration cancelled', {
        description: result.refundMessage,
      })

      setIsOpen(false)
      
      // Refresh the page to show updated status
      window.location.reload()
    } catch (error) {
      console.error('Failed to cancel registration:', error)
      toast.error('Failed to cancel registration', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
      >
        <X className="h-4 w-4 mr-1" />
        Cancel
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="rn-h3">Cancel Registration</DialogTitle>
            <DialogDescription className="rn-meta text-rn-text-muted">
              Cancel registration for <strong>{participantName}</strong> in{' '}
              <strong>{courseName}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-rn-4 py-rn-4">
            <div className="space-y-rn-3">
              <Label>Refund Option</Label>
              <RadioGroup value={refundType} onValueChange={(value) => setRefundType(value as any)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="full" id="full" />
                  <Label htmlFor="full" className="font-normal cursor-pointer">
                    Full refund (100%)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="partial" id="partial" />
                  <Label htmlFor="partial" className="font-normal cursor-pointer">
                    Partial refund
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="none" />
                  <Label htmlFor="none" className="font-normal cursor-pointer">
                    No refund (0%)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {refundType === 'partial' && (
              <div className="space-y-rn-2">
                <Label htmlFor="percentage">Refund Percentage</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="percentage"
                    type="number"
                    min="0"
                    max="100"
                    value={refundPercentage}
                    onChange={(e) => setRefundPercentage(Number(e.target.value))}
                    className="w-24"
                  />
                  <span className="rn-meta text-rn-text-muted">%</span>
                </div>
              </div>
            )}

            <div className="space-y-rn-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Internal note about why this registration was cancelled..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
              Close
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={isLoading}
            >
              {isLoading ? 'Cancelling...' : 'Cancel Registration'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
