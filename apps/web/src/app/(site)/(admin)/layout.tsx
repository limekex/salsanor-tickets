import { requireAdmin } from '@/utils/auth-admin'
import { AdminNav } from '@/components/admin-nav'
import { prisma } from '@/lib/db'
import { getAdminSelectedOrg, setAdminSelectedOrg, clearAdminSelectedOrg } from '@/utils/admin-org-context'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const userAccount = await requireAdmin()
    const isGlobalAdmin = userAccount.roles.some(r => r.role === 'ADMIN')
    
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
    )
}
