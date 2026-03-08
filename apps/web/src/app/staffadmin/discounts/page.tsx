import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { Building2, Calendar, Percent, Plus } from 'lucide-react'
import { getSelectedOrganizerForAdmin } from '@/utils/auth-org-admin'
import { getOrgDiscountRules } from '@/app/actions/discounts'
import { DeleteOrgRuleButton, DeletePeriodRuleButton } from './org-rule-actions'

export default async function StaffAdminDiscountsPage() {
  // Get selected organization (from cookie or first available)
  const organizerId = await getSelectedOrganizerForAdmin()

  // Get organization details
  const organizer = await prisma.organizer.findUnique({
    where: { id: organizerId },
    select: { id: true, name: true }
  })

  if (!organizer) {
    notFound()
  }

  // Get org-level discount rules
  const orgRules = await getOrgDiscountRules(organizerId)

  // Get all periods for this organizer
  const periods = await prisma.coursePeriod.findMany({
    where: { organizerId },
    include: {
      _count: {
        select: { DiscountRule: true }
      }
    },
    orderBy: { startDate: 'desc' }
  })

  return (
    <div className="space-y-rn-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="rn-h1 flex items-center gap-2">
            <Percent className="h-8 w-8" />
            Discount Rules
          </h1>
          <p className="rn-meta text-rn-text-muted mt-2">
            Manage pricing rules and discounts for your courses
          </p>
        </div>
      </div>

      {/* Organization-level rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Organization Rules</CardTitle>
                <CardDescription>
                  Default rules that apply to all course periods unless overridden
                </CardDescription>
              </div>
            </div>
            <Button asChild>
              <Link href="/staffadmin/discounts/org/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Rule
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {orgRules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No organization-level rules</p>
              <p className="text-sm mt-1">
                Create rules here to apply discounts across all periods (e.g., membership discounts)
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Priority</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Applies To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgRules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-mono">{rule.priority}</TableCell>
                    <TableCell className="font-mono text-sm">{rule.code}</TableCell>
                    <TableCell>{rule.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {rule.ruleType.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={rule.appliesTo === 'BOTH' ? 'default' : 'secondary'}>
                        {rule.appliesTo === 'BOTH' ? 'All' : rule.appliesTo === 'PERIODS' ? 'Periods' : 'Events'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {rule.enabled ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Disabled</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/staffadmin/discounts/org/${rule.id}/edit`}>
                          Edit
                        </Link>
                      </Button>
                      <DeleteOrgRuleButton ruleId={rule.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Period-specific rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Period-Specific Rules</CardTitle>
              <CardDescription>
                Rules that only apply to specific course periods. Can override organization rules.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {periods.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No periods found</p>
              <p className="text-sm mt-1">Create a course period to add period-specific rules</p>
            </div>
          ) : (
            <Tabs defaultValue={periods[0]?.id} className="space-y-4">
              <TabsList className="flex-wrap h-auto gap-1">
                {periods.map((period) => (
                  <TabsTrigger key={period.id} value={period.id} className="text-sm">
                    {period.name}
                    {period._count.DiscountRule > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {period._count.DiscountRule}
                      </Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>

              {periods.map((period) => (
                <TabsContent key={period.id} value={period.id}>
                  <PeriodDiscountRules periodId={period.id} periodName={period.name} />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

async function PeriodDiscountRules({ periodId, periodName }: { periodId: string; periodName: string }) {
  const rules = await prisma.discountRule.findMany({
    where: { periodId },
    orderBy: { priority: 'asc' }
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Rules for <span className="font-medium">{periodName}</span> • evaluated by priority (lowest first)
        </p>
        <Button asChild size="sm">
          <Link href={`/staffadmin/discounts/${periodId}/new`}>
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Link>
        </Button>
      </div>

      {rules.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          <Percent className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No period-specific rules</p>
          <p className="text-xs mt-1">Organization rules will apply</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Priority</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Override</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell className="font-mono">{rule.priority}</TableCell>
                <TableCell className="font-mono text-sm">{rule.code}</TableCell>
                <TableCell>{rule.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {rule.ruleType.replace(/_/g, ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  {rule.overrideOrgRules ? (
                    <Badge variant="destructive" className="text-xs">Overrides org</Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {rule.enabled ? (
                    <Badge variant="default">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Disabled</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/staffadmin/discounts/${periodId}/${rule.id}/edit`}>
                      Edit
                    </Link>
                  </Button>
                  <DeletePeriodRuleButton ruleId={rule.id} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
