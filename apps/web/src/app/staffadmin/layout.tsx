import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { StaffAdminNav } from '@/components/staff-admin-nav'
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RegiNor Staff Admin",
  description: "RegiNor staff administration",
  icons: {
    icon: '/favicon.svg',
  },
};

export default async function StaffAdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    // Check if user has ORG_ADMIN role for at least one organization
    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: {
            roles: {
                include: {
                    organizer: true
                }
            }
        }
    })

    const hasOrgAdminRole = userAccount?.roles.some(r => r.role === 'ORG_ADMIN')
    
    if (!hasOrgAdminRole) {
        throw new Error('Unauthorized: Organization admin access required')
    }

    return (
        <html lang="en">
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
                suppressHydrationWarning
            >
                <div className="min-h-screen">
                    <StaffAdminNav />
                    <main className="container mx-auto py-6">
                        {children}
                    </main>
                </div>
                <Toaster position="top-right" richColors />
            </body>
        </html>
    )
}
