import { prisma } from '@/lib/db'
import { requireAdmin } from '@/utils/auth-admin'
import { Package } from 'lucide-react'
import { OrdersTable } from './orders-table'

export default async function OrdersPage() {
    await requireAdmin()

    const [orders, organizers] = await Promise.all([
        prisma.order.findMany({
            select: {
                id: true,
                orderNumber: true,
                status: true,
                totalCents: true,
                createdAt: true,
                PersonProfile: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    }
                },
                Organizer: {
                    select: {
                        name: true,
                        slug: true
                    }
                },
                Registration: {
                    select: {
                        id: true,
                        CourseTrack: {
                            select: {
                                title: true
                            }
                        }
                    }
                },
                EventRegistration: {
                    select: {
                        id: true,
                        Event: {
                            select: {
                                title: true,
                            }
                        }
                    }
                },
                Invoice: {
                    select: { id: true }
                },
                CreditNote: {
                    select: { id: true }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 1000
        }),
        prisma.organizer.findMany({
            where: {
                Order: {
                    some: {}
                }
            },
            select: {
                name: true,
                slug: true
            },
            orderBy: {
                name: 'asc'
            }
        })
    ])

    return (
        <div className="space-y-rn-6">
            <div className="flex items-center gap-rn-4">
                <Package className="h-8 w-8 text-rn-primary" />
                <div className="flex-1">
                    <h1 className="rn-h2">Orders</h1>
                    <p className="rn-meta text-rn-text-muted">
                        Manage orders and send documents
                    </p>
                </div>
            </div>

            <OrdersTable orders={orders} organizers={organizers} />
        </div>
    )
}
