'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from './ui/button'
import { Menu, ShoppingCart } from 'lucide-react'
import { useState, useTransition } from 'react'
import { useCart } from '@/hooks/use-cart'
import { useRouter } from 'next/navigation'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Badge } from './ui/badge'

type PublicNavProps = {
  user: { id: string; email?: string } | null
  hasStaffRoles: boolean
  isAdmin: boolean
}

export function PublicNav({ user, hasStaffRoles, isAdmin }: PublicNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { items, isLoaded } = useCart()
  const router = useRouter()
  
  // Recalculate count on every render when items change
  const cartCount = items.length

  const handleSignOut = async () => {
    startTransition(async () => {
      const { signout } = await import('@/app/actions/auth')
      await signout()
    })
  }
  
  const handleCartClick = () => {
    if (cartCount === 0) {
      router.push('/courses')
    } else {
      router.push('/cart')
    }
  }

  return (
    <header className="border-b border-rn-border bg-rn-surface sticky top-0 z-50">
      <div className="container mx-auto px-rn-4">
        <div className="flex h-16 items-center justify-between gap-rn-4">
          <Link href="/" className="shrink-0">
            <Image 
              src="/logo-dark.svg" 
              alt="RegiNor.events" 
              width={140} 
              height={32}
              priority
            />
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-rn-2 ml-auto">
            <Button asChild variant="ghost" size="sm">
              <Link href="/courses">Courses</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/events">Events</Link>
            </Button>
            
            {user ? (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/profile">My Profile</Link>
                </Button>
                {hasStaffRoles && (
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/dashboard">Dashboard</Link>
                  </Button>
                )}
                {isAdmin && (
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/admin">Admin Panel</Link>
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSignOut}
                  disabled={isPending}
                >
                  {isPending ? 'Signing out...' : 'Sign Out'}
                </Button>
                
                {/* Cart Icon with Badge - After Sign Out */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="relative"
                  onClick={handleCartClick}
                  aria-label={cartCount > 0 ? `Shopping cart with ${cartCount} item${cartCount !== 1 ? 's' : ''}` : 'Shopping cart (empty)'}
                  title={cartCount > 0 ? `View ${cartCount} course${cartCount !== 1 ? 's' : ''} in cart` : 'Browse courses'}
                >
                  <ShoppingCart className="h-4 w-4" />
                  {cartCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                      aria-hidden="true"
                    >
                      {cartCount}
                    </Badge>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="default" size="sm">
                  <Link href="/auth/login">Login</Link>
                </Button>
                
                {/* Cart Icon with Badge - After Login */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="relative"
                  onClick={handleCartClick}
                  aria-label={cartCount > 0 ? `Shopping cart with ${cartCount} item${cartCount !== 1 ? 's' : ''}` : 'Shopping cart (empty)'}
                  title={cartCount > 0 ? `View ${cartCount} course${cartCount !== 1 ? 's' : ''} in cart` : 'Browse courses'}
                >
                  <ShoppingCart className="h-4 w-4" />
                  {cartCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                      aria-hidden="true"
                    >
                      {cartCount}
                    </Badge>
                  )}
                </Button>
              </>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px]">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-rn-2 mt-rn-6">
                <Button 
                  asChild 
                  variant="ghost" 
                  className="w-full justify-start py-rn-3 h-auto"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Link href="/courses">Courses</Link>
                </Button>
                
                <Button 
                  asChild 
                  variant="ghost" 
                  className="w-full justify-start py-rn-3 h-auto"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Link href="/events">Events</Link>
                </Button>
                
                {/* Cart Button for Mobile */}
                <Button 
                  variant="ghost" 
                  className="w-full justify-start py-rn-3 h-auto relative"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    handleCartClick()
                  }}
                  aria-label={cartCount > 0 ? `Shopping cart with ${cartCount} item${cartCount !== 1 ? 's' : ''}` : 'Shopping cart (empty)'}
                >
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    <span>Cart</span>
                    {cartCount > 0 && (
                      <Badge variant="destructive" className="ml-auto" aria-hidden="true">
                        {cartCount}
                      </Badge>
                    )}
                  </div>
                </Button>
                
                {user ? (
                  <>
                    <Button 
                      asChild 
                      variant="ghost" 
                      className="w-full justify-start py-rn-3 h-auto"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Link href="/profile">My Profile</Link>
                    </Button>
                    
                    {hasStaffRoles && (
                      <Button 
                        asChild 
                        variant="ghost" 
                        className="w-full justify-start py-rn-3 h-auto"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Link href="/dashboard">Dashboard</Link>
                      </Button>
                    )}
                    
                    {isAdmin && (
                      <Button 
                        asChild 
                        variant="ghost" 
                        className="w-full justify-start py-rn-3 h-auto"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Link href="/admin">Admin Panel</Link>
                      </Button>
                    )}
                    
                    <div className="mt-rn-4 pt-rn-4 border-t border-rn-border">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={handleSignOut}
                        disabled={isPending}
                      >
                        {isPending ? 'Signing out...' : 'Sign Out'}
                      </Button>
                    </div>
                  </>
                ) : (
                  <Button 
                    asChild 
                    className="w-full mt-rn-4"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Link href="/auth/login">Login</Link>
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
