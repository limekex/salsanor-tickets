import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function DebugAuthPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return (
            <div className="container max-w-2xl py-12">
                <Card>
                    <CardHeader>
                        <CardTitle>Not Logged In</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>Please log in first.</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="container max-w-2xl py-12">
            <Card>
                <CardHeader>
                    <CardTitle>Your Supabase UID</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">Copy this UID:</p>
                        <code className="block p-4 bg-muted rounded-lg font-mono text-sm break-all select-all">
                            {user.id}
                        </code>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">Email:</p>
                        <code className="block p-4 bg-muted rounded-lg font-mono text-sm">
                            {user.email}
                        </code>
                    </div>
                    <div className="pt-4 border-t">
                        <p className="text-sm font-semibold mb-2">Next steps:</p>
                        <ol className="list-decimal list-inside space-y-1 text-sm">
                            <li>Copy the UID above</li>
                            <li>Open: <code className="bg-muted px-1 rounded">packages/database/scripts/update-supabase-uid.ts</code></li>
                            <li>Replace <code className="bg-muted px-1 rounded">YOUR_SUPABASE_UID_HERE</code> with your UID</li>
                            <li>Run: <code className="bg-muted px-1 rounded">npx tsx scripts/update-supabase-uid.ts</code></li>
                            <li>Refresh this page - you should have admin access!</li>
                        </ol>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
