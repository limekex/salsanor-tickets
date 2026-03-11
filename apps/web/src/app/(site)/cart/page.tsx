
'use client'

import { useCart } from '@/hooks/use-cart'
import { useUser } from '@/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Trash2, AlertCircle, ShoppingCart, Plus, Minus } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import { getCartPricing, createOrderFromCart, createEventOrderFromCart } from '@/app/actions/checkout'
import { checkDuplicateRegistrations } from '@/app/actions/registration-check'
import { login, signup } from '@/app/actions/auth'
import { PricingResult } from '@/lib/pricing/engine'
import { useRouter } from 'next/navigation'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatPrice, formatWeekday, formatDateShort } from '@/lib/formatters'

// Helper to get slot time range string for given slot indices
function getSlotTimesForIndices(
    slotIndices: number[], 
    slotDetails?: { slotIndex: number; startTime: string; endTime: string }[]
): string {
    if (!slotDetails || slotDetails.length === 0 || slotIndices.length === 0) return ''
    const times = slotIndices
        .map(idx => slotDetails.find(s => s.slotIndex === idx))
        .filter(Boolean)
        .sort((a, b) => a!.slotIndex - b!.slotIndex)
        .map(s => `${s!.startTime}–${s!.endTime}`)
    return times.join(' and ')
}

// Helper to group selectedSlotWeeks by week and return per-week breakdown
function getPerWeekBreakdown(
    selectedSlotWeeks: { slotIndex: number; weekIndex: number }[],
    slotDetails?: { slotIndex: number; startTime: string; endTime: string }[],
    weekDetails?: { weekIndex: number; weekStart: string }[]
): { weekIndex: number; weekLabel: string; slotTimes: string }[] {
    if (!selectedSlotWeeks || selectedSlotWeeks.length === 0) return []
    
    // Group by week
    const byWeek = new Map<number, number[]>()
    for (const sw of selectedSlotWeeks) {
        const slots = byWeek.get(sw.weekIndex) || []
        slots.push(sw.slotIndex)
        byWeek.set(sw.weekIndex, slots)
    }
    
    // Convert to array with labels
    const result: { weekIndex: number; weekLabel: string; slotTimes: string }[] = []
    const sortedWeeks = [...byWeek.keys()].sort((a, b) => a - b)
    
    for (const weekIdx of sortedWeeks) {
        const slotIndices = byWeek.get(weekIdx) || []
        const weekInfo = weekDetails?.find(w => w.weekIndex === weekIdx)
        const weekLabel = weekInfo 
            ? formatDateShort(new Date(weekInfo.weekStart))
            : `Week ${weekIdx + 1}`
        const slotTimes = getSlotTimesForIndices(slotIndices, slotDetails)
        result.push({ weekIndex: weekIdx, weekLabel, slotTimes })
    }
    
    return result
}

export default function CartPage() {
    const { items, removeItem, updateEventQuantity, clearCart, isLoaded, getCartOrganizerId, getCartOrganizerName } = useCart()
    const { user, isLoading: userLoading } = useUser()
    const [pricing, setPricing] = useState<PricingResult | null>(null)
    const [loading, setLoading] = useState(false)
    const [checkoutPending, startCheckout] = useTransition()
    const [authPending, startAuth] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const [authError, setAuthError] = useState<string | null>(null)
    const [authMessage, setAuthMessage] = useState<string | null>(null)
    const [duplicates, setDuplicates] = useState<{ id: string; CourseTrack: { id: string; title: string } }[]>([])
    const router = useRouter()
    
    const cartOrganizerId = getCartOrganizerId()
    const cartOrganizerName = getCartOrganizerName()

    useEffect(() => {
        if (!isLoaded) return
        if (items.length === 0) {
            setPricing(null)
            return
        }

        // Fetch pricing
        setLoading(true)

        Promise.all([
            getCartPricing(items.filter(i => i.type === 'course')),
            checkDuplicateRegistrations(items.filter(i => i.type === 'course').map(i => i.trackId))
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
    
    // Don't render cart UI until loaded
    if (!isLoaded) {
        return (
            <div className="container mx-auto max-w-2xl py-12 text-center">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-muted rounded w-48 mx-auto"></div>
                    <div className="h-64 bg-muted rounded"></div>
                </div>
            </div>
        )
    }

    async function handleCheckout() {
        setError(null)
        startCheckout(async () => {
            const courseItems = items.filter(i => i.type === 'course')
            const eventItems = items.filter(i => i.type === 'event')
            
            // For now, we'll create orders separately if both exist
            // In the future, we might want to support mixed orders
            if (courseItems.length > 0 && eventItems.length > 0) {
                setError('Please checkout courses and events separately for now')
                return
            }
            
            if (courseItems.length > 0) {
                const result = await createOrderFromCart(courseItems)
                if (result?.error) {
                    setError(result.error)
                    // @ts-ignore - redirectToOnboarding might exist on result
                    if (result?.redirectToOnboarding) {
                        router.push('/onboarding')
                    }
                } else if (result?.orderId) {
                    router.push(`/checkout/${result.orderId}`)
                }
            } else if (eventItems.length > 0) {
                const result = await createEventOrderFromCart(
                    eventItems.map(item => ({
                        eventId: item.eventId,
                        quantity: item.quantity
                    }))
                )
                if (result?.error) {
                    setError(result.error)
                    // @ts-ignore - redirectToOnboarding might exist on result
                    if (result?.redirectToOnboarding) {
                        router.push('/onboarding')
                    }
                } else if (result?.orderId) {
                    router.push(`/checkout/${result.orderId}`)
                }
            }
        })
    }

    async function handleLogin(formData: FormData) {
        setAuthError(null)
        setAuthMessage(null)
        startAuth(async () => {
            const result = await login(null, formData)
            if (result?.error) {
                setAuthError(result.error)
            }
        })
    }

    async function handleSignup(formData: FormData) {
        setAuthError(null)
        setAuthMessage(null)
        startAuth(async () => {
            const result = await signup(null, formData)
            if (result?.error) {
                setAuthError(result.error)
            } else if (result?.message) {
                setAuthMessage(result.message)
            }
        })
    }

    // Show loading state during checkout
    if (checkoutPending) {
        return (
            <div className="container mx-auto max-w-2xl py-12 text-center space-y-4">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    <h1 className="text-2xl font-bold">Processing your order...</h1>
                    <p className="text-muted-foreground">Please wait while we prepare your checkout.</p>
                </div>
            </div>
        )
    }

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
                
                {cartOrganizerName && (
                    <Alert>
                        <ShoppingCart className="h-4 w-4" />
                        <AlertTitle>Organizer</AlertTitle>
                        <AlertDescription>
                            All items in your cart are from <strong>{cartOrganizerName}</strong>
                        </AlertDescription>
                    </Alert>
                )}

                {items.map(item => {
                    if (item.type === 'course') {
                        const isDifferentOrganizer = item.organizerId && cartOrganizerId && item.organizerId !== cartOrganizerId
                        const isDuplicate = duplicates.some(d => d.id === item.trackId)
                        
                        return (
                            <Card key={item.trackId} className={isDifferentOrganizer || isDuplicate ? 'border-destructive' : ''}>
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="font-semibold">{item.trackTitle}</h3>
                                            {item.role && (
                                                <p className="text-sm text-muted-foreground">
                                                    Role: {item.role}
                                                    {item.hasPartner && ` (+ Partner)`}
                                                </p>
                                            )}
                                            {/* PRIVATE template: Per-week slot breakdown */}
                                            {item.selectedSlotWeeks && item.selectedSlotWeeks.length > 0 && (
                                                <div className="text-sm text-muted-foreground space-y-1 mt-1">
                                                    {/* Weekday header */}
                                                    {item.weekday !== undefined && (
                                                        <p className="font-medium capitalize">{formatWeekday(item.weekday)}s</p>
                                                    )}
                                                    {/* Per-week breakdown */}
                                                    <div className="text-xs space-y-0.5 pl-2 border-l-2 border-muted">
                                                        {getPerWeekBreakdown(item.selectedSlotWeeks, item.slotDetails, item.weekDetails).map(week => (
                                                            <p key={week.weekIndex}>
                                                                <span className="text-muted-foreground">{week.weekLabel}:</span>{' '}
                                                                <span>{week.slotTimes}</span>
                                                            </p>
                                                        ))}
                                                    </div>
                                                    {/* Total sessions */}
                                                    <p className="text-xs font-medium mt-1">
                                                        {item.selectedSlotWeeks.length} session{item.selectedSlotWeeks.length > 1 ? 's' : ''} total
                                                    </p>
                                                </div>
                                            )}
                                            {/* Legacy display for old cart items without selectedSlotWeeks */}
                                            {!item.selectedSlotWeeks && item.selectedSlots && item.selectedSlots.length > 0 && (
                                                <div className="text-sm text-muted-foreground">
                                                    <p>{item.selectedSlots.length} slot{item.selectedSlots.length > 1 ? 's' : ''} selected</p>
                                                </div>
                                            )}
                                            {item.organizerName && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {item.organizerName}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="font-mono">
                                                {pricing ? (
                                                    (() => {
                                                        const line = pricing.lineItems.find(l => l.trackId === item.trackId)
                                                        if (!line) return '-'
                                                        return (
                                                            <div className="text-right">
                                                                {line.discountCents > 0 && (
                                                                    <span className="line-through text-xs text-muted-foreground block">
                                                                        {formatPrice(line.basePriceCents)}
                                                                    </span>
                                                                )}
                                                                <span>{formatPrice(line.finalPriceCents)}</span>
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
                                    </div>
                                    
                                    {isDifferentOrganizer && (
                                        <Alert variant="destructive" className="mt-2">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription className="text-xs">
                                                This course is from a different organizer (<strong>{item.organizerName}</strong>). 
                                                You can only checkout items from one organizer at a time. Please remove this item.
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </CardContent>
                            </Card>
                        )
                    } else {
                        // Event item
                        const isDifferentOrganizer = item.organizerId && cartOrganizerId && item.organizerId !== cartOrganizerId
                        const totalPrice = item.pricePerTicket * item.quantity
                        
                        return (
                            <Card key={item.eventId} className={isDifferentOrganizer ? 'border-destructive' : ''}>
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1">
                                            <h3 className="font-semibold">{item.eventTitle}</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Event Registration
                                            </p>
                                            {item.organizerName && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {item.organizerName}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-2 mt-2">
                                                <Label className="text-xs text-muted-foreground">Tickets:</Label>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        onClick={() => updateEventQuantity(item.eventId, item.quantity - 1)}
                                                    >
                                                        <Minus className="h-3 w-3" />
                                                    </Button>
                                                    <span className="w-8 text-center text-sm">{item.quantity}</span>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        onClick={() => updateEventQuantity(item.eventId, item.quantity + 1)}
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                                <span className="text-xs text-muted-foreground">
                                                    @ {formatPrice(item.pricePerTicket)} each
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="font-mono text-right">
                                                <span>{formatPrice(totalPrice)}</span>
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => removeItem(item.eventId)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    {isDifferentOrganizer && (
                                        <Alert variant="destructive" className="mt-2">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription className="text-xs">
                                                This event is from a different organizer (<strong>{item.organizerName}</strong>). 
                                                You can only checkout items from one organizer at a time. Please remove this item.
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </CardContent>
                            </Card>
                        )
                    }
                })}

                {duplicates.length > 0 && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Already Registered</AlertTitle>
                        <AlertDescription>
                            You are already registered for: <strong>{duplicates.map(d => d.CourseTrack.title).join(', ')}</strong>.
                            Please remove {duplicates.length === 1 ? 'this course' : 'these courses'} from your cart.
                        </AlertDescription>
                    </Alert>
                )}

                <div className="flex gap-2">
                    <Button variant="link" asChild className="pl-0">
                        <Link href="/courses">← Add more courses</Link>
                    </Button>
                    <Button variant="link" asChild>
                        <Link href="/events">Add events</Link>
                    </Button>
                </div>
            </div>

            <div className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Order Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>
                                {(() => {
                                    const courseTotal = pricing ? pricing.subtotalCents : 0
                                    const eventTotal = items
                                        .filter(i => i.type === 'event')
                                        .reduce((sum, item) => sum + (item.pricePerTicket * item.quantity), 0)
                                    return formatPrice(courseTotal + eventTotal, { showZeroAsAmount: true })
                                })()}
                            </span>
                        </div>

                        {pricing?.appliedRules.map(rule => (
                            <div key={rule.ruleId} className="flex justify-between text-sm text-green-600">
                                <span>{rule.name}</span>
                                <span>-{formatPrice(rule.amountCents)}</span>
                            </div>
                        ))}

                        <Separator />

                        <div className="flex justify-between font-bold text-lg">
                            <span>Total</span>
                            <span>
                                {(() => {
                                    const courseTotal = pricing ? pricing.finalTotalCents : 0
                                    const eventTotal = items
                                        .filter(i => i.type === 'event')
                                        .reduce((sum, item) => sum + (item.pricePerTicket * item.quantity), 0)
                                    return formatPrice(courseTotal + eventTotal, { showZeroAsAmount: true })
                                })()}
                            </span>
                        </div>

                        {error && (
                            <div className="text-destructive text-sm bg-destructive/10 p-2 rounded">
                                {error}
                            </div>
                        )}
                    </CardContent>
                    
                    {/* Show auth form if not logged in, otherwise show checkout button */}
                    {userLoading ? (
                        <CardFooter>
                            <div className="w-full h-10 bg-muted animate-pulse rounded" />
                        </CardFooter>
                    ) : !user ? (
                        <CardContent className="pt-0">
                            <Separator className="mb-4" />
                            <Tabs defaultValue="login" className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="login">Login</TabsTrigger>
                                    <TabsTrigger value="signup">Sign Up</TabsTrigger>
                                </TabsList>

                                <TabsContent value="login" className="mt-4">
                                    <form action={handleLogin} className="space-y-3">
                                        <input type="hidden" name="redirectTo" value="/cart" />
                                        <div className="space-y-1">
                                            <Label htmlFor="cart-login-email" className="text-sm">Email</Label>
                                            <Input 
                                                id="cart-login-email" 
                                                name="email" 
                                                type="email" 
                                                placeholder="you@example.com" 
                                                required 
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="cart-login-password" className="text-sm">Password</Label>
                                                <Button
                                                    type="button"
                                                    variant="link"
                                                    className="h-auto p-0 text-xs text-muted-foreground hover:text-primary"
                                                    onClick={() => router.push('/auth/forgot-password')}
                                                >
                                                    Forgot password?
                                                </Button>
                                            </div>
                                            <Input 
                                                id="cart-login-password" 
                                                name="password" 
                                                type="password" 
                                                required 
                                            />
                                        </div>
                                        {authError && <p className="text-sm text-destructive">{authError}</p>}
                                        <Button className="w-full" disabled={authPending}>
                                            {authPending ? 'Logging in...' : 'Login to Checkout'}
                                        </Button>
                                    </form>
                                </TabsContent>

                                <TabsContent value="signup" className="mt-4">
                                    <form action={handleSignup} className="space-y-3">
                                        <input type="hidden" name="redirectTo" value="/cart" />
                                        <div className="space-y-1">
                                            <Label htmlFor="cart-signup-email" className="text-sm">Email</Label>
                                            <Input 
                                                id="cart-signup-email" 
                                                name="email" 
                                                type="email" 
                                                placeholder="you@example.com"
                                                required 
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor="cart-signup-password" className="text-sm">Password</Label>
                                            <Input 
                                                id="cart-signup-password" 
                                                name="password" 
                                                type="password" 
                                                required 
                                            />
                                        </div>
                                        {authError && <p className="text-sm text-destructive">{authError}</p>}
                                        {authMessage && <p className="text-sm text-green-600">{authMessage}</p>}
                                        <Button className="w-full" disabled={authPending}>
                                            {authPending ? 'Creating Account...' : 'Sign Up to Checkout'}
                                        </Button>
                                    </form>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    ) : (
                        <CardFooter>
                            <Button 
                                className="w-full" 
                                size="lg" 
                                onClick={handleCheckout} 
                                disabled={loading || checkoutPending || (items.filter(i => i.type === 'course').length > 0 && !pricing) || duplicates.length > 0}
                            >
                                {checkoutPending ? 'Processing...' : 'Proceed to Checkout'}
                            </Button>
                        </CardFooter>
                    )}
                </Card>
            </div>
        </div>
        </main>
    )
}
