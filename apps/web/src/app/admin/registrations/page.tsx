import { getAllRegistrations } from '@/app/actions/registration'
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
import { CancelRegistrationButton } from '@/components/cancel-registration-button'

export default async function RegistrationsPage() {
    const registrations = await getAllRegistrations()

    const getStatusBadge = (status: string) => {
        const variants = {
            ACTIVE: 'success',
            PENDING_PAYMENT: 'warning',
            WAITLIST: 'warning',
            CANCELLED: 'destructive',
            REFUNDED: 'destructive',
            DRAFT: 'outline',
        } as const

        return (
            <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
                {status.replace('_', ' ')}
            </Badge>
        )
    }

    const getRoleBadge = (role: string) => {
        const colors = {
            LEADER: 'bg-blue-100 text-blue-800',
            FOLLOWER: 'bg-pink-100 text-pink-800',
            ANY: 'bg-gray-100 text-gray-800',
        } as const

        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
                {role}
            </span>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="rn-h2">All Registrations</h2>
                <div className="rn-meta text-rn-text-muted">
                    Total: {registrations.length}
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Registration List</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Participant</TableHead>
                                <TableHead>Organization</TableHead>
                                <TableHead>Period</TableHead>
                                <TableHead>Track</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {registrations.map((reg) => (
                                <TableRow key={reg.id}>
                                    <TableCell className="font-medium">
                                        {reg.PersonProfile.firstName} {reg.PersonProfile.lastName}
                                        <div className="text-xs text-muted-foreground">
                                            {reg.PersonProfile.email}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {reg.CoursePeriod.Organizer.name}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        <div>{reg.CoursePeriod.name}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {reg.CoursePeriod.code}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        <div>{reg.CourseTrack.title}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {reg.CourseTrack.weekday} {reg.CourseTrack.timeStart}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {getRoleBadge(reg.chosenRole)}
                                    </TableCell>
                                    <TableCell>
                                        {getStatusBadge(reg.status)}
                                        {reg.cancelledAt && (
                                            <div className="text-xs text-muted-foreground mt-1">
                                                Cancelled {format(reg.cancelledAt, 'MMM d, yyyy')}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {format(reg.createdAt, 'MMM d, yyyy')}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {reg.status !== 'CANCELLED' && (
                                            <CancelRegistrationButton 
                                                registrationId={reg.id}
                                                participantName={`${reg.PersonProfile.firstName} ${reg.PersonProfile.lastName}`}
                                                courseName={`${reg.CoursePeriod.name} - ${reg.CourseTrack.title}`}
                                            />
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {registrations.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                        No registrations found.
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
