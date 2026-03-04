import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, BarChart2, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// All available documentation articles, used to build the sidebar.
export const docCategories = [
    {
        id: 'analytics',
        label: 'Analytics & Tracking',
        icon: BarChart2,
        articles: [
            {
                slug: 'conversion-tracking',
                title: 'How to enable conversion tracking',
                summary: 'Set up GA4, Facebook Pixel, and Google Ads so purchases on RegiNor are reported back to your ad platforms.',
            },
        ],
    },
] as const

const NON_PARTICIPANT_ROLES = [
    'ADMIN',
    'ORG_ADMIN',
    'ORG_FINANCE',
    'ORG_CHECKIN',
    'INSTRUCTOR',
    'STAFF',
    'CHECKIN',
]

export default async function DocsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Guard: only non-participant users may access /docs
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login?next=/docs')
    }

    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        select: { UserAccountRole: { select: { role: true } } },
    })

    const hasElevatedRole = userAccount?.UserAccountRole.some(r =>
        NON_PARTICIPANT_ROLES.includes(r.role)
    )

    if (!hasElevatedRole) {
        redirect('/')
    }

    return (
        <div className="container mx-auto px-rn-4 py-rn-8">
            <div className="flex items-center gap-rn-2 mb-rn-6 text-rn-text-muted">
                <BookOpen className="h-5 w-5 text-rn-primary" />
                <Link href="/docs" className="hover:text-rn-text transition-colors font-medium">
                    Documentation
                </Link>
            </div>

            <div className="flex gap-rn-8 items-start">
                {/* Sidebar */}
                <aside className="hidden md:block w-64 shrink-0">
                    <nav className="space-y-rn-6">
                        {docCategories.map(cat => (
                            <div key={cat.id}>
                                <p className="rn-meta font-semibold uppercase tracking-wide text-rn-text-muted mb-rn-2 flex items-center gap-1">
                                    <cat.icon className="h-3.5 w-3.5" />
                                    {cat.label}
                                </p>
                                <ul className="space-y-1">
                                    {cat.articles.map(art => (
                                        <li key={art.slug}>
                                            <Link
                                                href={`/docs/${art.slug}`}
                                                className={cn(
                                                    'flex items-center gap-1 rounded px-2 py-1.5 text-sm transition-colors',
                                                    'text-rn-text-muted hover:bg-rn-surface hover:text-rn-text'
                                                )}
                                            >
                                                <ChevronRight className="h-3 w-3 shrink-0" />
                                                {art.title}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </nav>
                </aside>

                {/* Content */}
                <main className="flex-1 min-w-0">
                    {children}
                </main>
            </div>
        </div>
    )
}
