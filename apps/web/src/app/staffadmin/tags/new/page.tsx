import { getSelectedOrganizerForAdmin } from '@/utils/auth-org-admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { TagForm } from '../tag-form'

export default async function NewTagPage() {
    // Get selected organization (from cookie or first available)
    const organizerId = await getSelectedOrganizerForAdmin()

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
                    <h2 className="rn-h2">New Tag</h2>
                    <p className="rn-body text-rn-text-muted mt-1">
                        Create a new tag for your organization
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Tag Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <TagForm key={organizerId} organizerId={organizerId} />
                </CardContent>
            </Card>
        </div>
    )
}
