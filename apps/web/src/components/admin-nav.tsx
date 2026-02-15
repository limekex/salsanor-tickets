'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
    Settings, 
    LayoutDashboard, 
    Home, 
    Menu, 
    Package, 
    Building2, 
    Mail, 
    CreditCard, 
    Layers, 
    FileText, 
    UserCog, 
    Wallet,
    Calendar,
    ChevronDown
} from 'lucide-react'
import { OrgSelector } from './org-selector'
import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

// Main navigation items - always visible
const navItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/orders', label: 'Orders', icon: Package },
    { href: '/admin/finance', label: 'Finance', icon: Wallet },
]

// Settings dropdown - grouped by category
const settingsGroups = [
    {
        label: 'Organization',
        items: [
            { href: '/admin/organizers', label: 'Organizers', icon: Building2, globalOnly: true },
            { href: '/admin/users', label: 'Users', icon: UserCog },
        ]
    },
    {
        label: 'Payments',
        items: [
            { href: '/admin/settings/payments', label: 'Payment Config', icon: CreditCard },
        ]
    },
    {
        label: 'Content',
        items: [
            { href: '/admin/categories', label: 'Categories', icon: Layers, globalOnly: true },
            { href: '/admin/pdf-templates', label: 'PDF Templates', icon: FileText, globalOnly: true },
            { href: '/admin/periods', label: 'Periods', icon: Calendar, requiresOrg: true },
        ]
    },
    {
        label: 'Email',
        items: [
            { href: '/admin/email', label: 'Settings', icon: Mail, globalOnly: true },
            { href: '/admin/email/templates', label: 'Templates', icon: FileText, globalOnly: true },
            { href: '/admin/email/logs', label: 'Logs', icon: FileText, globalOnly: true },
        ]
    },
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
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Filter items based on permissions
    const filterItem = (item: { globalOnly?: boolean; requiresOrg?: boolean }) => {
        if (item.globalOnly && !isGlobalAdmin) return false
        if (item.requiresOrg && !currentOrgId && isGlobalAdmin) return false
        return true
    }

    // Get filtered settings groups (only groups with visible items)
    const filteredSettingsGroups = settingsGroups
        .map(group => ({
            ...group,
            items: group.items.filter(filterItem)
        }))
        .filter(group => group.items.length > 0)

    // Check if any settings item is active
    const isSettingsActive = filteredSettingsGroups.some(group =>
        group.items.some(item => 
            pathname === item.href || pathname.startsWith(item.href + '/')
        )
    )

    return (
        <nav className="border-b border-rn-border bg-rn-surface sticky top-0 z-50">
            <div className="container mx-auto px-rn-4">
                <div className="flex h-16 items-center justify-between gap-rn-4">
                    <Link href="/admin" className="shrink-0">
                        <Image 
                            src="/logo-dark.svg" 
                            alt="RegiNor Admin" 
                            width={140} 
                            height={32}
                            priority
                        />
                    </Link>
                    
                    {/* Organization Selector - Hidden on mobile if global admin */}
                    {mounted && isGlobalAdmin && organizers.length > 0 && (
                        <div className="hidden md:block">
                            <OrgSelector 
                                organizers={organizers}
                                currentOrgId={currentOrgId}
                                onOrgChange={onOrgChange}
                            />
                        </div>
                    )}
                    
                    {/* Desktop Navigation */}
                    <div className="hidden md:flex gap-rn-1 ml-auto items-center">
                        {/* Main Nav Items */}
                        {navItems.map((item) => {
                            const Icon = item.icon
                            const isActive = pathname === item.href ||
                                (item.href !== '/admin' && pathname.startsWith(item.href))

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-rn-2 px-rn-4 py-2 rounded-rn-1 text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-rn-primary text-white"
                                            : "text-rn-text-muted hover:bg-rn-surface-2 hover:text-rn-text"
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    {item.label}
                                </Link>
                            )
                        })}

                        {/* Settings Dropdown */}
                        {mounted && filteredSettingsGroups.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger 
                                    className={cn(
                                        "flex items-center gap-rn-2 px-rn-4 py-2 rounded-rn-1 text-sm font-medium transition-colors",
                                        isSettingsActive
                                            ? "bg-rn-primary text-white"
                                            : "text-rn-text-muted hover:bg-rn-surface-2 hover:text-rn-text"
                                    )}
                                >
                                    <Settings className="h-4 w-4" />
                                    Settings
                                    <ChevronDown className="h-3 w-3 ml-1" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    {filteredSettingsGroups.map((group, groupIndex) => (
                                        <DropdownMenuGroup key={group.label}>
                                            {groupIndex > 0 && <DropdownMenuSeparator />}
                                            <DropdownMenuLabel className="text-xs text-rn-text-muted">
                                                {group.label}
                                            </DropdownMenuLabel>
                                            {group.items.map((item) => {
                                                const Icon = item.icon
                                                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                                                return (
                                                    <DropdownMenuItem key={item.href} asChild>
                                                        <Link
                                                            href={item.href}
                                                            className={cn(
                                                                "flex items-center gap-rn-2 cursor-pointer",
                                                                isActive && "bg-rn-surface-2"
                                                            )}
                                                        >
                                                            <Icon className="h-4 w-4" />
                                                            {item.label}
                                                        </Link>
                                                    </DropdownMenuItem>
                                                )
                                            })}
                                        </DropdownMenuGroup>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}

                        {/* Back to Site */}
                        <Link
                            href="/"
                            className="flex items-center justify-center p-2 rounded-rn-1 text-sm font-medium transition-colors text-rn-text-muted hover:bg-rn-surface-2 hover:text-rn-text ml-rn-2"
                            title="Back to Site"
                        >
                            <Home className="h-4 w-4" />
                        </Link>
                    </div>

                    {/* Mobile Menu Button */}
                    {mounted && (
                        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                            <SheetTrigger asChild className="md:hidden">
                                <Button variant="ghost" size="icon">
                                    <Menu className="h-5 w-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-[280px]">
                                <SheetHeader>
                                    <SheetTitle>Admin Menu</SheetTitle>
                                </SheetHeader>
                                <div className="flex flex-col gap-rn-1 mt-rn-6">
                                    {/* Organization Selector on Mobile */}
                                    {isGlobalAdmin && organizers.length > 0 && (
                                        <div className="mb-rn-4 pb-rn-4 border-b border-rn-border">
                                            <OrgSelector 
                                                organizers={organizers}
                                                currentOrgId={currentOrgId}
                                                onOrgChange={onOrgChange}
                                            />
                                        </div>
                                    )}

                                    {/* Main Nav Items */}
                                    {navItems.map((item) => {
                                        const Icon = item.icon
                                        const isActive = pathname === item.href ||
                                            (item.href !== '/admin' && pathname.startsWith(item.href))

                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={() => setMobileMenuOpen(false)}
                                                className={cn(
                                                    "flex items-center gap-rn-3 px-rn-4 py-rn-3 rounded-rn-1 text-sm font-medium transition-colors",
                                                    isActive
                                                        ? "bg-rn-primary text-white"
                                                        : "text-rn-text hover:bg-rn-surface-2"
                                                )}
                                            >
                                                <Icon className="h-5 w-5" />
                                                {item.label}
                                            </Link>
                                        )
                                    })}

                                    {/* Settings Groups */}
                                    {filteredSettingsGroups.map((group) => (
                                        <div key={group.label} className="mt-rn-4 pt-rn-4 border-t border-rn-border">
                                            <p className="rn-caption text-rn-text-muted px-rn-4 mb-rn-2">
                                                {group.label}
                                            </p>
                                            {group.items.map((item) => {
                                                const Icon = item.icon
                                                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                                                return (
                                                    <Link
                                                        key={item.href}
                                                        href={item.href}
                                                        onClick={() => setMobileMenuOpen(false)}
                                                        className={cn(
                                                            "flex items-center gap-rn-3 px-rn-4 py-rn-3 rounded-rn-1 text-sm transition-colors",
                                                            isActive
                                                                ? "bg-rn-primary text-white"
                                                                : "text-rn-text hover:bg-rn-surface-2"
                                                        )}
                                                    >
                                                        <Icon className="h-5 w-5" />
                                                        {item.label}
                                                    </Link>
                                                )
                                            })}
                                        </div>
                                    ))}

                                    {/* Back to Site */}
                                    <Link
                                        href="/"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center gap-rn-3 px-rn-4 py-rn-3 rounded-rn-1 text-sm text-rn-text hover:bg-rn-surface-2 mt-rn-4 border-t border-rn-border pt-rn-4"
                                    >
                                        <Home className="h-5 w-5" />
                                        Back to Site
                                    </Link>
                                </div>
                            </SheetContent>
                        </Sheet>
                    )}
                </div>
            </div>
        </nav>
    )
}
