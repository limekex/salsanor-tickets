'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Settings, LayoutDashboard, Home, Menu, Package, Users, Building2, Mail, CreditCard, Layers, FileText, UserCog } from 'lucide-react'
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
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

const navItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/orders', label: 'Orders', icon: Package },
]

const platformItems = [
    { href: '/admin/categories', label: 'Categories', icon: Layers, globalOnly: true },
    { href: '/admin/pdf-templates', label: 'PDF Templates', icon: FileText, globalOnly: true },
    { href: '/admin/periods', label: 'Periods', icon: null, requiresOrg: true },
]

const emailItems = [
    { href: '/admin/email', label: 'Email Settings', icon: Mail, globalOnly: true },
    { href: '/admin/email/templates', label: 'Email Templates', icon: FileText, globalOnly: true },
    { href: '/admin/email/logs', label: 'Email Logs', icon: FileText, globalOnly: true },
]

const paymentItems = [
    { href: '/admin/settings/payments', label: 'Payment Settings', icon: CreditCard },
]

const crmItems = [
    { href: '/admin/organizers', label: 'Organizers', icon: Building2, globalOnly: true },
    { href: '/admin/users', label: 'User Management', icon: UserCog },
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

    // Prevent hydration mismatch by only rendering interactive components after mount
    useEffect(() => {
        setMounted(true)
    }, [])

    // Filter items
    const filterItems = (items: any[]) => {
        return items.filter((item: any) => {
            if (item.globalOnly && !isGlobalAdmin) return false
            if (item.requiresOrg && !currentOrgId && isGlobalAdmin) return false
            return true
        })
    }

    const filteredPlatformItems = filterItems(platformItems)
    const filteredEmailItems = filterItems(emailItems)
    const filteredPaymentItems = filterItems(paymentItems)
    const filteredCrmItems = filterItems(crmItems)

    // Check if dropdown sections are active
    const isPlatformActive = filteredPlatformItems.some(item => 
        pathname === item.href || pathname.startsWith(item.href + '/')
    )
    const isEmailActive = filteredEmailItems.some(item => 
        pathname === item.href || pathname.startsWith(item.href + '/')
    )
    const isPaymentActive = filteredPaymentItems.some(item => 
        pathname === item.href || pathname.startsWith(item.href + '/')
    )
    const isCrmActive = filteredCrmItems.some(item => 
        pathname === item.href || pathname.startsWith(item.href + '/')
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
                    <div className="hidden md:flex gap-rn-1 ml-auto">
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

                        {/* Platform Settings Dropdown */}
                        {mounted && filteredPlatformItems.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger 
                                    className={cn(
                                        "flex items-center gap-rn-2 px-rn-4 py-2 rounded-rn-1 text-sm font-medium transition-colors",
                                        isPlatformActive
                                            ? "bg-rn-primary text-white"
                                            : "text-rn-text-muted hover:bg-rn-surface-2 hover:text-rn-text"
                                    )}
                                >
                                    <Settings className="h-4 w-4" />
                                    Platform
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Platform Settings</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {filteredPlatformItems.map((item) => {
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
                                                    {Icon && <Icon className="h-4 w-4" />}
                                                    {item.label}
                                                </Link>
                                            </DropdownMenuItem>
                                        )
                                    })}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}

                        {/* Email Dropdown */}
                        {mounted && filteredEmailItems.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger 
                                    className={cn(
                                        "flex items-center gap-rn-2 px-rn-4 py-2 rounded-rn-1 text-sm font-medium transition-colors",
                                        isEmailActive
                                            ? "bg-rn-primary text-white"
                                            : "text-rn-text-muted hover:bg-rn-surface-2 hover:text-rn-text"
                                    )}
                                >
                                    <Mail className="h-4 w-4" />
                                    Email
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Email Management</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {filteredEmailItems.map((item) => {
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

                        {/* Payments Dropdown */}
                        {mounted && filteredPaymentItems.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger 
                                    className={cn(
                                        "flex items-center gap-rn-2 px-rn-4 py-2 rounded-rn-1 text-sm font-medium transition-colors",
                                        isPaymentActive
                                            ? "bg-rn-primary text-white"
                                            : "text-rn-text-muted hover:bg-rn-surface-2 hover:text-rn-text"
                                    )}
                                >
                                    <CreditCard className="h-4 w-4" />
                                    Payments
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Payment Management</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {filteredPaymentItems.map((item) => {
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

                        {/* CRM Dropdown */}
                        {mounted && filteredCrmItems.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger 
                                    className={cn(
                                        "flex items-center gap-rn-2 px-rn-4 py-2 rounded-rn-1 text-sm font-medium transition-colors",
                                        isCrmActive
                                            ? "bg-rn-primary text-white"
                                            : "text-rn-text-muted hover:bg-rn-surface-2 hover:text-rn-text"
                                    )}
                                >
                                    <Users className="h-4 w-4" />
                                    CRM
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Customer Management</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {filteredCrmItems.map((item) => {
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
                                    <SheetTitle>Admin Menu</SheetTitle>
                                </SheetHeader>
                                <div className="flex flex-col gap-rn-2 mt-rn-6">
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

                                    {/* Platform Settings Section */}
                                    {filteredPlatformItems.length > 0 && (
                                        <div className="mt-rn-4 pt-rn-4 border-t border-rn-border">
                                            <p className="rn-caption text-rn-text-muted px-rn-4 mb-rn-2">Platform Settings</p>
                                            {filteredPlatformItems.map((item) => {
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
                                                        {Icon && <Icon className="h-5 w-5" />}
                                                        {item.label}
                                                    </Link>
                                                )
                                            })}
                                        </div>
                                    )}

                                    {/* Email Section */}
                                    {filteredEmailItems.length > 0 && (
                                        <div className="mt-rn-4 pt-rn-4 border-t border-rn-border">
                                            <p className="rn-caption text-rn-text-muted px-rn-4 mb-rn-2">Email Management</p>
                                            {filteredEmailItems.map((item) => {
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

                                    {/* Payments Section */}
                                    {filteredPaymentItems.length > 0 && (
                                        <div className="mt-rn-4 pt-rn-4 border-t border-rn-border">
                                            <p className="rn-caption text-rn-text-muted px-rn-4 mb-rn-2">Payment Management</p>
                                            {filteredPaymentItems.map((item) => {
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

                                    {/* CRM Section */}
                                    {filteredCrmItems.length > 0 && (
                                        <div className="mt-rn-4 pt-rn-4 border-t border-rn-border">
                                            <p className="rn-caption text-rn-text-muted px-rn-4 mb-rn-2">Customer Management</p>
                                            {filteredCrmItems.map((item) => {
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
