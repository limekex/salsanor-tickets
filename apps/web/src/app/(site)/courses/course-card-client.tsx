'use client'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useCart } from '@/hooks/use-cart'

type Track = {
    id: string
    title: string
    weekday: number
    timeStart: string
    timeEnd: string
    levelLabel: string | null
    priceSingleCents: number
    pricePairCents: number | null
    capacityTotal: number
}

type Period = {
    id: string
    name: string
    startDate: Date
    endDate: Date
    salesOpenAt: Date
    salesCloseAt: Date
    organizerId: string
    Organizer: {
        id: string
        name: string
        slug: string
    }
}

type CourseCardClientProps = {
    track: Track
    period: Period
    weekDayLabel: string
    isSalesOpen: boolean
    isRegistered: boolean
    organizerId: string
    organizerName: string
}

export function CourseCardClient({ 
    track, 
    period, 
    weekDayLabel, 
    isSalesOpen, 
    isRegistered,
    organizerId,
    organizerName
}: CourseCardClientProps) {
    const { getCartOrganizerId, getCartOrganizerName, items } = useCart()
    
    const cartOrganizerId = getCartOrganizerId()
    const cartOrganizerName = getCartOrganizerName()
    const isDifferentOrganizer = cartOrganizerId && cartOrganizerId !== organizerId
    const isInCart = items.some(item => item.type === 'course' && item.trackId === track.id)

    return (
        <Card className="flex flex-col h-full">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <Badge variant="outline">{weekDayLabel}s</Badge>
                    {track.levelLabel && <Badge>{track.levelLabel}</Badge>}
                </div>
                <CardTitle className="pt-2">{track.title}</CardTitle>
                <CardDescription>
                    {track.timeStart} - {track.timeEnd}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-2">
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span>Single:</span>
                        <span className="font-semibold">{track.priceSingleCents / 100},-</span>
                    </div>
                    {track.pricePairCents && (
                        <div className="flex justify-between">
                            <span>Couple:</span>
                            <span className="font-semibold text-green-600">{track.pricePairCents / 100},-</span>
                        </div>
                    )}
                </div>
                
                {isDifferentOrganizer && (
                    <Alert variant="destructive" className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                            Your cart contains courses from <strong>{cartOrganizerName}</strong>. 
                            You can only checkout courses from one organizer at a time.
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
            <CardFooter>
                {(() => {
                    if (isRegistered) {
                        return (
                            <Button className="w-full" variant="secondary" disabled>
                                Already Registered
                            </Button>
                        )
                    }

                    if (isInCart) {
                        return (
                            <Button className="w-full" variant="secondary" disabled>
                                In Cart
                            </Button>
                        )
                    }

                    if (isDifferentOrganizer) {
                        return (
                            <Button className="w-full" variant="outline" disabled>
                                Different Organizer
                            </Button>
                        )
                    }

                    return (
                        <Button className="w-full" disabled={!isSalesOpen} asChild={isSalesOpen}>
                            {isSalesOpen ? (
                                <Link href={`/courses/${period.id}/${track.id}/register`}>
                                    Register
                                </Link>
                            ) : (
                                <span>Sales Closed</span>
                            )}
                        </Button>
                    )
                })()}
            </CardFooter>
        </Card>
    )
}
