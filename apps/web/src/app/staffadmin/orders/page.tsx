import { prisma } from '@/lib/db'
import { requireOrgAdmin } from '@/utils/auth-org-admin'
import { Package } from 'lucide-react'
import { getStaffAdminSelectedOrg } from '@/utils/staff-admin-org-context'
import { OrdersTable } from './orders-table'

export default async function StaffAdminOrdersPage() {
    const userAccount = await requireOrgAdmin()
    
    // Get selected org from staffadmin context (cookie)
    let organizerId = await getStaffAdminSelectedOrg()
    
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

    // Use select instead of include to avoid Decimal serialization issues
    const orders = await prisma.order.findMany({
        where: {
            organizerId,
        },
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
                },
            },
            Registration: {
                select: {
                    id: true,
                    CourseTrack: {
                        select: {
                            title: true,
                        },
                    },
                },
            },
            EventRegistration: {
                select: {
                    id: true,
                    Event: {
                        select: {
                            title: true,
                        },
                    },
                },
            },
            Invoice: {
                select: {
                    id: true,
                },
            },
            CreditNote: {
                select: {
                    id: true,
                },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
        take: 1000,
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

            <OrdersTable orders={orders} />
        </div>
    )
}
