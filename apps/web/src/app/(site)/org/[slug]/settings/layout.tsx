import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface LayoutProps {
    children: React.ReactNode
    params: Promise<{ slug: string }>
}

export default async function OrgSettingsLayout({ children, params }: LayoutProps) {
    const { slug } = await params

    return (
        <div className="flex gap-6">
            <aside className="w-48 flex-shrink-0">
                <nav className="space-y-1">
                    <Link href={`/org/${slug}/settings/stripe`}>
                        <Button variant="ghost" className="w-full justify-start">
                            Stripe Connect
                        </Button>
                    </Link>
                    <Link href={`/org/${slug}/settings/general`}>
                        <Button variant="ghost" className="w-full justify-start" disabled>
                            General
                        </Button>
                    </Link>
                </nav>
            </aside>
            <main className="flex-1 max-w-4xl">
                {children}
            </main>
        </div>
    )
}
