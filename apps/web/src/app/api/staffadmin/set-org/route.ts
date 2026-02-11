import { setStaffAdminSelectedOrg } from '@/utils/staff-admin-org-context'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const { organizerId } = await request.json()
        
        if (!organizerId) {
            return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
        }

        await setStaffAdminSelectedOrg(organizerId)
        
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error setting staff admin org:', error)
        return NextResponse.json(
            { error: 'Failed to set organization' },
            { status: 500 }
        )
    }
}
