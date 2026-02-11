import { exportOrgFinancialData } from '@/app/actions/staffadmin-finance'
import { requireOrgFinanceForOrganizer } from '@/utils/auth-org-finance'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    try {
        // Get organizerId from query params
        const searchParams = request.nextUrl.searchParams
        const organizerId = searchParams.get('organizerId')
        
        if (!organizerId) {
            return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
        }

        // Verify user has access to this organization
        await requireOrgFinanceForOrganizer(organizerId)

        const data = await exportOrgFinancialData(organizerId)

        // Generate CSV
        const headers = [
            'Order ID',
            'Organization',
            'Org.nr',
            'Period',
            'Period Code',
            'Subtotal (NOK)',
            'Discount (NOK)',
            'Subtotal After Discount (NOK)',
            'MVA Rate (%)',
            'MVA Amount (NOK)',
            'Total (NOK)',
            'Currency',
            'Registration Count',
            'Payment Provider',
            'Payment Status',
            'Created At',
            'Updated At'
        ].join(',')

        const rows = data.map(order => [
            order.orderId,
            `"${order.organizerName}"`,
            order.organizerOrgNr,
            `"${order.periodName}"`,
            order.periodCode,
            (order.subtotalCents / 100).toFixed(2),
            (order.discountCents / 100).toFixed(2),
            (order.subtotalAfterDiscountCents / 100).toFixed(2),
            order.mvaRate.toFixed(2),
            (order.mvaCents / 100).toFixed(2),
            (order.totalCents / 100).toFixed(2),
            order.currency,
            order.registrationCount,
            order.paymentProvider || '',
            order.paymentStatus || '',
            order.createdAt,
            order.updatedAt
        ].join(','))

        const csv = [headers, ...rows].join('\n')
        const filename = `financial-export-${new Date().toISOString().split('T')[0]}.csv`

        return new NextResponse(csv, {
            headers: {
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Type': 'text/csv'
            }
        })
    } catch (error) {
        console.error('Export error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to export financial data' },
            { status: 500 }
        )
    }
}
