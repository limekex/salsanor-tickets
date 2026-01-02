import { exportFinancialData } from '@/app/actions/finance'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const format = (searchParams.get('format') || 'csv') as 'csv' | 'json'

    try {
        const result = await exportFinancialData(format)

        if (format === 'json') {
            return NextResponse.json(result.data, {
                headers: {
                    'Content-Disposition': `attachment; filename="${result.filename}"`,
                    'Content-Type': 'application/json'
                }
            })
        }

        return new NextResponse(result.data as string, {
            headers: {
                'Content-Disposition': `attachment; filename="${result.filename}"`,
                'Content-Type': result.mimeType || 'text/csv'
            }
        })
    } catch (error) {
        console.error('Export error:', error)
        return NextResponse.json(
            { error: 'Failed to export financial data' },
            { status: 500 }
        )
    }
}
