
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function AdminDashboard() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Course Periods</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Manage Periods</div>
                        <p className="text-xs text-muted-foreground">Set up new courses/rounds</p>
                        <Button asChild className="mt-4" variant="outline">
                            <Link href="/admin/periods">Go to Periods</Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Registrations</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Participants</div>
                        <p className="text-xs text-muted-foreground">View rosters and stats</p>
                        <Button asChild className="mt-4" variant="outline">
                            <Link href="/admin/registrations">View Registrations</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
