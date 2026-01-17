'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Calendar, Settings, Users, LayoutDashboard, Percent, CreditCard, Home, Package, ClipboardList, Menu, Tag, CalendarDays } from 'lucide-react'
import { useState } from 'react'
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

const navItems = [
    { href: '/staffadmin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/staffadmin/users', label: 'Users', icon: Users },
    { href: '/staffadmin/registrations', label: 'Registrations', icon: ClipboardList },
    { href: '/staffadmin/orders', label: 'Orders', icon: Package },
]

const productItems = [
    { href: '/staffadmin/periods', label: 'Periods', icon: Calendar },
    { href: '/staffadmin/events', label: 'Events', icon: CalendarDays },
    { href: '/staffadmin/memberships', label: 'Memberships', icon: CreditCard },
    { href: '/staffadmin/discounts', label: 'Discounts', icon: Percent },
]

export function StaffAdminNav() {
    const pathname = usePathname()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    
    // Check if any product page is active
    const isProductsActive = productItems.some(item => 
        pathname === item.href || pathname.startsWith(item.href + '/')
    )

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
                    
                    {/* Desktop Navigation */}
                    <div className="hidden md:flex gap-rn-1 ml-auto">
                        {navItems.map((item) => {
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

                        {/* Products Dropdown */}
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
                                {productItems.map((item) => {
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

                        {/* Settings (Icon Only) */}
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
                                {/* Main Nav Items */}
                                {navItems.map((item) => {
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

                                {/* Products Section */}
                                <div className="mt-rn-4 pt-rn-4 border-t border-rn-border">
                                    <p className="rn-caption text-rn-text-muted px-rn-4 mb-rn-2">Products</p>
                                    {productItems.map((item) => {
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

                                {/* Settings */}
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
                </div>
            </div>
        </nav>
    )
}
