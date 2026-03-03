import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getMyAttendanceForRegistration } from '@/app/actions/attendance-stats'

export async function GET(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const registrationId = searchParams.get('registrationId')

        if (!registrationId) {
            return NextResponse.json({ error: 'registrationId required' }, { status: 400 })
        }

        const stats = await getMyAttendanceForRegistration(registrationId, user.id)

        if (!stats) {
            return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 })
        }

        return NextResponse.json(stats)
    } catch (error) {
        console.error('Error fetching attendance:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
