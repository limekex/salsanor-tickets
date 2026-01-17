'use client'

import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { useCart } from '@/hooks/use-cart'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, ShoppingCart, Plus, Minus } from 'lucide-react'

interface RegisterButtonProps {
    event: {
        id: string
        title: string
        organizerId: string
        organizerName: string
        priceSingleCents: number
        memberPriceSingleCents: number | null
        maxCapacity: number | null
        currentRegistrations: number
    }
    isMember: boolean
    disabled?: boolean
    className?: string
}

export function RegisterButton({ event, isMember, disabled, className }: RegisterButtonProps) {
    const router = useRouter()
    const [quantity, setQuantity] = useState(1)
    const { addEventItem, getCartOrganizerId, getCartOrganizerName, items, isLoaded } = useCart()

    // Don't render until cart is loaded (client-side only)
    if (!isLoaded) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-20 bg-muted rounded-lg"></div>
                <div className="h-16 bg-muted rounded-lg"></div>
                <div className="h-12 bg-muted rounded-lg"></div>
            </div>
        )
    }

    const cartOrganizerId = getCartOrganizerId()
    const cartOrganizerName = getCartOrganizerName()
    const isDifferentOrganizer = cartOrganizerId && cartOrganizerId !== event.organizerId
    
    // Check if event is already in cart
    const existingCartItem = items.find(i => i.type === 'event' && i.eventId === event.id)
    const isInCart = !!existingCartItem

    // Calculate available capacity
    const availableCapacity = event.maxCapacity 
        ? event.maxCapacity - event.currentRegistrations
        : null

    // Calculate price per ticket
    const pricePerTicket = (isMember && event.memberPriceSingleCents) 
        ? event.memberPriceSingleCents 
        : event.priceSingleCents

    const handleAddToCart = () => {
        if (isDifferentOrganizer) {
            toast.error(`Your cart contains items from ${cartOrganizerName}. Please checkout first.`)
            return
        }

        if (availableCapacity !== null && quantity > availableCapacity) {
            toast.error(`Only ${availableCapacity} tickets available`)
            return
        }

        addEventItem({
            eventId: event.id,
            eventTitle: event.title,
            organizerId: event.organizerId,
            organizerName: event.organizerName,
            quantity,
            pricePerTicket
        })

        toast.success(`Added ${quantity} ticket${quantity !== 1 ? 's' : ''} to cart`)
        router.push('/cart')
    }

    const incrementQuantity = () => {
        if (availableCapacity !== null && quantity >= availableCapacity) {
            toast.error(`Only ${availableCapacity} tickets available`)
            return
        }
        setQuantity(q => q + 1)
    }

    const decrementQuantity = () => {
        setQuantity(q => Math.max(1, q - 1))
    }

    return (
        <div className="space-y-4">
            {isDifferentOrganizer && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Your cart contains items from <strong>{cartOrganizerName}</strong>. 
                        Please checkout before adding items from a different organizer.
                    </AlertDescription>
                </Alert>
            )}

            <div className="space-y-4">
                <div>
                    <Label className="text-sm text-muted-foreground">Number of tickets</Label>
                    <div className="flex items-center gap-2 mt-1">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={decrementQuantity}
                            disabled={quantity <= 1}
                            type="button"
                        >
                            <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                            type="number"
                            min="1"
                            max={availableCapacity || undefined}
                            value={quantity}
                            onChange={(e) => {
                                const val = parseInt(e.target.value) || 1
                                const maxVal = availableCapacity || Infinity
                                const clampedVal = Math.max(1, Math.min(val, maxVal))
                                setQuantity(clampedVal)
                                
                                if (val > maxVal) {
                                    toast.error(`Only ${availableCapacity} tickets available`)
                                }
                            }}
                            className="w-20 text-center"
                        />
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={incrementQuantity}
                            disabled={availableCapacity !== null && quantity >= availableCapacity}
                            type="button"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                    {availableCapacity !== null && availableCapacity <= 15 && (
                        <p className="text-xs text-amber-600 font-medium mt-1">
                            🔥 Only {availableCapacity} tickets left!
                        </p>
                    )}
                </div>

                <div>
                    <Label className="text-sm text-muted-foreground">Price per ticket</Label>
                    <div className="text-2xl font-bold mt-1">
                        {(pricePerTicket / 100).toFixed(0)},-
                    </div>
                    {isMember && event.memberPriceSingleCents && (
                        <div className="text-xs text-muted-foreground line-through">
                            {(event.priceSingleCents / 100).toFixed(0)},-
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <span className="font-medium">Total</span>
                <span className="text-2xl font-bold">
                    {((pricePerTicket * quantity) / 100).toFixed(0)},-
                </span>
            </div>

            <Button 
                className={className}
                size="lg"
                onClick={handleAddToCart}
                disabled={disabled || isDifferentOrganizer}
            >
                {isInCart ? (
                    <>
                        <ShoppingCart className="mr-2 h-5 w-5" />
                        Update Cart
                    </>
                ) : (
                    <>
                        <ShoppingCart className="mr-2 h-5 w-5" />
                        Add to Cart
                    </>
                )}
            </Button>
        </div>
    )
}
