import { requireOrgAdmin } from '@/utils/auth-org-admin'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { TagForm } from '../tag-form'

export default async function EditTagPage({ 
    params 
}: { 
    params: Promise<{ tagId: string }> 
}) {
    const userAccount = await requireOrgAdmin()
    
    const { tagId } = await params

    // Get organizerId from user's first ORG_ADMIN role
    const orgAdminRole = userAccount.roles.find(r => r.role === 'ORG_ADMIN')
    if (!orgAdminRole?.organizerId) {
        return <div>No organization found</div>
    }

    const tag = await prisma.tag.findUnique({
        where: { 
            id: tagId,
            organizerId: orgAdminRole.organizerId // Ensure user can only edit their org's tags
        }
    })

    if (!tag) {
        notFound()
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/staffadmin/tags">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Link>
                </Button>
                <div>
                    <h2 className="rn-h2">Edit Tag</h2>
                    <p className="rn-body text-rn-text-muted mt-1">
                        {tag.name}
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Tag Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <TagForm organizerId={orgAdminRole.organizerId} tag={tag} />
                </CardContent>
            </Card>
        </div>
    )
}
