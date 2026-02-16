'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Calendar, Settings, Users, LayoutDashboard, Percent, CreditCard, Home, Package, ClipboardList, Menu, Tag, CalendarDays, Coins, Download, FileText } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useOrganizerAccess } from '@/hooks/use-organizer-access'
import { OrgSelector } from './org-selector'

const navItems = [
    { href: '/staffadmin', label: 'Dashboard', icon: LayoutDashboard, roles: ['ORG_ADMIN', 'ORG_FINANCE'] },
    { href: '/staffadmin/users', label: 'Users', icon: Users, roles: ['ORG_ADMIN'] },
    { href: '/staffadmin/registrations', label: 'Registrations', icon: ClipboardList, roles: ['ORG_ADMIN'] },
]

const financeItems = [
    { href: '/staffadmin/finance', label: 'Finance Dashboard', icon: LayoutDashboard, roles: ['ORG_ADMIN', 'ORG_FINANCE'] },
    { href: '/staffadmin/finance/revenue', label: 'Revenue Reports', icon: Tag, roles: ['ORG_ADMIN', 'ORG_FINANCE'] },
    { href: '/staffadmin/finance/payments', label: 'Payment Status', icon: CreditCard, roles: ['ORG_ADMIN', 'ORG_FINANCE'] },
    { href: '/staffadmin/finance/registrations', label: 'Registrations', icon: ClipboardList, roles: ['ORG_ADMIN', 'ORG_FINANCE'] },
    { href: '/staffadmin/finance/invoices', label: 'Invoices', icon: FileText, roles: ['ORG_ADMIN', 'ORG_FINANCE'] },
    { href: '/staffadmin/finance/export', label: 'Export Data', icon: Download, roles: ['ORG_ADMIN', 'ORG_FINANCE'] },
    { href: '/staffadmin/orders', label: 'Orders', icon: Package, roles: ['ORG_ADMIN'] },
]

const productItems = [
    { href: '/staffadmin/periods', label: 'Periods', icon: Calendar, roles: ['ORG_ADMIN'] },
    { href: '/staffadmin/events', label: 'Events', icon: CalendarDays, roles: ['ORG_ADMIN'] },
    { href: '/staffadmin/memberships', label: 'Memberships', icon: CreditCard, roles: ['ORG_ADMIN'] },
    { href: '/staffadmin/discounts', label: 'Discounts', icon: Percent, roles: ['ORG_ADMIN'] },
]

interface StaffAdminNavProps {
    organizers: Array<{
        id: string
        name: string
        slug: string
    }>
    currentOrgId: string | null
    onOrgChange: (orgId: string) => Promise<void>
}

export function StaffAdminNav({ organizers, currentOrgId, onOrgChange }: StaffAdminNavProps) {
    const pathname = usePathname()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const { roles } = useOrganizerAccess()
    
    // Prevent hydration mismatch
    useEffect(() => {
        setMounted(true)
    }, [])
    
    // Filter nav items based on user's roles
    const visibleNavItems = navItems.filter(item => 
        item.roles.some(role => roles.includes(role))
    )
    
    const visibleFinanceItems = financeItems.filter(item =>
        item.roles.some(role => roles.includes(role))
    )
    
    const visibleProductItems = productItems.filter(item =>
        item.roles.some(role => roles.includes(role))
    )
    
    // Check if any product page is active
    const isProductsActive = visibleProductItems.some(item => 
        pathname === item.href || pathname.startsWith(item.href + '/')
    )
    
    // Check if any finance page is active
    const isFinanceActive = visibleFinanceItems.some(item => 
        pathname === item.href || pathname.startsWith(item.href + '/')
    )
    
    // Check if user has access to settings (ORG_ADMIN only)
    const hasSettingsAccess = roles.includes('ORG_ADMIN')

    return (
        <nav className="border-b border-rn-border bg-rn-surface sticky top-0 z-50">
            <div className="container mx-auto px-rn-4">
                <div className="flex h-16 items-center justify-between gap-rn-4">
                    <Link href="/staffadmin" className="shrink-0">
                        <Image 
                            src="/logo-dark.svg" 
                            alt="RegiNor Staff Admin" 
                            width={140} 
                            height={32}
                            priority
                        />
                    </Link>
                    
                    {/* Organization Selector - Hidden on mobile */}
                    {mounted && organizers.length > 1 && (
                        <div className="hidden md:block">
                            <OrgSelector 
                                organizers={organizers}
                                currentOrgId={currentOrgId}
                                onOrgChange={onOrgChange}
                            />
                        </div>
                    )}
                    
                    {/* Desktop Navigation */}
                    <div className="hidden md:flex gap-rn-1 ml-auto">
                        {visibleNavItems.map((item) => {
                            const Icon = item.icon
                            const isActive = pathname === item.href ||
                                (item.href !== '/staffadmin' && pathname.startsWith(item.href))

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

                        {/* Finance Dropdown - only show if there are visible finance items */}
                        {mounted && visibleFinanceItems.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger 
                                    className={cn(
                                        "flex items-center gap-rn-2 px-rn-4 py-2 rounded-rn-1 text-sm font-medium transition-colors",
                                        isFinanceActive
                                            ? "bg-rn-primary text-white"
                                            : "text-rn-text-muted hover:bg-rn-surface-2 hover:text-rn-text"
                                    )}
                                >
                                    <Coins className="h-4 w-4" />
                                    Finance
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {visibleFinanceItems.map((item) => {
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
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}

                        {/* Products Dropdown - only show if there are visible product items */}
                        {mounted && visibleProductItems.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger 
                                    className={cn(
                                        "flex items-center gap-rn-2 px-rn-4 py-2 rounded-rn-1 text-sm font-medium transition-colors",
                                        isProductsActive
                                            ? "bg-rn-primary text-white"
                                            : "text-rn-text-muted hover:bg-rn-surface-2 hover:text-rn-text"
                                    )}
                                >
                                    <Package className="h-4 w-4" />
                                    Products
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {visibleProductItems.map((item) => {
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
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}

                        {/* Settings (Icon Only) - only for ORG_ADMIN */}
                        {hasSettingsAccess && (
                            <Link
                                href="/staffadmin/settings"
                                className={cn(
                                    "flex items-center justify-center p-2 rounded-rn-1 text-sm font-medium transition-colors",
                                    pathname === '/staffadmin/settings' || pathname.startsWith('/staffadmin/settings/')
                                        ? "bg-rn-primary text-white"
                                        : "text-rn-text-muted hover:bg-rn-surface-2 hover:text-rn-text"
                                )}
                                title="Settings"
                            >
                                <Settings className="h-4 w-4" />
                            </Link>
                        )}

                        {/* Back to Site (Icon Only) */}
                        <Link
                            href="/"
                            className={cn(
                                "flex items-center justify-center p-2 rounded-rn-1 text-sm font-medium transition-colors text-rn-text-muted hover:bg-rn-surface-2 hover:text-rn-text"
                            )}
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
                                    <SheetTitle>Staff Admin Menu</SheetTitle>
                                </SheetHeader>
                                <div className="flex flex-col gap-rn-2 mt-rn-6">
                                    {/* Organization Selector on Mobile */}
                                    {organizers.length > 1 && (
                                        <div className="mb-rn-4 pb-rn-4 border-b border-rn-border">
                                            <OrgSelector 
                                                organizers={organizers}
                                                currentOrgId={currentOrgId}
                                                onOrgChange={onOrgChange}
                                            />
                                        </div>
                                    )}

                                    {/* Main Nav Items */}
                                    {visibleNavItems.map((item) => {
                                        const Icon = item.icon
                                        const isActive = pathname === item.href ||
                                            (item.href !== '/staffadmin' && pathname.startsWith(item.href))

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

                                    {/* Finance Section - only show if there are visible finance items */}
                                    {visibleFinanceItems.length > 0 && (
                                        <div className="mt-rn-4 pt-rn-4 border-t border-rn-border">
                                            <p className="rn-caption text-rn-text-muted px-rn-4 mb-rn-2">Finance</p>
                                            {visibleFinanceItems.map((item) => {
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
                                    )}

                                    {/* Products Section - only show if there are visible product items */}
                                    {visibleProductItems.length > 0 && (
                                        <div className="mt-rn-4 pt-rn-4 border-t border-rn-border">
                                            <p className="rn-caption text-rn-text-muted px-rn-4 mb-rn-2">Products</p>
                                            {visibleProductItems.map((item) => {
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
                                    )}

                                    {/* Settings - only for ORG_ADMIN */}
                                    {hasSettingsAccess && (
                                        <Link
                                            href="/staffadmin/settings"
                                            onClick={() => setMobileMenuOpen(false)}
                                            className={cn(
                                                "flex items-center gap-rn-3 px-rn-4 py-rn-3 rounded-rn-1 text-sm transition-colors mt-rn-4 border-t border-rn-border pt-rn-4",
                                                pathname === '/staffadmin/settings' || pathname.startsWith('/staffadmin/settings/')
                                                    ? "bg-rn-primary text-white"
                                                    : "text-rn-text hover:bg-rn-surface-2"
                                            )}
                                        >
                                            <Settings className="h-5 w-5" />
                                            Settings
                                        </Link>
                                    )}

                                    {/* Back to Site */}
                                    <Link
                                        href="/"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center gap-rn-3 px-rn-4 py-rn-3 rounded-rn-1 text-sm text-rn-text hover:bg-rn-surface-2"
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
