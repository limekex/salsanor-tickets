import { prisma } from '@/lib/db'
import { requireOrgAdmin } from '@/utils/auth-org-admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Package, Eye, Calendar } from 'lucide-react'
import { formatDateNO, formatNOK } from '@/lib/tickets/legal-requirements'
import { getAdminSelectedOrg } from '@/utils/admin-org-context'

const statusColors = {
    DRAFT: 'bg-gray-500',
    PENDING: 'bg-yellow-500',
    PAID: 'bg-green-500',
    CANCELLED: 'bg-red-500',
    REFUNDED: 'bg-purple-500',
} as const

const statusLabels = {
    DRAFT: 'Draft',
    PENDING: 'Pending Payment',
    PAID: 'Paid',
    CANCELLED: 'Cancelled',
    REFUNDED: 'Refunded',
} as const

export default async function StaffAdminOrdersPage() {
    const userAccount = await requireOrgAdmin()
    
    // For ORG_ADMIN, automatically use their organization
    // (Unlike global ADMIN who needs to select from dropdown)
    let organizerId = await getAdminSelectedOrg()
    
    if (!organizerId && userAccount.UserAccountRole.length > 0) {
        // Auto-select first org for org admins
        organizerId = userAccount.UserAccountRole[0].organizerId
    }

    if (!organizerId) {
        return (
            <div className="space-y-rn-6">
                <p className="text-rn-text-muted">Please select an organization first.</p>
            </div>
        )
    }

    const orders = await prisma.order.findMany({
        where: {
            organizerId,
        },
        include: {
            PersonProfile: true,
            Organizer: {
                select: {
                    name: true,
                    slug: true,
                },
            },
            Registration: {
                include: {
                    CourseTrack: {
                        select: {
                            title: true,
                        },
                    },
                },
            },
            EventRegistration: {
                include: {
                    Event: {
                        select: {
                            title: true,
                        },
                    },
                },
            },
            Invoice: true,
            CreditNote: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
        take: 100,
    })

    return (
        <div className="space-y-rn-6">
            <div className="flex items-center gap-rn-4">
                <Package className="h-8 w-8 text-rn-primary" />
                <div className="flex-1">
                    <h1 className="rn-h2">Orders</h1>
                    <p className="rn-meta text-rn-text-muted">
                        Manage and send order emails
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Orders</CardTitle>
                    <CardDescription>{orders.length} orders found</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-rn-3">
                        {orders.map((order) => {
                            const itemCount = order.Registration.length + order.EventRegistration.length
                            const hasInvoice = !!order.Invoice
                            const hasCreditNote = order.CreditNote.length > 0

                            return (
                                <div
                                    key={order.id}
                                    className="flex items-center justify-between p-rn-4 border border-rn-border rounded-lg hover:bg-rn-background-hover transition-colors"
                                >
                                    <div className="flex items-start gap-rn-4 flex-1">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-rn-2 mb-rn-1">
                                                <p className="font-semibold">
                                                    {order.orderNumber || order.id.slice(0, 8)}
                                                </p>
                                                <Badge className={statusColors[order.status]}>
                                                    {statusLabels[order.status]}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-rn-text-muted mb-rn-1">
                                                {order.PersonProfile.firstName} {order.PersonProfile.lastName}
                                            </p>
                                            <p className="text-sm text-rn-text-muted">
                                                {order.Organizer.name} • {itemCount}{' '}
                                                {itemCount === 1 ? 'item' : 'items'}
                                            </p>
                                            <p className="text-xs text-rn-text-muted mt-rn-1">
                                                <Calendar className="inline h-3 w-3 mr-1" />
                                                {formatDateNO(order.createdAt)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-lg">{formatNOK(order.totalCents)}</p>
                                            {hasInvoice && (
                                                <Badge variant="outline" className="mt-1 text-xs">
                                                    Invoice
                                                </Badge>
                                            )}
                                            {hasCreditNote && (
                                                <Badge variant="outline" className="mt-1 text-xs">
                                                    Credit Note
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-rn-2">
                                        <Button asChild size="sm" variant="outline">
                                            <Link href={`/staffadmin/orders/${order.id}`}>
                                                <Eye className="h-4 w-4 mr-1" />
                                                View Details
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
