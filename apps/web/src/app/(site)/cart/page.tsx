
'use client'

import { useCart } from '@/hooks/use-cart'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import { getCartPricing, createOrderFromCart } from '@/app/actions/checkout'
import { checkDuplicateRegistrations } from '@/app/actions/registration-check'
import { PricingResult } from '@/lib/pricing/engine'
import { useRouter } from 'next/navigation'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

export default function CartPage() {
    const { items, removeItem, clearCart, isLoaded } = useCart()
    const [pricing, setPricing] = useState<PricingResult | null>(null)
    const [loading, setLoading] = useState(false)
    const [checkoutPending, startCheckout] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const [duplicates, setDuplicates] = useState<{ id: string; track: { id: string; title: string } }[]>([])
    const router = useRouter()

    useEffect(() => {
        if (!isLoaded) return
        if (items.length === 0) {
            setPricing(null)
            return
        }

        // Fetch pricing
        setLoading(true)

        Promise.all([
            getCartPricing(items),
            checkDuplicateRegistrations(items.map(i => i.trackId))
        ])
            .then(([pricingRes, duplicatesRes]) => {
                setPricing(pricingRes)
                setDuplicates(duplicatesRes)
            })
            .catch(err => {
                console.error(err)
                setError('Failed to calculate pricing')
            })
            .finally(() => setLoading(false))

    }, [items, isLoaded])

    async function handleCheckout() {
        setError(null)
        startCheckout(async () => {
            const result = await createOrderFromCart(items)
            if (result?.error) {
                setError(result.error)
                // @ts-ignore - redirectToOnboarding might exist on result
                if (result?.redirectToOnboarding) {
                    router.push('/onboarding')
                }
            } else if (result?.orderId) {
                clearCart() // Success!
                // Redirect directly to payment instead of profile
                router.push(`/checkout/${result.orderId}`)
            }
        })
    }

    if (!isLoaded) return <div className="container mx-auto p-8">Loading cart...</div>

    if (items.length === 0) {
        return (
            <div className="container mx-auto max-w-2xl py-12 text-center space-y-4">
                <h1 className="text-2xl font-bold">Your Cart is Empty</h1>
                <p className="text-muted-foreground">Looks like you haven't added any courses yet.</p>
                <Button asChild>
                    <Link href="/courses">Browse Courses</Link>
                </Button>
            </div>
        )
    }

    return (
        <main className="container mx-auto max-w-4xl py-rn-8 px-rn-4">
            <div className="grid gap-rn-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-4">
                <h1 className="text-2xl font-bold">Shopping Cart</h1>

                {items.map(item => (
                    <Card key={item.trackId}>
                        <CardContent className="p-4 flex justify-between items-start">
                            <div>
                                <h3 className="font-semibold">{item.trackTitle}</h3>
                                <p className="text-sm text-muted-foreground">
                                    Role: {item.role}
                                    {item.hasPartner && ` (+ Partner)`}
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                {/* Use pricing line item if available for accurate price display */}
                                <div className="font-mono">
                                    {pricing ? (
                                        (() => {
                                            const line = pricing.lineItems.find(l => l.trackId === item.trackId)
                                            if (!line) return '-'
                                            return (
                                                <div className="text-right">
                                                    {line.discountCents > 0 && (
                                                        <span className="line-through text-xs text-muted-foreground block">
                                                            {(line.basePriceCents / 100).toFixed(0)},-
                                                        </span>
                                                    )}
                                                    <span>{(line.finalPriceCents / 100).toFixed(0)},-</span>
                                                </div>
                                            )
                                        })()
                                    ) : (
                                        <span>...</span>
                                    )}
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => removeItem(item.trackId)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {duplicates.length > 0 && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Already Registered</AlertTitle>
                        <AlertDescription>
                            You are already registered for: <strong>{duplicates.map(d => d.track.title).join(', ')}</strong>.
                            Please remove {duplicates.length === 1 ? 'this course' : 'these courses'} from your cart.
                        </AlertDescription>
                    </Alert>
                )}

                <Button variant="link" asChild className="pl-0">
                    <Link href="/courses">← Add more courses</Link>
                </Button>
            </div>

            <div className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Order Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>{pricing ? (pricing.subtotalCents / 100).toFixed(0) : '...'},-</span>
                        </div>

                        {pricing?.appliedRules.map(rule => (
                            <div key={rule.ruleId} className="flex justify-between text-sm text-green-600">
                                <span>{rule.name}</span>
                                <span>-{(rule.amountCents / 100).toFixed(0)},-</span>
                            </div>
                        ))}

                        <Separator />

                        <div className="flex justify-between font-bold text-lg">
                            <span>Total</span>
                            <span>{pricing ? (pricing.finalTotalCents / 100).toFixed(0) : '...'},-</span>
                        </div>

                        {error && (
                            <div className="text-destructive text-sm bg-destructive/10 p-2 rounded">
                                {error}
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" size="lg" onClick={handleCheckout} disabled={loading || checkoutPending || !pricing || duplicates.length > 0}>
                            {checkoutPending ? 'Processing...' : 'Proceed to Checkout'}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
        </main>
    )
}
