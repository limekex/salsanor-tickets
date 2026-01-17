import { prisma } from '@/lib/db'
import { requireAdmin } from '@/utils/auth-admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft, Package, User, Calendar, CreditCard, FileText, Download } from 'lucide-react'
import { notFound } from 'next/navigation'
import { formatDateNO, formatDateTimeNO, formatNOK } from '@/lib/tickets/legal-requirements'
import { SendOrderEmails } from '../send-order-emails'

const statusColors = {
    DRAFT: 'bg-gray-500',
    PENDING_PAYMENT: 'bg-yellow-500',
    PAID: 'bg-green-500',
    CANCELLED: 'bg-red-500',
    REFUNDED: 'bg-purple-500',
} as const

const statusLabels = {
    DRAFT: 'Utkast',
    PENDING_PAYMENT: 'Venter betaling',
    PAID: 'Betalt',
    CANCELLED: 'Kansellert',
    REFUNDED: 'Refundert',
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

    const purchaserEmail = order.PersonProfile.UserAccount?.[0]?.email || order.PersonProfile.email

    return (
        <div className="space-y-rn-6">
            <div className="flex items-center gap-rn-4">
                <Button asChild variant="ghost" size="sm">
                    <Link href="/admin/orders">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Tilbake
                    </Link>
                </Button>
                <div className="flex-1">
                    <h1 className="rn-h2">Ordre {order.orderNumber || order.id.slice(0, 8)}</h1>
                    <p className="rn-meta text-rn-text-muted">
                        Opprettet {formatDateTimeNO(order.createdAt)}
                    </p>
                </div>
                <Badge className={statusColors[order.status]} className="text-base px-4 py-1">
                    {statusLabels[order.status]}
                </Badge>
            </div>

            <div className="grid md:grid-cols-2 gap-rn-6">
                {/* Order Information */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            Ordreinformasjon
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-rn-3">
                        <div>
                            <p className="text-sm text-rn-text-muted">Ordrenummer</p>
                            <p className="font-medium">{order.orderNumber || 'Ikke tildelt'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-rn-text-muted">Arrangør</p>
                            <p className="font-medium">{order.Organizer.name}</p>
                        </div>
                        {order.CoursePeriod && (
                            <div>
                                <p className="text-sm text-rn-text-muted">Periode</p>
                                <p className="font-medium">{order.CoursePeriod.name}</p>
                            </div>
                        )}
                        <div>
                            <p className="text-sm text-rn-text-muted">Beløp</p>
                            <div className="space-y-1">
                                <div className="flex justify-between">
                                    <span>Subtotal:</span>
                                    <span className="font-medium">{formatNOK(order.subtotalCents)}</span>
                                </div>
                                {order.discountCents > 0 && (
                                    <div className="flex justify-between text-green-600">
                                        <span>Rabatt:</span>
                                        <span className="font-medium">-{formatNOK(order.discountCents)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-rn-text-muted text-sm">
                                    <span>MVA ({order.mvaRate.toString()}%):</span>
                                    <span>{formatNOK(order.mvaCents)}</span>
                                </div>
                                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                                    <span>Totalt:</span>
                                    <span>{formatNOK(order.totalCents)}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Customer Information */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Kjøper
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-rn-3">
                        <div>
                            <p className="text-sm text-rn-text-muted">Navn</p>
                            <p className="font-medium">
                                {order.PersonProfile.firstName} {order.PersonProfile.lastName}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-rn-text-muted">E-post</p>
                            <p className="font-medium">{purchaserEmail}</p>
                        </div>
                        {order.PersonProfile.phone && (
                            <div>
                                <p className="text-sm text-rn-text-muted">Telefon</p>
                                <p className="font-medium">{order.PersonProfile.phone}</p>
                            </div>
                        )}
                        {order.PersonProfile.birthDate && (
                            <div>
                                <p className="text-sm text-rn-text-muted">Fødselsdato</p>
                                <p className="font-medium">{formatDateNO(order.PersonProfile.birthDate)}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Send Emails Section */}
            <SendOrderEmails
                orderId={order.id}
                orderStatus={order.status}
                hasInvoice={!!order.Invoice}
                hasCreditNote={order.CreditNote.length > 0}
                hasRegistrations={order.Registration.length > 0}
                hasEventRegistrations={order.EventRegistration.length > 0}
                purchaserEmail={purchaserEmail || 'Ingen e-post'}
            />

            {/* Order Items */}
            {order.Registration.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Kursregistreringer</CardTitle>
                        <CardDescription>
                            {order.Registration.length} registrering{order.Registration.length > 1 ? 'er' : ''}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-rn-2">
                            {order.Registration.map((reg) => (
                                <div key={reg.id} className="flex items-center justify-between p-rn-3 border border-rn-border rounded-lg">
                                    <div>
                                        <p className="font-medium">{reg.CourseTrack.title}</p>
                                        <p className="text-sm text-rn-text-muted">
                                            Status: <Badge variant="outline">{reg.status}</Badge>
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {order.EventRegistration.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Eventregistreringer</CardTitle>
                        <CardDescription>
                            {order.EventRegistration.length} billett{order.EventRegistration.length > 1 ? 'er' : ''}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-rn-2">
                            {order.EventRegistration.map((reg) => (
                                <div key={reg.id} className="flex items-center justify-between p-rn-3 border border-rn-border rounded-lg">
                                    <div>
                                        <p className="font-medium">{reg.Event.title}</p>
                                        <p className="text-sm text-rn-text-muted">
                                            <Calendar className="inline h-3 w-3 mr-1" />
                                            {formatDateTimeNO(reg.Event.startDateTime)}
                                        </p>
                                        {reg.Event.locationName && (
                                            <p className="text-sm text-rn-text-muted">
                                                📍 {reg.Event.locationName}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Payment History */}
            {order.Payment.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            Betalinger
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-rn-2">
                            {order.Payment.map((payment) => (
                                <div key={payment.id} className="flex items-center justify-between p-rn-3 border border-rn-border rounded-lg">
                                    <div className="flex-1">
                                        <p className="font-medium">{payment.paymentMethod}</p>
                                        <p className="text-sm text-rn-text-muted">
                                            {formatDateTimeNO(payment.createdAt)}
                                        </p>
                                        {payment.providerRef && (
                                            <p className="text-xs text-rn-text-muted">
                                                Ref: {payment.providerRef}
                                            </p>
                                        )}
                                        {payment.providerPaymentRef && payment.providerPaymentRef !== payment.providerRef && (
                                            <p className="text-xs font-mono text-rn-text-muted">
                                                Payment Ref: {payment.providerPaymentRef}
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium">{formatNOK(payment.amountCents)}</p>
                                        <Badge variant="outline">{payment.status}</Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Documents */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Dokumenter
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-rn-2">
                        {order.Invoice && (
                            <div className="flex items-center justify-between p-rn-3 border border-rn-border rounded-lg">
                                <div className="flex-1">
                                    <p className="font-medium">Faktura</p>
                                    <p className="text-sm text-rn-text-muted">
                                        {order.Invoice.invoiceNumber}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline">{order.Invoice.status}</Badge>
                                    <Button 
                                        asChild 
                                        size="sm" 
                                        variant="outline"
                                    >
                                        <a 
                                            href={`/api/admin/orders/${order.id}/invoice`} 
                                            target="_blank"
                                            className="flex items-center gap-2"
                                        >
                                            <Download className="h-4 w-4" />
                                            Last ned
                                        </a>
                                    </Button>
                                </div>
                            </div>
                        )}
                        {order.CreditNote.map((cn) => (
                            <div key={cn.id} className="flex items-center justify-between p-rn-3 border border-rn-border rounded-lg bg-red-50">
                                <div className="flex-1">
                                    <p className="font-medium">Kreditnota</p>
                                    <p className="text-sm text-rn-text-muted">
                                        {cn.creditNoteNumber} • {formatNOK(cn.totalCents)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline">Utstedt</Badge>
                                    <Button 
                                        asChild 
                                        size="sm" 
                                        variant="outline"
                                    >
                                        <a 
                                            href={`/api/admin/orders/${order.id}/credit-note/${cn.id}`}
                                            download
                                            className="flex items-center gap-2"
                                        >
                                            <Download className="h-4 w-4" />
                                            Last ned
                                        </a>
                                    </Button>
                                </div>
                            </div>
                        ))}
                        {!order.Invoice && order.CreditNote.length === 0 && (
                            <p className="text-sm text-rn-text-muted text-center py-4">
                                Ingen dokumenter opprettet
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
