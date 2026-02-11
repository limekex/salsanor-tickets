import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    console.log('[API /api/user/account] Auth user:', user?.id, user?.email)

    if (authError || !user) {
      console.error('[API /api/user/account] Auth error:', authError)
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const userAccount = await prisma.userAccount.findUnique({
      where: { supabaseUid: user.id },
      include: {
        UserAccountRole: {
          include: {
            Organizer: {
              select: {
                id: true,
                name: true,
                slug: true,
              }
            }
          }
        },
        PersonProfile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          }
        }
      }
    })

    console.log('[API /api/user/account] UserAccount found:', userAccount?.id)

    if (!userAccount) {
      console.error('[API /api/user/account] UserAccount not found for:', user.id)
      return NextResponse.json({ error: 'User account not found' }, { status: 404 })
    }

    return NextResponse.json(userAccount)
  } catch (error) {
    console.error('[API /api/user/account] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
