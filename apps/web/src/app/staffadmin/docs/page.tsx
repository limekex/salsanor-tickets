import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { docCategories } from './layout'
import { BookOpen } from 'lucide-react'

export const metadata = {
    title: 'Documentation – RegiNor Staff Admin',
    description: 'Guides and reference docs for organizers, staff, and administrators.',
}

export default function DocsIndexPage() {
    return (
        <div className="space-y-rn-8">
            <div>
                <h1 className="rn-h1 flex items-center gap-rn-3">
                    <BookOpen className="h-8 w-8 text-rn-primary" />
                    Documentation
                </h1>
                <p className="rn-meta text-rn-text-muted mt-rn-2">
                    Guides and how-tos for organizers, staff, and administrators.
                </p>
            </div>

            {docCategories.map(cat => (
                <section key={cat.id} className="space-y-rn-4">
                    <div className="flex items-center gap-rn-2">
                        <cat.icon className="h-5 w-5 text-rn-primary" />
                        <h2 className="rn-h2">{cat.label}</h2>
                    </div>

                    <div className="grid gap-rn-4 md:grid-cols-2">
                        {cat.articles.map(art => (
                            <Link key={art.slug} href={`/staffadmin/docs/${art.slug}`} className="block group">
                                <Card className="h-full transition-shadow group-hover:shadow-md">
                                    <CardHeader className="pb-rn-2">
                                        <CardTitle className="text-base">{art.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <CardDescription>{art.summary}</CardDescription>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    )
}
