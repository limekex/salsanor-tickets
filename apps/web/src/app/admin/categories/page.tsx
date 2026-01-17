import { getAllCategories } from '@/app/actions/categories'
import { requireAdmin } from '@/utils/auth-admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { DeleteCategoryButton } from './delete-category-button'

export default async function AdminCategoriesPage() {
    await requireAdmin()

    const categories = await getAllCategories()

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="rn-h2">Categories</h2>
                    <p className="rn-body text-rn-text-muted mt-1">
                        Global categories for organizing events and courses
                    </p>
                </div>
                <Button asChild>
                    <Link href="/admin/categories/new">
                        <Plus className="h-4 w-4 mr-2" />
                        New Category
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Categories</CardTitle>
                    <CardDescription>
                        {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {categories.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <p>No categories yet.</p>
                            <Button asChild className="mt-4" variant="outline">
                                <Link href="/admin/categories/new">Create First Category</Link>
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Icon</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Slug</TableHead>
                                    <TableHead>Sort Order</TableHead>
                                    <TableHead>Usage</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {categories.map((category) => (
                                    <TableRow key={category.id}>
                                        <TableCell className="text-2xl">
                                            {category.icon || '📁'}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {category.name}
                                        </TableCell>
                                        <TableCell>
                                            <code className="text-xs bg-muted px-2 py-1 rounded">
                                                {category.slug}
                                            </code>
                                        </TableCell>
                                        <TableCell>{category.sortOrder}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                {category._count.CoursePeriod > 0 && (
                                                    <Badge variant="secondary">
                                                        {category._count.CoursePeriod} period{category._count.CoursePeriod !== 1 ? 's' : ''}
                                                    </Badge>
                                                )}
                                                {category._count.Event > 0 && (
                                                    <Badge variant="secondary">
                                                        {category._count.Event} event{category._count.Event !== 1 ? 's' : ''}
                                                    </Badge>
                                                )}
                                                {category._count.CoursePeriod === 0 && category._count.Event === 0 && (
                                                    <span className="text-muted-foreground text-sm">Unused</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button asChild variant="ghost" size="sm">
                                                    <Link href={`/admin/categories/${category.id}`}>
                                                        Edit
                                                    </Link>
                                                </Button>
                                                <DeleteCategoryButton 
                                                    categoryId={category.id}
                                                    categoryName={category.name}
                                                    hasUsage={category._count.CoursePeriod > 0 || category._count.Event > 0}
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
