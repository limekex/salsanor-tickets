import '@/app/globals.css'
import { Geist, Geist_Mono } from "next/font/google"
import Image from 'next/image'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: "RegiNor Check-in",
    description: "Check-in system for events and courses",
    icons: {
        icon: '/favicon.svg',
    },
}

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export default async function CheckinLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Require ADMIN, ORG_ADMIN, or ORG_CHECKIN access
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: {
            UserAccountRole: {
                where: {
                    OR: [
                        { role: 'ADMIN' },
                        { role: 'ORG_ADMIN' },
                        { role: 'ORG_CHECKIN' }
                    ]
                }
            }
        }
    })

    if (!userAccount || userAccount.UserAccountRole.length === 0) {
        throw new Error('Unauthorized: Checkin access required')
    }

    return (
        <html lang="en" className="dark" suppressHydrationWarning>
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-slate-50`} suppressHydrationWarning>
                <div className="min-h-screen flex flex-col">
                    <header className="p-4 bg-slate-900 border-b border-slate-800 flex justify-center">
                        <Image 
                            src="/logo-light.svg" 
                            alt="RegiNor Check-in" 
                            width={160} 
                            height={36}
                            priority
                        />
                    </header>
                    <main className="flex-1 flex flex-col">
                        {children}
                    </main>
                </div>
            </body>
        </html>
    )
}
