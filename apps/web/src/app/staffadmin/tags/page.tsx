import { getOrgTags } from '@/app/actions/tags'
import { requireOrgAdmin } from '@/utils/auth-org-admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { DeleteTagButton } from './delete-tag-button'

export default async function StaffAdminTagsPage() {
    const userAccount = await requireOrgAdmin()

    // Get organizerId from user's first ORG_ADMIN role
    const orgAdminRole = userAccount.UserAccountRole.find(r => r.role === 'ORG_ADMIN')
    if (!orgAdminRole?.organizerId) {
        return <div>No organization found</div>
    }

    const tags = await getOrgTags(orgAdminRole.organizerId)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="rn-h2">Tags</h2>
                    <p className="rn-body text-rn-text-muted mt-1">
                        Custom tags for organizing your events and courses
                    </p>
                </div>
                <Button asChild>
                    <Link href="/staffadmin/tags/new">
                        <Plus className="h-4 w-4 mr-2" />
                        New Tag
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Your Tags</CardTitle>
                    <CardDescription>
                        {tags.length} tag{tags.length !== 1 ? 's' : ''}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {tags.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <p>No tags yet.</p>
                            <Button asChild className="mt-4" variant="outline">
                                <Link href="/staffadmin/tags/new">Create First Tag</Link>
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Color</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Slug</TableHead>
                                    <TableHead>Usage</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tags.map((tag) => (
                                    <TableRow key={tag.id}>
                                        <TableCell>
                                            {tag.color ? (
                                                <div 
                                                    className="w-6 h-6 rounded-full border"
                                                    style={{ backgroundColor: tag.color }}
                                                />
                                            ) : (
                                                <div className="w-6 h-6 rounded-full bg-gray-200 border" />
                                            )}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {tag.name}
                                        </TableCell>
                                        <TableCell>
                                            <code className="text-xs bg-muted px-2 py-1 rounded">
                                                {tag.slug}
                                            </code>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                {tag._count.CoursePeriod > 0 && (
                                                    <Badge variant="secondary">
                                                        {tag._count.CoursePeriod} period{tag._count.CoursePeriod !== 1 ? 's' : ''}
                                                    </Badge>
                                                )}
                                                {tag._count.Event > 0 && (
                                                    <Badge variant="secondary">
                                                        {tag._count.Event} event{tag._count.Event !== 1 ? 's' : ''}
                                                    </Badge>
                                                )}
                                                {tag._count.CoursePeriod === 0 && tag._count.Event === 0 && (
                                                    <span className="text-muted-foreground text-sm">Unused</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button asChild variant="ghost" size="sm">
                                                    <Link href={`/staffadmin/tags/${tag.id}`}>
                                                        Edit
                                                    </Link>
                                                </Button>
                                                <DeleteTagButton 
                                                    tagId={tag.id}
                                                    tagName={tag.name}
                                                    hasUsage={tag._count.CoursePeriod > 0 || tag._count.Event > 0}
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
