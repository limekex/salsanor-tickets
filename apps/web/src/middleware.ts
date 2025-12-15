
import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
    const supabaseResponse = await updateSession(request)
    
    // Check if user needs onboarding (only for authenticated users)
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    // No-op in middleware
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    
    // If user is authenticated and not on onboarding page, check if they need onboarding
    if (user && !request.nextUrl.pathname.startsWith('/onboarding') && !request.nextUrl.pathname.startsWith('/auth')) {
        // Import prisma dynamically to avoid issues in Edge runtime
        const { prisma } = await import('@/lib/db')
        
        const userAccount = await prisma.userAccount.findUnique({
            where: { supabaseUid: user.id },
            select: { 
                id: true,
                personProfile: {
                    select: { id: true }
                }
            }
        })

        // If no person profile, redirect to onboarding
        if (userAccount && !userAccount.personProfile) {
            return NextResponse.redirect(new URL('/onboarding', request.url))
        }
    }

    // If user is on onboarding but already has profile, redirect to home
    if (user && request.nextUrl.pathname.startsWith('/onboarding')) {
        const { prisma } = await import('@/lib/db')
        
        const userAccount = await prisma.userAccount.findUnique({
            where: { supabaseUid: user.id },
            select: { 
                personProfile: {
                    select: { id: true }
                }
            }
        })

        if (userAccount?.personProfile) {
            return NextResponse.redirect(new URL('/', request.url))
        }
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
