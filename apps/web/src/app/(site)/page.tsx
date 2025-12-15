
import { createClient } from '@/utils/supabase/server'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { signout } from '@/app/actions/auth'
import { prisma } from '@/lib/db'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isAdmin = false
  let hasStaffRoles = false

  if (user) {
    const userAccount = await prisma.userAccount.findUnique({
      where: { supabaseUid: user.id },
      include: { roles: true }
    })
    
    if (userAccount?.roles) {
      isAdmin = userAccount.roles.some(r => r.role === 'ADMIN' || r.role === 'ORGANIZER')
      // Check if user has any staff/admin roles
      hasStaffRoles = userAccount.roles.length > 0
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="px-6 py-4 flex items-center justify-between border-b">
        <div className="font-bold text-xl">SalsaNor Tickets</div>
        <nav className="flex items-center gap-4">
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
              <form action={signout}>
                <Button variant="outline" size="sm">Sign Out</Button>
              </form>
            </>
          ) : (
            <Button asChild variant="ghost" size="sm">
              <Link href="/auth/login">Login</Link>
            </Button>
          )}
        </nav>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-8 max-w-4xl mx-auto">
        <h1 className="text-5xl font-extrabold tracking-tight lg:text-6xl">
          Dance Courses & Events
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          Register for the upcoming salsa rounds, manage your tickets, and check in to events.
        </p>

        <div className="flex gap-4">
          <Button asChild size="lg">
            <Link href="/courses">Browse Courses</Link>
          </Button>

          {userhasStaffRoles && (
                <Button asChild variant="secondary" size="lg">
                  <Link href="/dashboard">Staff Dashboard</Link>
                </Button>
              )}
              {isAdmin && (
                <Button asChild variant="secondary" size="lg">
                  <Link href="/admin">Admin Panel"lg">
                <Link href="/profile">My Profile</Link>
              </Button>
              {isAdmin && (
                <Button asChild variant="secondary" size="lg">
                  <Link href="/admin">Admin Dashboard</Link>
                </Button>
              )}
            </>
          ) : (
            <Button asChild variant="outline" size="lg">
              <Link href="/auth/login?tab=signup">Sign Up / Login</Link>
            </Button>
          )}
        </div>
      </main>

      <footer className="py-6 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} SalsaNor. All rights reserved.
      </footer>
    </div>
  )
}
