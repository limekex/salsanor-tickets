import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { requireAdmin } from '@/utils/auth-admin'
import { AdminNav } from '@/components/admin-nav'
import { prisma } from '@/lib/db'
import { getAdminSelectedOrg, setAdminSelectedOrg, clearAdminSelectedOrg } from '@/utils/admin-org-context'
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
  title: "RegiNor Admin",
  description: "RegiNor administration portal",
  icons: {
    icon: '/favicon.svg',
  },
};

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const userAccount = await requireAdmin()
    const isGlobalAdmin = userAccount?.UserAccountRole?.some(r => r.role === 'ADMIN') ?? false
    
    // Get all organizers for global admins
    const organizers = isGlobalAdmin ? await prisma.organizer.findMany({
        orderBy: { name: 'asc' },
        select: {
            id: true,
            name: true,
            slug: true,
        }
    }) : []
    
    const currentOrgId = await getAdminSelectedOrg()
    
    const handleOrgChange = async (orgId: string) => {
        'use server'
        if (orgId === 'none') {
            await clearAdminSelectedOrg()
        } else {
            await setAdminSelectedOrg(orgId)
        }
    }

    return (
        <html lang="en">
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
                suppressHydrationWarning
            >
                <div className="min-h-screen flex flex-col">
                    <AdminNav 
                        isGlobalAdmin={isGlobalAdmin}
                        organizers={organizers}
                        currentOrgId={currentOrgId}
                        onOrgChange={handleOrgChange}
                    />
                    <main className="flex-1 container mx-auto py-6 px-4">
                        {children}
                    </main>
                </div>
                <Toaster position="top-right" richColors />
            </body>
        </html>
    )
}
