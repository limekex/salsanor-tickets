import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { StaffAdminNav } from '@/components/staff-admin-nav'
import { StaffAdminFooter } from '@/components/staff-admin-footer'
import { OrgAutoSelector } from '@/components/org-auto-selector'
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

    // Define all elevated roles that can access staffadmin
    const ELEVATED_ROLES = ['ORG_ADMIN', 'ORG_FINANCE', 'ORG_CHECKIN', 'INSTRUCTOR', 'STAFF', 'CHECKIN', 'ADMIN']
    
    // Check if user has any elevated role for at least one organization
    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: {
            UserAccountRole: {
                where: {
                    role: { in: ELEVATED_ROLES }
                },
                include: {
                    Organizer: true
                }
            }
        }
    })

    const hasStaffRole = userAccount?.UserAccountRole && userAccount.UserAccountRole.length > 0
    
    if (!hasStaffRole) {
        throw new Error('Unauthorized: Staff access required')
    }

    // Get list of organizations user has access to (only from ORG_ADMIN/ORG_FINANCE roles for org selector)
    const organizers = userAccount.UserAccountRole
        .filter(r => r.Organizer && (r.role === 'ORG_ADMIN' || r.role === 'ORG_FINANCE'))
        .map(r => ({
            id: r.Organizer!.id,
            name: r.Organizer!.name,
            slug: r.Organizer!.slug
        }))
        // Remove duplicates
        .filter((org, index, self) => 
            index === self.findIndex(o => o.id === org.id)
        )

    // Get current organization from cookie (don't set it here)
    let currentOrgId = await getStaffAdminSelectedOrg()
    
    // Validate that selected org is in user's orgs
    if (currentOrgId && !organizers.some(org => org.id === currentOrgId)) {
        currentOrgId = null
    }
    
    // If no org selected and only one org available, use it as default
    // Otherwise, let the user select from the dropdown
    if (!currentOrgId && organizers.length === 1) {
        currentOrgId = organizers[0].id
    }

    return (
        <html lang="en">
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
                suppressHydrationWarning
            >
                <div className="min-h-screen flex flex-col">
                    <StaffAdminNav 
                        organizers={organizers}
                        currentOrgId={currentOrgId}
                        onOrgChange={handleOrgChange}
                    />
                    <OrgAutoSelector 
                        currentOrgId={currentOrgId}
                        organizers={organizers}
                        onOrgChange={handleOrgChange}
                    />
                    <main className="container mx-auto py-6 flex-1">
                        {children}
                    </main>
                    <StaffAdminFooter />
                </div>
                <Toaster position="top-right" richColors />
            </body>
        </html>
    )
}
