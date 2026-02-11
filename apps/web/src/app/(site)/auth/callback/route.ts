
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
    const { searchParams, origin, hash } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/'
    const type = searchParams.get('type')
    
    // Check for errors in query params or hash (Supabase sends errors as hash fragments)
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')
    
    if (error) {
        // Redirect to error page with error details
        const errorUrl = new URL('/auth/auth-code-error', origin)
        errorUrl.searchParams.set('error', error)
        if (errorDescription) {
            errorUrl.searchParams.set('error_description', errorDescription)
        }
        return NextResponse.redirect(errorUrl.toString())
    }

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            // If this is a password recovery/reset, redirect to update-password page
            if (type === 'recovery' || type === 'magiclink') {
                return NextResponse.redirect(`${origin}/auth/update-password`)
            }

            // Check if user needs onboarding
            const { data: { user } } = await supabase.auth.getUser()
            
            if (user) {
                // Wait a moment for trigger to fire
                await new Promise(resolve => setTimeout(resolve, 500))
                
                // Check if UserAccount was created, if not create it manually
                let userAccount = await prisma.userAccount.findUnique({
                    where: { supabaseUid: user.id },
                    select: { 
                        id: true,
                        PersonProfile: {
                            select: { id: true }
                        }
                    }
                })

                if (!userAccount) {
                    // Trigger didn't fire, create manually
                    userAccount = await prisma.userAccount.create({
                        data: {
                            supabaseUid: user.id,
                            email: user.email!
                        },
                        select: {
                            id: true,
                            PersonProfile: {
                                select: { id: true }
                            }
                        }
                    })
                }

                // If no person profile, redirect to onboarding
                if (!userAccount.PersonProfile) {
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
