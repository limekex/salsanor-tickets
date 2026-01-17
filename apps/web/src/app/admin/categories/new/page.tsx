import { requireAdmin } from '@/utils/auth-admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { CategoryForm } from '../category-form'

export default async function NewCategoryPage() {
    await requireAdmin()

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/admin/categories">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Link>
                </Button>
                <div>
                    <h2 className="rn-h2">New Category</h2>
                    <p className="rn-body text-rn-text-muted mt-1">
                        Create a new global category
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Category Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <CategoryForm />
                </CardContent>
            </Card>
        </div>
    )
}
