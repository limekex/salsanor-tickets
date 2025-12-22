import Link from 'next/link'
import Image from 'next/image'

export function Footer() {
  return (
    <footer className="border-t border-rn-border bg-white">
      <div className="container mx-auto px-rn-4 py-rn-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-rn-8">
          {/* Brand */}
          <div className="space-y-rn-3">
            <Image 
              src="/logo-dark.svg" 
              alt="RegiNor.events" 
              width={160} 
              height={36}
              className="h-8 w-auto"
            />
            <p className="rn-caption text-rn-text-muted">
              from signup to showtime
            </p>
          </div>

          {/* Product */}
          <div className="space-y-rn-3">
            <h4 className="rn-meta font-semibold uppercase tracking-wide">Product</h4>
            <ul className="space-y-rn-2 rn-body text-rn-text-muted">
              <li>
                <Link href="/courses" className="hover:text-rn-text transition-colors">
                  Courses
                </Link>
              </li>
              <li>
                <Link href="/profile" className="hover:text-rn-text transition-colors">
                  My Profile
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-rn-text transition-colors">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* For Organizers */}
          <div className="space-y-rn-3">
            <h4 className="rn-meta font-semibold uppercase tracking-wide">For Organizers</h4>
            <ul className="space-y-rn-2 rn-body text-rn-text-muted">
              <li>
                <Link href="/admin" className="hover:text-rn-text transition-colors">
                  Admin
                </Link>
              </li>
              <li>
                <Link href="/staffadmin" className="hover:text-rn-text transition-colors">
                  Staff Admin
                </Link>
              </li>
            </ul>
          </div>

          {/* About */}
          <div className="space-y-rn-3">
            <h4 className="rn-meta font-semibold uppercase tracking-wide">About</h4>
            <p className="rn-caption text-rn-text-muted">
              RegiNor.events is developed and operated by SalsaNor, built from practice – not theory.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-rn-8 pt-rn-6 border-t border-rn-border flex flex-col md:flex-row justify-between items-center gap-rn-4">
          <p className="rn-caption text-rn-text-muted">
            &copy; {new Date().getFullYear()} RegiNor. All rights reserved.
          </p>
          <p className="rn-caption text-rn-text-muted">
            Powered by <span className="font-semibold text-rn-text">BeTA iT</span>
          </p>
        </div>
      </div>
    </footer>
  )
}
