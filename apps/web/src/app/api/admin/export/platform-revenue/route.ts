import { getPlatformRevenueReport } from '@/app/actions/admin-finance'
import { NextRequest, NextResponse } from 'next/server'
import { escapeCSV } from '@/lib/csv-utils'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const format = (searchParams.get('format') || 'csv') as 'csv' | 'json'
    const from = searchParams.get('from') || undefined
    const to = searchParams.get('to') || undefined

    try {
        const data = await getPlatformRevenueReport({ from, to })

        if (format === 'json') {
            return NextResponse.json(data, {
                headers: {
                    'Content-Disposition': `attachment; filename="platform-revenue-${new Date().toISOString().split('T')[0]}.json"`,
                    'Content-Type': 'application/json'
                }
            })
        }

        // Generate CSV
        const rows: string[] = []
        
        // Summary section
        rows.push('PLATFORM REVENUE SUMMARY')
        rows.push(`Total Gross Transactions,${data.summary.totalGrossTransactions / 100}`)
        rows.push(`Total Platform Revenue,${data.summary.totalPlatformRevenue / 100}`)
        rows.push(`Confirmed Revenue,${data.summary.confirmedPlatformRevenue / 100}`)
        rows.push(`Estimated Revenue,${data.summary.estimatedPlatformRevenue / 100}`)
        rows.push(`Total Transactions,${data.summary.totalTransactions}`)
        rows.push(`Effective Fee %,${data.summary.effectiveFeePercent.toFixed(2)}`)
        rows.push(`Data Quality %,${data.summary.dataQuality}`)
        rows.push('')
        
        // By Organizer section
        rows.push('REVENUE BY ORGANIZER')
        rows.push('Organizer,Slug,Transaction Volume (NOK),Platform Revenue (NOK),Confirmed (NOK),Estimated (NOK),Transactions,Effective Rate %')
        for (const org of data.byOrganizer) {
            rows.push([
                escapeCSV(org.organizerName),
                escapeCSV(org.organizerSlug),
                (org.transactionVolume / 100).toFixed(2),
                (org.platformRevenue / 100).toFixed(2),
                (org.confirmedRevenue / 100).toFixed(2),
                (org.estimatedRevenue / 100).toFixed(2),
                org.transactionCount,
                org.effectiveFeePercent.toFixed(2)
            ].join(','))
        }
        rows.push('')
        
        // By Month section
        rows.push('REVENUE BY MONTH')
        rows.push('Month,Transaction Volume (NOK),Platform Revenue (NOK),Transactions')
        for (const month of data.byMonth) {
            rows.push([
                month.month,
                (month.transactionVolume / 100).toFixed(2),
                (month.platformRevenue / 100).toFixed(2),
                month.transactionCount
            ].join(','))
        }

        const csv = rows.join('\n')

        return new NextResponse(csv, {
            headers: {
                'Content-Disposition': `attachment; filename="platform-revenue-${new Date().toISOString().split('T')[0]}.csv"`,
                'Content-Type': 'text/csv; charset=utf-8'
            }
        })
    } catch (error) {
        console.error('Export error:', error)
        return NextResponse.json(
            { error: 'Failed to export platform revenue data' },
            { status: 500 }
        )
    }
}
