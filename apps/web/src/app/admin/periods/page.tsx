
import { getCoursePeriods } from '@/app/actions/periods'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
        <div className="space-y-rn-6 px-rn-4 sm:px-rn-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-rn-4">
                <h2 className="rn-h2">Course Periods</h2>
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
                                <TableHead>Organizer</TableHead>
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
                                    <TableCell className="text-muted-foreground">{period.organizer.name}</TableCell>
                                    <TableCell>
                                        {format(period.startDate, 'MMM d, yyyy')} -{' '}
                                        {format(period.endDate, 'MMM d, yyyy')}
                                    </TableCell>
                                    <TableCell>
                                        {period.salesOpenAt < new Date() && period.salesCloseAt > new Date() ? (
                                            <Badge variant="success">Open</Badge>
                                        ) : (
                                            <Badge variant="secondary">Closed</Badge>
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
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
