
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/'

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            // Check if user needs onboarding
            const { data: { user } } = await supabase.auth.getUser()
            
            if (user) {
                const userAccount = await prisma.userAccount.findUnique({
                    where: { supabaseUid: user.id },
                    select: { 
                        personProfile: {
                            select: { id: true }
                        }
                    }
                })

                // If no person profile, redirect to onboarding
                if (userAccount && !userAccount.personProfile) {
                    const forwardedHost = request.headers.get('x-forwarded-host')
                    const isLocalEnv = process.env.NODE_ENV === 'development'
                    
                    if (isLocalEnv) {
                        return NextResponse.redirect(`${origin}/onboarding`)
                    } else if (forwardedHost) {
                        return NextResponse.redirect(`https://${forwardedHost}/onboarding`)
                    } else {
                        return NextResponse.redirect(`${origin}/onboarding`)
                    }
                }
            }

            const forwardedHost = request.headers.get('x-forwarded-host')
            const isLocalEnv = process.env.NODE_ENV === 'development'
            if (isLocalEnv) {
                return NextResponse.redirect(`${origin}${next}`)
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${next}`)
            } else {
                return NextResponse.redirect(`${origin}${next}`)
            }
        }
    }

    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
