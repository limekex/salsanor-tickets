'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Calendar, Settings, Users, LayoutDashboard } from 'lucide-react'

const navItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/organizers', label: 'Organizers', icon: Users },
    { href: '/admin/periods', label: 'Periods', icon: Calendar },
    { href: '/admin/settings/payments', label: 'Settings', icon: Settings },
]

export function AdminNav() {
    const pathname = usePathname()

    return (
        <nav className="border-b bg-background">
            <div className="container mx-auto px-4">
                <div className="flex h-16 items-center gap-6">
                    <Link href="/admin" className="font-bold text-lg">
                        SalsaNor Admin
                    </Link>
                    <div className="flex gap-1 ml-auto">
                        {navItems.map((item) => {
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
