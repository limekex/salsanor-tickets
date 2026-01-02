'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from './ui/button'
import { Menu } from 'lucide-react'
import { useState, useTransition } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

type PublicNavProps = {
  user: { id: string; email?: string } | null
  hasStaffRoles: boolean
  isAdmin: boolean
}

export function PublicNav({ user, hasStaffRoles, isAdmin }: PublicNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleSignOut = async () => {
    startTransition(async () => {
      const { signout } = await import('@/app/actions/auth')
      await signout()
    })
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
              </>
            ) : (
              <Button asChild variant="default" size="sm">
                <Link href="/auth/login">Login</Link>
              </Button>
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
