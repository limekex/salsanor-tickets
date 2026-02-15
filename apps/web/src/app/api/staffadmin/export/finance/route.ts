import { exportOrgFinancialData } from '@/app/actions/staffadmin-finance'
import { requireOrgFinanceForOrganizer } from '@/utils/auth-org-finance'
import { NextRequest, NextResponse } from 'next/server'
import { escapeCSV } from '@/lib/csv-utils'

export async function GET(request: NextRequest) {
    try {
        // Get parameters from query params
        const searchParams = request.nextUrl.searchParams
        const organizerId = searchParams.get('organizerId')
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')
        
        if (!organizerId) {
            return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
        }

        // Verify user has access to this organization
        await requireOrgFinanceForOrganizer(organizerId)

        const data = await exportOrgFinancialData(organizerId, { startDate, endDate })

        // Generate CSV
        const headers = [
            'Order ID',
            'Order Number',
            'Organization',
            'Org.nr',
            'Product Name',
            'Product Code',
            'Order Type',
            'Subtotal (NOK)',
            'Discount (NOK)',
            'Subtotal After Discount (NOK)',
            'MVA Rate (%)',
            'MVA Amount (NOK)',
            'Total (NOK)',
            'Stripe Fee (NOK)',
            'Platform Fee (NOK)',
            'Net Amount (NOK)',
            'Payment ID',
            'Payment Method',
            'Card Brand',
            'Card Last 4',
            'Card Fingerprint',
            'Currency',
            'Registration Count',
            'Payment Provider',
            'Payment Status',
            'Payment Reference',
            'Invoice Number',
            'Created At',
            'Updated At'
        ].join(',')

        const rows = data.map(order => [
            escapeCSV(order.orderId),
            escapeCSV(order.orderNumber),
            escapeCSV(order.organizerName),
            escapeCSV(order.organizerOrgNr),
            escapeCSV(order.periodName),
            escapeCSV(order.periodCode),
            escapeCSV(order.orderType),
            (order.subtotalCents / 100).toFixed(2),
            (order.discountCents / 100).toFixed(2),
            (order.subtotalAfterDiscountCents / 100).toFixed(2),
            order.mvaRate.toFixed(2),
            (order.mvaCents / 100).toFixed(2),
            (order.totalCents / 100).toFixed(2),
            order.stripeFeeCents ? (order.stripeFeeCents / 100).toFixed(2) : '',
            order.platformFeeCents ? (order.platformFeeCents / 100).toFixed(2) : '',
            order.netAmountCents ? (order.netAmountCents / 100).toFixed(2) : '',
            escapeCSV(order.stripePaymentIntentId),
            escapeCSV(order.stripePaymentMethodType),
            escapeCSV(order.stripeCardBrand),
            escapeCSV(order.stripeCardLast4),
            escapeCSV(order.stripeCardFingerprint),
            escapeCSV(order.currency),
            order.registrationCount,
            escapeCSV(order.paymentProvider),
            escapeCSV(order.paymentStatus),
            escapeCSV(order.providerPaymentRef),
            escapeCSV(order.invoiceNumber),
            escapeCSV(order.createdAt),
            escapeCSV(order.updatedAt)
        ].join(','))

        const csv = [headers, ...rows].join('\n')
        
        // Build filename with date range info
        let filename = 'financial-export'
        if (startDate && endDate) {
            filename += `-${startDate}-to-${endDate}`
        } else if (startDate) {
            filename += `-from-${startDate}`
        } else if (endDate) {
            filename += `-until-${endDate}`
        } else {
            filename += `-all-time-${new Date().toISOString().split('T')[0]}`
        }
        filename += '.csv'

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
