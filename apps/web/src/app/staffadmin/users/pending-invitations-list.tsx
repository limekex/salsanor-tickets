'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { RefreshCw, X, Clock, Mail, MailCheck, Loader2 } from 'lucide-react'
import { getOrganizationInvitations, resendInvitation, cancelInvitation } from '@/app/actions/staffadmin-invites'
import { toast } from 'sonner'
import { formatRelativeTime } from '@/lib/formatters'

// i18n-ready: These strings can be moved to a translation file
const t = {
    loadError: 'Could not load invitations',
    resendSuccess: 'Invitation resent',
    resendError: 'Could not send invitation',
    cancelSuccess: 'Invitation cancelled',
    cancelError: 'Could not cancel invitation',
    pendingInvitations: 'Pending Invitations',
    email: 'Email',
    role: 'Role',
    status: 'Status',
    expires: 'Expires',
    actions: 'Actions',
    sent: 'Sent',
    notSent: 'Not sent',
    cancelInvitation: 'Cancel invitation?',
    cancelDescription: (email: string) => `Are you sure you want to cancel the invitation to ${email}? This action cannot be undone.`,
    cancel: 'Cancel',
    confirmCancel: 'Cancel Invitation',
    roles: {
        'ORG_ADMIN': 'Org Admin',
        'ORG_FINANCE': 'Finance',
        'ORG_CHECKIN': 'Check-in',
        'INSTRUCTOR': 'Instructor',
        'STAFF': 'Staff',
        'PARTICIPANT': 'Participant'
    } as Record<string, string>,
}

interface Invitation {
    id: string
    email: string
    role: string
    status: string
    expiresAt: Date
    emailSent: boolean
    emailSentAt: Date | null
    createdAt: Date
    InvitedBy: {
        email: string
        PersonProfile: {
            firstName: string
            lastName: string
        } | null
    } | null
}

interface PendingInvitationsListProps {
    organizerId: string
}

export function PendingInvitationsList({ organizerId }: PendingInvitationsListProps) {
    const [invitations, setInvitations] = useState<Invitation[]>([])
    const [loading, setLoading] = useState(true)
    const [resendingId, setResendingId] = useState<string | null>(null)
    const [cancellingId, setCancellingId] = useState<string | null>(null)

    const loadInvitations = async () => {
        try {
            setLoading(true)
            const data = await getOrganizationInvitations(organizerId)
            setInvitations(data as Invitation[])
        } catch (err) {
            console.error('Failed to load invitations:', err)
            toast.error(t.loadError)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadInvitations()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [organizerId])

    const handleResend = async (inviteId: string) => {
        setResendingId(inviteId)
        try {
            const result = await resendInvitation(inviteId)
            if (result.success) {
                toast.success(t.resendSuccess)
                loadInvitations()
            } else {
                toast.error(result.error?._form?.[0] || t.resendError)
            }
        } catch (err) {
            console.error('Failed to resend invitation:', err)
            toast.error(t.resendError)
        } finally {
            setResendingId(null)
        }
    }

    const handleCancel = async (inviteId: string) => {
        setCancellingId(inviteId)
        try {
            const result = await cancelInvitation(inviteId)
            if (result.success) {
                toast.success(t.cancelSuccess)
                loadInvitations()
            } else {
                toast.error(result.error?._form?.[0] || t.cancelError)
            }
        } catch (err) {
            console.error('Failed to cancel invitation:', err)
            toast.error(t.cancelError)
        } finally {
            setCancellingId(null)
        }
    }

    const getRoleLabel = (role: string): string => {
        return t.roles[role] || role
    }

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {t.pendingInvitations}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (invitations.length === 0) {
        return null // Don't show card if no pending invitations
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {t.pendingInvitations} ({invitations.length})
                    </CardTitle>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={loadInvitations}
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t.email}</TableHead>
                            <TableHead>{t.role}</TableHead>
                            <TableHead>{t.status}</TableHead>
                            <TableHead>{t.expires}</TableHead>
                            <TableHead className="text-right">{t.actions}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invitations.map((invite) => (
                            <TableRow key={invite.id}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        {invite.email}
                                        <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
                                            Pending
                                        </Badge>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className="text-xs">
                                        {getRoleLabel(invite.role)}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {invite.emailSent ? (
                                        <span className="flex items-center gap-1 text-sm text-green-600">
                                            <MailCheck className="h-3 w-3" />
                                            {t.sent}
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-sm text-yellow-600">
                                            <Mail className="h-3 w-3" />
                                            {t.notSent}
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {formatRelativeTime(new Date(invite.expiresAt))}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex gap-1 justify-end">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleResend(invite.id)}
                                            disabled={resendingId === invite.id}
                                        >
                                            {resendingId === invite.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <RefreshCw className="h-4 w-4" />
                                            )}
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-destructive hover:text-destructive"
                                                    disabled={cancellingId === invite.id}
                                                >
                                                    {cancellingId === invite.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <X className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>{t.cancelInvitation}</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        {t.cancelDescription(invite.email)}
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => handleCancel(invite.id)}
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                    >
                                                        {t.confirmCancel}
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
