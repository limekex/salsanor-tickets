import { getSelectedOrganizerForFinance } from '@/utils/auth-org-finance'
import { getOrgPaidRegistrations } from '@/app/actions/staffadmin-finance'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeftIcon, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { formatNOK, formatDateNO } from '@/lib/tickets/legal-requirements'

export default async function RegistrationPaymentsPage() {
    const organizerId = await getSelectedOrganizerForFinance()
    const orders = await getOrgPaidRegistrations(organizerId, 100)

    // Flatten registrations from orders
    const registrations = orders.flatMap(order => {
        const items: Array<{
            id: string
            orderId: string
            orderNumber: string | null
            participantName: string
            productType: 'course' | 'event' | 'membership'
            productName: string
            trackName: string | null
            amount: number
            paymentDate: Date
            paymentMethod: string
        }> = []

        // Course registrations
        order.Registration.forEach(reg => {
            items.push({
                id: reg.id,
                orderId: order.id,
                orderNumber: order.orderNumber,
                participantName: `${reg.PersonProfile?.firstName || ''} ${reg.PersonProfile?.lastName || ''}`.trim() || 'Unknown',
                productType: 'course',
                productName: order.CoursePeriod?.name || 'Course',
                trackName: reg.CourseTrack?.title || null,
                amount: order.totalCents / (order.Registration.length + order.EventRegistration.length + order.Membership.length),
                paymentDate: order.createdAt,
                paymentMethod: order.Payment[0]?.provider || 'Unknown'
            })
        })

        // Event registrations
        order.EventRegistration.forEach(reg => {
            items.push({
                id: reg.id,
                orderId: order.id,
                orderNumber: order.orderNumber,
                participantName: `${reg.PersonProfile?.firstName || ''} ${reg.PersonProfile?.lastName || ''}`.trim() || 'Unknown',
                productType: 'event',
                productName: reg.Event?.title || 'Event',
                trackName: null,
                amount: order.totalCents / (order.Registration.length + order.EventRegistration.length + order.Membership.length),
                paymentDate: order.createdAt,
                paymentMethod: order.Payment[0]?.provider || 'Unknown'
            })
        })

        // Membership registrations
        order.Membership.forEach(mem => {
            items.push({
                id: mem.id,
                orderId: order.id,
                orderNumber: order.orderNumber,
                participantName: `${mem.PersonProfile?.firstName || ''} ${mem.PersonProfile?.lastName || ''}`.trim() || 'Unknown',
                productType: 'membership',
                productName: mem.MembershipTier?.name || 'Membership',
                trackName: null,
                amount: order.totalCents / (order.Registration.length + order.EventRegistration.length + order.Membership.length),
                paymentDate: order.createdAt,
                paymentMethod: order.Payment[0]?.provider || 'Unknown'
            })
        })

        return items
    })

    // Calculate statistics
    const stats = {
        total: registrations.length,
        courses: registrations.filter(r => r.productType === 'course').length,
        events: registrations.filter(r => r.productType === 'event').length,
        memberships: registrations.filter(r => r.productType === 'membership').length,
        totalRevenue: orders.reduce((sum, o) => sum + o.totalCents, 0)
    }

    return (
        <div className="space-y-rn-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-rn-4">
                    <Button asChild variant="ghost" size="sm">
                        <Link href="/staffadmin/finance">
                            <ArrowLeftIcon className="mr-2 h-4 w-4" />
                            Back to Finance
                        </Link>
                    </Button>
                    <div>
                        <h2 className="rn-h2">Registration Payments</h2>
                        <p className="rn-caption text-rn-text-muted">Paid registrations for courses, events, and memberships</p>
                    </div>
                </div>
            </div>

            {/* Statistics */}
            <div className="grid gap-rn-4 md:grid-cols-2 lg:grid-cols-5">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="rn-meta">Total Registrations</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h2">{stats.total}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="rn-meta">Course</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h2">{stats.courses}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="rn-meta">Event</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h2">{stats.events}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="rn-meta">Membership</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h2">{stats.memberships}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="rn-meta">Total Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rn-h3">{formatNOK(stats.totalRevenue)}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Registrations Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Paid Registrations</CardTitle>
                    <CardDescription>
                        Showing last {registrations.length} registrations
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Order #</TableHead>
                                    <TableHead>Participant</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Track</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead>Payment Date</TableHead>
                                    <TableHead>Method</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {registrations.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-8 text-rn-text-muted">
                                            No paid registrations found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    registrations.map((reg) => (
                                        <TableRow key={reg.id}>
                                            <TableCell className="font-mono text-sm">
                                                {reg.orderNumber || reg.orderId.slice(0, 8)}
                                            </TableCell>
                                            <TableCell className="font-medium">{reg.participantName}</TableCell>
                                            <TableCell>
                                                <Badge 
                                                    variant={
                                                        reg.productType === 'course' ? 'default' :
                                                        reg.productType === 'event' ? 'secondary' :
                                                        'outline'
                                                    }
                                                >
                                                    {reg.productType}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{reg.productName}</TableCell>
                                            <TableCell className="text-rn-text-muted">
                                                {reg.trackName || '—'}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatNOK(reg.amount)}
                                            </TableCell>
                                            <TableCell>{formatDateNO(reg.paymentDate)}</TableCell>
                                            <TableCell className="capitalize">{reg.paymentMethod.toLowerCase()}</TableCell>
                                            <TableCell>
                                                <Button asChild variant="ghost" size="sm">
                                                    <Link href={`/staffadmin/orders/${reg.orderId}`}>
                                                        <ExternalLink className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
