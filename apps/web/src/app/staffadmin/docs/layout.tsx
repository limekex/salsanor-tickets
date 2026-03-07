import Link from 'next/link'
import { BookOpen, BarChart2, ChevronRight, Clock } from 'lucide-react'
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
    {
        id: 'automation',
        label: 'Automation & Tasks',
        icon: Clock,
        articles: [
            {
                slug: 'scheduled-tasks',
                title: 'Scheduled tasks & notifications',
                summary: 'Configure automated reminders, alerts, and maintenance tasks for your organization.',
            },
        ],
    },
] as const

export default async function DocsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="space-y-rn-6">
            <div className="flex items-center gap-rn-2 text-rn-text-muted">
                <BookOpen className="h-5 w-5 text-rn-primary" />
                <Link href="/staffadmin/docs" className="hover:text-rn-text transition-colors font-medium">
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
                                                href={`/staffadmin/docs/${art.slug}`}
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
