import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { payOrder } from '@/app/actions/payments'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'

export default async function CheckoutPage({ params }: { params: Promise<{ orderId: string }> }) {
    const { orderId } = await params

    // Get user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
        redirect('/auth/login')
    }

    // Get order with all details
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
            PersonProfile: true,
            Registration: {
                include: {
                    CourseTrack: {
                        include: {
                            CoursePeriod: {
                                include: {
                                    Organizer: true
                                }
                            }
                        }
                    }
                }
            }
        }
    })

    if (!order) {
        notFound()
    }

    // Verify user owns this order
    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: { PersonProfile: true }
    })

    if (order.purchaserPersonId !== userAccount?.PersonProfile?.id) {
        redirect('/profile')
    }

    // If already paid, redirect to success
    if (order.status === 'PAID') {
        redirect(`/success?orderId=${orderId}`)
    }

    // Auto-redirect to payment
    const paymentResult = await payOrder(orderId)
    
    // If redirect didn't happen (error occurred), show error
    if (paymentResult?.error) {
        return (
            <main className="container mx-auto max-w-2xl py-rn-8 px-rn-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Payment Error</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-rn-4">
                        <p className="text-rn-danger">{paymentResult.error}</p>
                        <div className="flex gap-rn-2">
                            <Button asChild>
                                <Link href={`/checkout/${orderId}`}>Try Again</Link>
                            </Button>
                            <Button variant="outline" asChild>
                                <Link href="/profile">Go to Profile</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </main>
        )
    }

    // Loading state while redirecting
    return (
        <main className="container mx-auto max-w-2xl py-rn-8 px-rn-4">
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-rn-12 space-y-rn-4">
                    <Loader2 className="h-8 w-8 animate-spin text-rn-primary" />
                    <p className="rn-meta text-rn-text-muted">Redirecting to payment...</p>
                </CardContent>
            </Card>
        </main>
    )
}
