import { prisma } from '@/lib/db'
import { requireOrgAdmin } from '@/utils/auth-org-admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft, Package, User, Calendar, CreditCard, FileText } from 'lucide-react'
import { notFound } from 'next/navigation'
import { formatDateNO, formatDateTimeNO, formatNOK } from '@/lib/tickets/legal-requirements'
import { SendOrderEmails } from '../send-order-emails'
import { getAdminSelectedOrg } from '@/utils/admin-org-context'

const statusColors = {
    DRAFT: 'bg-gray-500',
    PENDING_PAYMENT: 'bg-yellow-500',
    PAID: 'bg-green-500',
    CANCELLED: 'bg-red-500',
    REFUNDED: 'bg-purple-500',
} as const

const statusLabels = {
    DRAFT: 'Draft',
    PENDING_PAYMENT: 'Pending Payment',
    PAID: 'Paid',
    CANCELLED: 'Cancelled',
    REFUNDED: 'Refunded',
} as const

interface OrderDetailPageProps {
    params: Promise<{ id: string }>
}

export default async function StaffAdminOrderDetailPage({ params }: OrderDetailPageProps) {
    const userAccount = await requireOrgAdmin()
    const { id } = await params
    
    // For ORG_ADMIN, automatically use their organization
    let organizerId = await getAdminSelectedOrg()
    
    if (!organizerId && userAccount.UserAccountRole.length > 0) {
        organizerId = userAccount.UserAccountRole[0].organizerId
    }

    if (!organizerId) {
        return (
            <div className="space-y-rn-6">
                <p className="text-rn-text-muted">Please select an organization first.</p>
            </div>
        )
    }

    const order = await prisma.order.findUnique({
        where: { 
            id,
            organizerId, // Ensure the order belongs to the selected org
        },
        include: {
            PersonProfile: {
                include: {
                    UserAccount: {
                        select: {
                            email: true,
                        },
                    },
                },
            },
            Organizer: true,
            CoursePeriod: true,
            Registration: {
                include: {
                    CourseTrack: {
                        select: {
                            title: true
                        },
                    },
                },
            },
            EventRegistration: {
                include: {
                    Event: {
                        select: {
                            title: true,
                            startDateTime: true,
                            endDateTime: true,
                            locationName: true,
                        },
                    },
                },
            },
            Payment: {
                orderBy: {
                    createdAt: 'desc',
                },
            },
            Invoice: true,
            CreditNote: {
                include: {
                    Invoice: true,
                },
                orderBy: {
                    createdAt: 'desc',
                },
            },
        },
    })

    if (!order) {
        notFound()
    }

    function getStatusBadge(status: string) {
        return (
            <Badge className={statusColors[status as keyof typeof statusColors]}>
                {statusLabels[status as keyof typeof statusLabels]}
            </Badge>
        )
    }

    return (
        <div className="space-y-rn-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-rn-4">
                    <Button asChild variant="ghost" size="icon">
                        <Link href="/staffadmin/orders">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-rn-3">
                            <Package className="h-6 w-6 text-rn-primary" />
                            <h1 className="rn-h2">Order #{order.orderNumber || order.id.slice(0, 8)}</h1>
                        </div>
                        <p className="rn-meta text-rn-text-muted mt-1">
                            {formatDateNO(order.createdAt)} • {order.Organizer.name}
                        </p>
                    </div>
                </div>
            </div>

            {/* Order Info and Customer Info */}
            <div className="grid gap-rn-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-rn-2">
                            <Package className="h-5 w-5 text-rn-text-muted" />
                            <CardTitle>Order Information</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-rn-4">
                        <div>
                            <p className="text-sm text-rn-text-muted mb-rn-1">Status</p>
                            {getStatusBadge(order.status)}
                        </div>
                        <div>
                            <p className="text-sm text-rn-text-muted mb-rn-1">Total Amount</p>
                            <p className="rn-h3">{formatNOK(order.totalCents)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-rn-text-muted mb-rn-1">Created</p>
                            <p className="font-medium">{formatDateTimeNO(order.createdAt)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-rn-text-muted mb-rn-1">Updated</p>
                            <p className="font-medium">{formatDateTimeNO(order.updatedAt)}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-rn-2">
                            <User className="h-5 w-5 text-rn-text-muted" />
                            <CardTitle>Customer Information</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-rn-4">
                        <div>
                            <p className="text-sm text-rn-text-muted mb-rn-1">Name</p>
                            <p className="font-medium">
                                {order.PersonProfile.firstName} {order.PersonProfile.lastName}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-rn-text-muted mb-rn-1">Email</p>
                            <p className="font-medium">
                                {order.PersonProfile.UserAccount?.email ||
                                    order.PersonProfile.email ||
                                    'N/A'}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-rn-text-muted mb-rn-1">Phone</p>
                            <p className="font-medium">{order.PersonProfile.phone || 'N/A'}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Send Emails */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-rn-2">
                        <FileText className="h-5 w-5 text-rn-text-muted" />
                        <CardTitle>Send Emails</CardTitle>
                    </div>
                    <CardDescription>
                        Manually send order emails to the customer
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <SendOrderEmails
                        orderId={order.id}
                        orderStatus={order.status}
                        hasInvoice={!!order.Invoice}
                        hasCreditNote={order.CreditNote.length > 0}
                    />
                </CardContent>
            </Card>

            {/* Course Registrations */}
            {order.Registration.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Course Registrations</CardTitle>
                        <CardDescription>{order.Registration.length} registration(s)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-rn-3">
                            {order.Registration.map((reg) => (
                                <div
                                    key={reg.id}
                                    className="flex items-center justify-between p-rn-4 border border-rn-border rounded-lg"
                                >
                                    <div>
                                        <p className="font-medium">{reg.CourseTrack.title}</p>
                                        <p className="text-sm text-rn-text-muted">
                                            {reg.chosenRole} • Status: {reg.status}
                                        </p>
                                    </div>
                                    <Badge>{reg.status}</Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Event Registrations */}
            {order.EventRegistration.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Event Registrations</CardTitle>
                        <CardDescription>
                            {order.EventRegistration.length} registration(s)
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-rn-3">
                            {order.EventRegistration.map((reg) => (
                                <div
                                    key={reg.id}
                                    className="flex items-center justify-between p-rn-4 border border-rn-border rounded-lg"
                                >
                                    <div>
                                        <p className="font-medium">{reg.Event.title}</p>
                                        <p className="text-sm text-rn-text-muted">
                                            {formatDateTimeNO(reg.Event.startDateTime)} •{' '}
                                            {reg.Event.locationName || 'No location'}
                                        </p>
                                    </div>
                                    <Badge>{reg.status}</Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Payment History and Documents */}
            <div className="grid gap-rn-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-rn-2">
                            <CreditCard className="h-5 w-5 text-rn-text-muted" />
                            <CardTitle>Payment History</CardTitle>
                        </div>
                        <CardDescription>
                            {order.Payment.length} payment(s)
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {order.Payment.length === 0 ? (
                            <p className="text-sm text-rn-text-muted">No payments yet</p>
                        ) : (
                            <div className="space-y-rn-3">
                                {order.Payment.map((payment) => (
                                    <div
                                        key={payment.id}
                                        className="flex items-center justify-between p-rn-4 border border-rn-border rounded-lg"
                                    >
                                        <div>
                                            <p className="font-medium">{formatNOK(payment.amountCents)}</p>
                                            <p className="text-sm text-rn-text-muted">
                                                {formatDateTimeNO(payment.createdAt)}
                                            </p>
                                        </div>
                                        <Badge>{payment.status}</Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-rn-2">
                            <FileText className="h-5 w-5 text-rn-text-muted" />
                            <CardTitle>Documents</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-rn-3">
                            {order.Invoice && (
                                <div className="flex items-center justify-between p-rn-4 border border-rn-border rounded-lg">
                                    <div>
                                        <p className="font-medium">Invoice</p>
                                        <p className="text-sm text-rn-text-muted font-mono">
                                            {order.Invoice.invoiceNumber}
                                        </p>
                                    </div>
                                    <Badge>Invoice</Badge>
                                </div>
                            )}
                            {order.CreditNote.map((cn) => (
                                <div
                                    key={cn.id}
                                    className="flex items-center justify-between p-rn-4 border border-rn-border rounded-lg"
                                >
                                    <div>
                                        <p className="font-medium">Credit Note</p>
                                        <p className="text-sm text-rn-text-muted font-mono">
                                            {cn.creditNumber}
                                        </p>
                                    </div>
                                    <Badge variant="destructive">Credit Note</Badge>
                                </div>
                            ))}
                            {!order.Invoice && order.CreditNote.length === 0 && (
                                <p className="text-sm text-rn-text-muted">No documents</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
