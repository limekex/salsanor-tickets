'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Calendar, Settings, Users, LayoutDashboard, UserCog } from 'lucide-react'
import { OrgSelector } from './org-selector'

const navItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/organizers', label: 'Organizers', icon: Users },
    { href: '/admin/users', label: 'User Management', icon: UserCog },
    { href: '/admin/periods', label: 'Periods', icon: Calendar },
    { href: '/admin/settings/payments', label: 'Settings', icon: Settings },
]

interface AdminNavProps {
    isGlobalAdmin: boolean
    organizers: Array<{
        id: string
        name: string
        slug: string
    }>
    currentOrgId: string | null
    onOrgChange: (orgId: string) => Promise<void>
}

export function AdminNav({ isGlobalAdmin, organizers, currentOrgId, onOrgChange }: AdminNavProps) {
    const pathname = usePathname()

    // Filter nav items based on whether an org is selected
    const filteredNavItems = navItems.filter(item => {
        // Always show Dashboard
        if (item.href === '/admin') return true
        
        // Show Organizers only for global admins
        if (item.href === '/admin/organizers') return isGlobalAdmin
        
        // Show User Management for all admins (filtered on the page level)
        if (item.href === '/admin/users') return true
        
        // Show Periods only when an org is selected OR user is not global admin
        if (item.href === '/admin/periods') return currentOrgId !== null || !isGlobalAdmin
        
        // Show Settings for all admins
        if (item.href === '/admin/settings/payments') return true
        
        return true
    })

    return (
        <nav className="border-b bg-background">
            <div className="container mx-auto px-4">
                <div className="flex h-16 items-center gap-6">
                    <Link href="/admin" className="font-bold text-lg">
                        SalsaNor Admin
                    </Link>
                    
                    {/* Organization Selector - Only for Global Admins */}
                    {isGlobalAdmin && organizers.length > 0 && (
                        <OrgSelector 
                            organizers={organizers}
                            currentOrgId={currentOrgId}
                            onOrgChange={onOrgChange}
                        />
                    )}
                    
                    <div className="flex gap-1 ml-auto">
                        {filteredNavItems.map((item) => {
                            const Icon = item.icon
                            const isActive = pathname === item.href ||
                                (item.href !== '/admin' && pathname.startsWith(item.href))

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-primary text-primary-foreground"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    {item.label}
                                </Link>
                            )
                        })}
                    </div>
                    <Link
                        href="/"
                        className="text-sm text-muted-foreground hover:text-foreground"
                    >
                        ← Back to Site
                    </Link>
                </div>
            </div>
        </nav>
    )
}
