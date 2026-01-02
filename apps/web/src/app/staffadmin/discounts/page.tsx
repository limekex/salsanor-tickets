import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { Percent, Plus } from 'lucide-react'

export default async function StaffAdminDiscountsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  // Get user's organization
  const userAccount = await prisma.userAccount.findUnique({
    where: { supabaseUid: user.id },
    include: {
      roles: {
        where: { role: 'ORG_ADMIN' }
      }
    }
  })

  const organizerId = userAccount?.roles?.[0]?.organizerId

  if (!organizerId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">No Organization Access</h1>
        <p className="text-muted-foreground">You need admin access to manage discount rules.</p>
      </div>
    )
  }

  // Get all periods for this organizer
  const periods = await prisma.coursePeriod.findMany({
    where: { organizerId },
    include: {
      _count: {
        select: { discountRules: true }
      }
    },
    orderBy: { startDate: 'desc' }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Percent className="h-8 w-8" />
            Discount Rules
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage pricing rules and discounts for your courses
          </p>
        </div>
      </div>

      {periods.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Periods Found</CardTitle>
            <CardDescription>
              You need to create a course period before setting up discount rules.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Tabs defaultValue={periods[0].id} className="space-y-4">
          <TabsList>
            {periods.map((period) => (
              <TabsTrigger key={period.id} value={period.id}>
                {period.name}
                {period._count.discountRules > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {period._count.discountRules}
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
    </div>
  )
}

async function PeriodDiscountRules({ periodId, periodName }: { periodId: string; periodName: string }) {
  const rules = await prisma.discountRule.findMany({
    where: { periodId },
    orderBy: { priority: 'asc' }
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Rules for {periodName}</CardTitle>
            <CardDescription>
              Rules are evaluated in order of priority (lowest first)
            </CardDescription>
          </div>
          <Button asChild>
            <Link href={`/staffadmin/discounts/${periodId}/new`}>
              <Plus className="h-4 w-4 mr-2" />
              Create Rule
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {rules.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Percent className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No discount rules configured</p>
            <p className="text-sm mt-2">Create your first rule to offer discounts</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Priority</TableHead>
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
                  <TableCell className="font-mono">{rule.priority}</TableCell>
                  <TableCell className="font-mono text-sm">{rule.code}</TableCell>
                  <TableCell>{rule.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {rule.ruleType.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {rule.enabled ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Disabled</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/staffadmin/discounts/${periodId}/${rule.id}/edit`}>
                        Edit
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
