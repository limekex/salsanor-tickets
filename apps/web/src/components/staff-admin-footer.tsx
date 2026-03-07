'use client'

import Link from 'next/link'

export function StaffAdminFooter() {
    return (
        <footer className="border-t border-rn-border bg-white mt-auto">
            <div className="container mx-auto px-rn-4 py-rn-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-rn-4">
                    <div className="flex flex-wrap items-center gap-rn-4 text-sm text-rn-text-muted">
                        <Link href="/staffadmin/docs" className="hover:text-rn-text transition-colors">
                            Documentation
                        </Link>
                        <span className="hidden md:inline">•</span>
                        <Link href="/" className="hover:text-rn-text transition-colors">
                            Back to Site
                        </Link>
                    </div>
                    <p className="rn-caption text-rn-text-muted">
                        &copy; {new Date().getFullYear()} RegiNor. Organization Admin.
                    </p>
                </div>
            </div>
        </footer>
    )
}
