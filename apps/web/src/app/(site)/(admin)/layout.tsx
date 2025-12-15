
import { requireAdmin } from '@/utils/auth-admin'
import { AdminNav } from '@/components/admin-nav'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    await requireAdmin()

    return (
        <div className="min-h-screen flex flex-col">
            <AdminNav />
            <main className="flex-1 container mx-auto py-6 px-4">
                {children}
            </main>
        </div>
    )
}
