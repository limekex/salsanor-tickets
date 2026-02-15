'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Search, ChevronLeft, ChevronRight, Package, FileText, Receipt, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { formatDateNO, formatNOK } from '@/lib/tickets/legal-requirements'

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

type OrderStatus = keyof typeof statusColors
type SortField = 'order' | 'total' | 'date'
type SortDirection = 'asc' | 'desc'

interface Order {
    id: string
    orderNumber: string | null
    status: OrderStatus
    totalCents: number
    createdAt: Date
    PersonProfile: {
        firstName: string
        lastName: string
        email: string | null
    }
    Organizer: {
        name: string
        slug: string
    }
    Registration: Array<{
        id: string
        CourseTrack: { title: string }
    }>
    EventRegistration: Array<{
        id: string
        Event: { title: string }
    }>
    Invoice: { id: string } | null
    CreditNote: Array<{ id: string }>
}

interface OrdersTableProps {
    orders: Order[]
    organizers: Array<{ name: string; slug: string }>
}

const PAGE_SIZES = [25, 50, 100]

export function OrdersTable({ orders, organizers }: OrdersTableProps) {
    const router = useRouter()
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [organizerFilter, setOrganizerFilter] = useState<string>('all')
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(25)
    const [sortField, setSortField] = useState<SortField>('date')
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

    // Handle sort toggle
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortDirection('desc')
        }
        setPage(1)
    }

    // Get sort icon for a field
    const getSortIcon = (field: SortField) => {
        if (sortField !== field) {
            return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
        }
        return sortDirection === 'asc' 
            ? <ArrowUp className="ml-1 h-3 w-3" />
            : <ArrowDown className="ml-1 h-3 w-3" />
    }

    // Filter and sort orders
    const filteredOrders = useMemo(() => {
        const result = orders.filter((order) => {
            // Search filter
            const searchLower = search.toLowerCase()
            const matchesSearch = search === '' || 
                order.orderNumber?.toLowerCase().includes(searchLower) ||
                order.PersonProfile.firstName.toLowerCase().includes(searchLower) ||
                order.PersonProfile.lastName.toLowerCase().includes(searchLower) ||
                order.PersonProfile.email?.toLowerCase().includes(searchLower) ||
                order.id.toLowerCase().includes(searchLower)

            // Status filter
            const matchesStatus = statusFilter === 'all' || order.status === statusFilter

            // Organizer filter
            const matchesOrganizer = organizerFilter === 'all' || order.Organizer.slug === organizerFilter

            return matchesSearch && matchesStatus && matchesOrganizer
        })

        // Sort
        result.sort((a, b) => {
            let comparison = 0
            switch (sortField) {
                case 'order':
                    const aOrder = a.orderNumber || a.id
                    const bOrder = b.orderNumber || b.id
                    comparison = aOrder.localeCompare(bOrder)
                    break
                case 'total':
                    comparison = a.totalCents - b.totalCents
                    break
                case 'date':
                    comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                    break
            }
            return sortDirection === 'asc' ? comparison : -comparison
        })

        return result
    }, [orders, search, statusFilter, organizerFilter, sortField, sortDirection])

    // Pagination
    const totalPages = Math.ceil(filteredOrders.length / pageSize)
    const startIndex = (page - 1) * pageSize
    const paginatedOrders = filteredOrders.slice(startIndex, startIndex + pageSize)

    // Reset page when filters change
    const handleFilterChange = (setter: (value: string) => void) => (value: string) => {
        setter(value)
        setPage(1)
    }

    return (
        <div className="space-y-rn-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-rn-3">
                <div className="relative flex-1 min-w-[200px] max-w-[400px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-rn-text-muted" />
                    <Input
                        placeholder="Search orders..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value)
                            setPage(1)
                        }}
                        className="pl-9"
                    />
                </div>

                <Select value={statusFilter} onValueChange={handleFilterChange(setStatusFilter)}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="PAID">Paid</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        <SelectItem value="REFUNDED">Refunded</SelectItem>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={organizerFilter} onValueChange={handleFilterChange(setOrganizerFilter)}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Organizer" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Organizers</SelectItem>
                        {organizers.map((org) => (
                            <SelectItem key={org.slug} value={org.slug}>
                                {org.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="ml-auto text-sm text-rn-text-muted">
                    {filteredOrders.length} orders
                </div>
            </div>

            {/* Table */}
            <div className="border border-rn-border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-rn-surface hover:bg-rn-surface">
                            <TableHead>
                                <button
                                    onClick={() => handleSort('order')}
                                    className="flex items-center hover:text-rn-text font-medium"
                                >
                                    Order
                                    {getSortIcon('order')}
                                </button>
                            </TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Organizer</TableHead>
                            <TableHead>Items</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Docs</TableHead>
                            <TableHead className="text-right">
                                <button
                                    onClick={() => handleSort('total')}
                                    className="flex items-center justify-end w-full hover:text-rn-text font-medium"
                                >
                                    Total
                                    {getSortIcon('total')}
                                </button>
                            </TableHead>
                            <TableHead>
                                <button
                                    onClick={() => handleSort('date')}
                                    className="flex items-center hover:text-rn-text font-medium"
                                >
                                    Date
                                    {getSortIcon('date')}
                                </button>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedOrders.length > 0 ? (
                            paginatedOrders.map((order) => {
                                const itemCount = order.Registration.length + order.EventRegistration.length
                                const hasInvoice = !!order.Invoice
                                const hasCreditNote = order.CreditNote.length > 0

                                return (
                                    <TableRow 
                                        key={order.id}
                                        className="cursor-pointer"
                                        onClick={() => router.push(`/admin/orders/${order.id}`)}
                                    >
                                        <TableCell className="font-medium">
                                            {order.orderNumber || order.id.slice(0, 8)}
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">
                                                    {order.PersonProfile.firstName} {order.PersonProfile.lastName}
                                                </p>
                                                {order.PersonProfile.email && (
                                                    <p className="text-xs text-rn-text-muted">
                                                        {order.PersonProfile.email}
                                                    </p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-rn-text-muted">
                                            {order.Organizer.name}
                                        </TableCell>
                                        <TableCell>
                                            {itemCount} {itemCount === 1 ? 'item' : 'items'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={statusColors[order.status]}>
                                                {statusLabels[order.status]}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                {hasInvoice && (
                                                    <span title="Invoice">
                                                        <Receipt className="h-4 w-4 text-rn-text-muted" />
                                                    </span>
                                                )}
                                                {hasCreditNote && (
                                                    <span title="Credit Note">
                                                        <FileText className="h-4 w-4 text-rn-text-muted" />
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {formatNOK(order.totalCents)}
                                        </TableCell>
                                        <TableCell className="text-rn-text-muted">
                                            {formatDateNO(order.createdAt)}
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        ) : (
                            <TableRow>
                                <TableCell colSpan={8} className="h-32 text-center">
                                    <div className="flex flex-col items-center justify-center text-rn-text-muted">
                                        <Package className="h-8 w-8 mb-2 opacity-50" />
                                        <p>No orders found</p>
                                        {(search || statusFilter !== 'all' || organizerFilter !== 'all') && (
                                            <Button 
                                                variant="link" 
                                                size="sm"
                                                onClick={() => {
                                                    setSearch('')
                                                    setStatusFilter('all')
                                                    setOrganizerFilter('all')
                                                }}
                                            >
                                                Clear filters
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {filteredOrders.length > 0 && (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-rn-2 text-sm text-rn-text-muted">
                        <span>Show</span>
                        <Select 
                            value={pageSize.toString()} 
                            onValueChange={(v) => {
                                setPageSize(Number(v))
                                setPage(1)
                            }}
                        >
                            <SelectTrigger className="w-[70px] h-8">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PAGE_SIZES.map((size) => (
                                    <SelectItem key={size} value={size.toString()}>
                                        {size}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <span>per page</span>
                    </div>

                    <div className="flex items-center gap-rn-2">
                        <span className="text-sm text-rn-text-muted">
                            {startIndex + 1}-{Math.min(startIndex + pageSize, filteredOrders.length)} of {filteredOrders.length}
                        </span>
                        <div className="flex items-center gap-rn-1">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm px-2">
                                Page {page} of {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
