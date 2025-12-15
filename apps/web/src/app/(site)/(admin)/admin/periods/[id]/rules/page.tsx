
import { getDiscountRules } from '@/app/actions/discounts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function RulesPage({ params }: PageProps) {
    const { id: periodId } = await params
    const period = await prisma.coursePeriod.findUnique({ where: { id: periodId } })
    if (!period) notFound()

    const rules = await getDiscountRules(periodId)

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Discount Rules</h1>
                    <p className="text-muted-foreground">Manage discounts for {period.name}</p>
                </div>
                <Button asChild>
                    <Link href={`/admin/periods/${period.id}/rules/new`}>Create Rule</Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Active Rules</CardTitle>
                    <CardDescription>Rules are evaluated in order of Priority (lowest first).</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Pri</TableHead>
                                <TableHead>Code</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rules.map((rule) => (
                                <TableRow key={rule.id}>
                                    <TableCell>{rule.priority}</TableCell>
                                    <TableCell className="font-mono text-sm">{rule.code}</TableCell>
                                    <TableCell>{rule.name}</TableCell>
                                    <TableCell><Badge variant="outline">{rule.ruleType}</Badge></TableCell>
                                    <TableCell>
                                        {rule.enabled ? <Badge>Active</Badge> : <Badge variant="secondary">Disabled</Badge>}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href="#">Edit</Link>
                                            {/* Edit not implemented yet */}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {rules.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No discount rules configured.
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
