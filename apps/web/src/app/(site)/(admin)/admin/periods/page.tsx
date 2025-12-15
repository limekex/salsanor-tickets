
import { getCoursePeriods } from '@/app/actions/periods'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'
import Link from 'next/link'

export default async function CoursePeriodsPage() {
    const periods = await getCoursePeriods()

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Course Periods</h2>
                <Button asChild>
                    <Link href="/admin/periods/new">Create New Period</Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Periods</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Dates</TableHead>
                                <TableHead>Sales</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {periods.map((period) => (
                                <TableRow key={period.id}>
                                    <TableCell className="font-medium">{period.code}</TableCell>
                                    <TableCell>{period.name}</TableCell>
                                    <TableCell>
                                        {format(period.startDate, 'MMM d, yyyy')} -{' '}
                                        {format(period.endDate, 'MMM d, yyyy')}
                                    </TableCell>
                                    <TableCell>
                                        {period.salesOpenAt < new Date() && period.salesCloseAt > new Date() ? (
                                            <span className="text-green-600 font-bold">Open</span>
                                        ) : (
                                            <span className="text-muted-foreground">Closed</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button asChild variant="ghost" size="sm">
                                            <Link href={`/admin/periods/${period.id}`}>Edit</Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {periods.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No course periods found. Create one to get started.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
