import { prisma } from '@/lib/db'
import { requireAdmin } from '@/utils/auth-admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft, Package, Calendar, CreditCard, FileText, Download } from 'lucide-react'
import { notFound } from 'next/navigation'
import { formatDateTimeNO, formatNOK } from '@/lib/tickets/legal-requirements'
import { SendOrderEmails } from '../send-order-emails'
import { SyncStripeFeesButton } from './sync-stripe-fees-button'

const statusColors = {
    DRAFT: 'bg-gray-500',
    PENDING: 'bg-yellow-500',
    PAID: 'bg-green-500',
    CANCELLED: 'bg-red-500',
    REFUNDED: 'bg-purple-500',
} as const

const statusLabels = {
    DRAFT: 'Draft',
    PENDING: 'Pending',
    PAID: 'Paid',
    CANCELLED: 'Cancelled',
    REFUNDED: 'Refunded',
} as const

interface OrderDetailPageProps {
    params: Promise<{ id: string }>
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
    await requireAdmin()
    const { id } = await params

    const order = await prisma.order.findUnique({
        where: { id },
        include: {
            PersonProfile: {
                include: {
                    UserAccount: {
                        select: {
                            email: true
                        }
                    }
                }
            },
            Organizer: true,
            CoursePeriod: true,
            Registration: {
                include: {
                    CourseTrack: {
                        select: {
                            title: true
                        }
                    }
                }
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
            Invoice: true,
            CreditNote: {
                include: {
                    Invoice: true
                }
            },
            Payment: {
                orderBy: {
                    createdAt: 'desc'
                }
            }
        }
    })

    if (!order) {
        notFound()
    }

    const purchaserEmail = order.PersonProfile.UserAccount?.email || order.PersonProfile.email

    return (
        <div className="space-y-rn-6">
            {/* Header */}
            <div className="flex items-center gap-rn-4">
                <Button asChild variant="ghost" size="sm">
                    <Link href="/admin/orders">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Link>
                </Button>
                <div className="flex-1">
                    <h1 className="rn-h2">Order {order.orderNumber || order.id.slice(0, 8)}</h1>
                    <p className="rn-meta text-rn-text-muted">
                        Created {formatDateTimeNO(order.createdAt)}
                    </p>
                </div>
                <Badge className={`${statusColors[order.status]} text-base px-4 py-1`}>
                    {statusLabels[order.status]}
                </Badge>
            </div>

            {/* Send Documents Section */}
            <SendOrderEmails
                orderId={order.id}
                orderStatus={order.status}
                hasInvoice={!!order.Invoice}
                hasCreditNote={order.CreditNote.length > 0}
                hasRegistrations={order.Registration.length > 0}
                hasEventRegistrations={order.EventRegistration.length > 0}
                purchaserEmail={purchaserEmail || 'No email'}
            />

            {/* Row 1: Order Info + Buyer (1/2), Registrations (1/2) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-rn-4">
                {/* Order & Buyer Information */}
                <Card>
                    <CardHeader className="pb-rn-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Package className="h-4 w-4" />
                            Order Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-rn-3 text-sm">
                        {/* Order info */}
                        <div className="space-y-rn-2">
                            <div className="flex justify-between">
                                <span className="text-rn-text-muted">Order Number</span>
                                <span className="font-medium">{order.orderNumber || 'Not assigned'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-rn-text-muted">Organizer</span>
                                <span className="font-medium">{order.Organizer.name}</span>
                            </div>
                            {order.CoursePeriod && (
                                <div className="flex justify-between">
                                    <span className="text-rn-text-muted">Period</span>
                                    <span className="font-medium">{order.CoursePeriod.name}</span>
                                </div>
                            )}
                        </div>

                        {/* Buyer info */}
                        <div className="pt-rn-2 border-t border-rn-border space-y-rn-2">
                            <div className="flex justify-between">
                                <span className="text-rn-text-muted">Buyer</span>
                                <span className="font-medium">
                                    {order.PersonProfile.firstName} {order.PersonProfile.lastName}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-rn-text-muted">Email</span>
                                <span className="font-medium truncate max-w-[200px]" title={purchaserEmail || ''}>
                                    {purchaserEmail}
                                </span>
                            </div>
                            {order.PersonProfile.phone && (
                                <div className="flex justify-between">
                                    <span className="text-rn-text-muted">Phone</span>
                                    <span className="font-medium">{order.PersonProfile.phone}</span>
                                </div>
                            )}
                            {order.Payment[0]?.stripeCustomerId && (
                                <div className="flex justify-between">
                                    <span className="text-rn-text-muted">Stripe Customer</span>
                                    <span className="font-mono text-xs">{order.Payment[0].stripeCustomerId}</span>
                                </div>
                            )}
                        </div>

                        {/* Totals */}
                        <div className="pt-rn-2 border-t border-rn-border space-y-rn-1">
                            <div className="flex justify-between">
                                <span className="text-rn-text-muted">Subtotal</span>
                                <span>{formatNOK(order.subtotalCents)}</span>
                            </div>
                            {order.discountCents > 0 && (
                                <div className="flex justify-between text-green-600">
                                    <span>Discount</span>
                                    <span>-{formatNOK(order.discountCents)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-rn-text-muted">
                                <span>VAT ({order.mvaRate.toString()}%)</span>
                                <span>{formatNOK(order.mvaCents)}</span>
                            </div>
                            <div className="flex justify-between font-bold pt-rn-1 border-t border-rn-border">
                                <span>Total</span>
                                <span>{formatNOK(order.totalCents)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Registrations */}
                <Card>
                    <CardHeader className="pb-rn-2">
                        <CardTitle className="text-base">
                            {order.Registration.length > 0 ? 'Course Registrations' : 'Event Registrations'}
                        </CardTitle>
                        <CardDescription>
                            {order.Registration.length > 0 
                                ? `${order.Registration.length} registration${order.Registration.length > 1 ? 's' : ''}`
                                : order.EventRegistration.length > 0
                                    ? `${order.EventRegistration.length} ticket${order.EventRegistration.length > 1 ? 's' : ''}`
                                    : 'No registrations'
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {(order.Registration.length > 0 || order.EventRegistration.length > 0) ? (
                            <div className="grid gap-rn-2">
                                {order.Registration.map((reg) => (
                                    <div key={reg.id} className="flex items-center justify-between p-rn-3 border border-rn-border rounded-lg">
                                        <div>
                                            <p className="font-medium">{reg.CourseTrack.title}</p>
                                        </div>
                                        <Badge variant="outline">{reg.status}</Badge>
                                    </div>
                                ))}
                                {order.EventRegistration.map((reg) => (
                                    <div key={reg.id} className="flex items-center justify-between p-rn-3 border border-rn-border rounded-lg">
                                        <div>
                                            <p className="font-medium">{reg.Event.title}</p>
                                            <p className="text-sm text-rn-text-muted">
                                                <Calendar className="inline h-3 w-3 mr-1" />
                                                {formatDateTimeNO(reg.Event.startDateTime)}
                                                {reg.Event.locationName && ` • ${reg.Event.locationName}`}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-rn-text-muted">No registrations found</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Row 2: Payments (1/2), Documents (1/2) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-rn-4">
                {/* Payments */}
                <Card>
                    <CardHeader className="pb-rn-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <CreditCard className="h-4 w-4" />
                                Payments
                            </CardTitle>
                            <SyncStripeFeesButton 
                                orderId={order.id} 
                                hasFees={order.Payment.some(p => p.stripeFeeCents !== null)} 
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {order.Payment.length > 0 ? (
                            <div className="space-y-rn-3">
                                {order.Payment.map((payment) => (
                                    <div key={payment.id} className="p-rn-3 border border-rn-border rounded-lg space-y-rn-2">
                                        {/* Header with amount and status */}
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium">{formatNOK(payment.amountCents)}</span>
                                            <Badge variant="outline">{payment.status}</Badge>
                                        </div>
                                        
                                        {/* Payment details grid */}
                                        <div className="text-xs space-y-rn-1 text-rn-text-muted">
                                            <div className="flex justify-between">
                                                <span>Date</span>
                                                <span>{formatDateTimeNO(payment.createdAt)}</span>
                                            </div>
                                            
                                            {payment.stripePaymentIntentId && (
                                                <div className="flex justify-between">
                                                    <span>Payment ID</span>
                                                    <span className="font-mono">{payment.stripePaymentIntentId}</span>
                                                </div>
                                            )}
                                            
                                            {payment.stripePaymentMethodType && (
                                                <div className="flex justify-between">
                                                    <span>Method</span>
                                                    <span className="capitalize">{payment.stripePaymentMethodType}</span>
                                                </div>
                                            )}
                                            
                                            {payment.stripePaymentMethodId && (
                                                <div className="flex justify-between">
                                                    <span>Method ID</span>
                                                    <span className="font-mono">{payment.stripePaymentMethodId}</span>
                                                </div>
                                            )}
                                            
                                            {payment.stripeCardLast4 && (
                                                <div className="flex justify-between">
                                                    <span>Card</span>
                                                    <span className="capitalize">
                                                        {payment.stripeCardBrand} •••• {payment.stripeCardLast4}
                                                    </span>
                                                </div>
                                            )}
                                            
                                            {payment.stripeCardFingerprint && (
                                                <div className="flex justify-between">
                                                    <span>Fingerprint</span>
                                                    <span className="font-mono">{payment.stripeCardFingerprint}</span>
                                                </div>
                                            )}
                                            
                                            {!payment.stripePaymentIntentId && payment.providerPaymentRef && (
                                                <div className="flex justify-between">
                                                    <span>Ref</span>
                                                    <span className="font-mono truncate max-w-[200px]">{payment.providerPaymentRef}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Fee breakdown */}
                                        {(payment.platformFeeCents || payment.stripeFeeCents) && (
                                            <div className="pt-rn-2 border-t border-rn-border text-xs space-y-rn-1">
                                                {payment.stripeFeeCents && (
                                                    <div className="flex justify-between text-rn-text-muted">
                                                        <span>Stripe Fee</span>
                                                        <span>-{formatNOK(payment.stripeFeeCents)}</span>
                                                    </div>
                                                )}
                                                {payment.platformFeeCents && (
                                                    <div className="flex justify-between text-rn-text-muted">
                                                        <span>Platform Fee</span>
                                                        <span>-{formatNOK(payment.platformFeeCents)}</span>
                                                    </div>
                                                )}
                                                {payment.netAmountCents && (
                                                    <div className="flex justify-between font-medium text-rn-text">
                                                        <span>Net to Organizer</span>
                                                        <span>{formatNOK(payment.netAmountCents)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-rn-text-muted text-center py-4">
                                No payments recorded
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Documents */}
                <Card>
                    <CardHeader className="pb-rn-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <FileText className="h-4 w-4" />
                            Documents
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-rn-2">
                            {order.Invoice && (
                                <div className="flex items-center justify-between p-rn-3 border border-rn-border rounded-lg">
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">Invoice</p>
                                        <p className="text-xs text-rn-text-muted">
                                            {order.Invoice.invoiceNumber}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs">{order.Invoice.status}</Badge>
                                        <Button asChild size="sm" variant="outline">
                                            <a href={`/api/invoices/${order.Invoice.id}/pdf`} target="_blank">
                                                <Download className="h-3 w-3" />
                                            </a>
                                        </Button>
                                    </div>
                                </div>
                            )}
                            {order.CreditNote.map((cn) => (
                                <div key={cn.id} className="p-rn-3 border border-rn-border rounded-lg bg-red-50 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <p className="font-medium text-sm">Credit Note</p>
                                            <p className="text-xs text-rn-text-muted">
                                                {cn.creditNumber} • {formatNOK(cn.totalCents)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs">Issued</Badge>
                                            <Button asChild size="sm" variant="outline">
                                                <a href={`/api/credit-notes/${cn.id}/pdf`} target="_blank">
                                                    <Download className="h-3 w-3" />
                                                </a>
                                            </Button>
                                        </div>
                                    </div>
                                    {cn.acquirerReferenceNumber && (
                                        <div className="bg-blue-50 p-2 rounded border border-blue-200">
                                            <p className="text-xs font-medium text-blue-800">ARN (Bank Reference)</p>
                                            <p className="text-xs font-mono text-blue-700">{cn.acquirerReferenceNumber}</p>
                                            <p className="text-xs text-blue-600 mt-1">
                                                Customer can use this to trace refund at their bank
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {!order.Invoice && order.CreditNote.length === 0 && (
                                <p className="text-sm text-rn-text-muted text-center py-4">
                                    No documents created
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
