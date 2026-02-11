import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { StaffAdminNav } from '@/components/staff-admin-nav'
import { Toaster } from "sonner";
import { getStaffAdminSelectedOrg, setStaffAdminSelectedOrg } from '@/utils/staff-admin-org-context'

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

async function handleOrgChange(orgId: string) {
    'use server'
    await setStaffAdminSelectedOrg(orgId)
}

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

    // Check if user has ORG_ADMIN or ORG_FINANCE role for at least one organization
    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: {
            UserAccountRole: {
                where: {
                    OR: [
                        { role: 'ORG_ADMIN' },
                        { role: 'ORG_FINANCE' }
                    ]
                },
                include: {
                    Organizer: true
                }
            }
        }
    })

    const hasStaffRole = userAccount?.UserAccountRole && userAccount.UserAccountRole.length > 0
    
    if (!hasStaffRole) {
        throw new Error('Unauthorized: Organization admin or finance access required')
    }

    // Get list of organizations user has access to
    const organizers = userAccount.UserAccountRole
        .filter(r => r.Organizer)
        .map(r => ({
            id: r.Organizer!.id,
            name: r.Organizer!.name,
            slug: r.Organizer!.slug
        }))
        // Remove duplicates
        .filter((org, index, self) => 
            index === self.findIndex(o => o.id === org.id)
        )

    // Get or set current organization
    let currentOrgId = await getStaffAdminSelectedOrg()
    
    // If no org selected or selected org not in user's orgs, use first org
    if (!currentOrgId || !organizers.some(org => org.id === currentOrgId)) {
        if (organizers.length > 0) {
            currentOrgId = organizers[0].id
            await setStaffAdminSelectedOrg(currentOrgId)
        }
    }

    return (
        <html lang="en">
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
                suppressHydrationWarning
            >
                <div className="min-h-screen">
                    <StaffAdminNav 
                        organizers={organizers}
                        currentOrgId={currentOrgId}
                        onOrgChange={handleOrgChange}
                    />
                    <main className="container mx-auto py-6">
                        {children}
                    </main>
                </div>
                <Toaster position="top-right" richColors />
            </body>
        </html>
    )
}
