'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { inviteUserToOrganization } from '@/app/actions/staffadmin-invites'
import { UserPlus, Mail, Send } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

type Organizer = {
    id: string
    name: string
    slug: string
}

// i18n-ready: These strings can be moved to a translation file
const t = {
    inviteUser: 'Invite User',
    inviteUserTo: (org: string) => `Invite user to ${org}`,
    dialogDescription: 'Send an email invitation to a new user. They will receive a link to create an account and be assigned the role.',
    emailLabel: 'Email Address',
    emailPlaceholder: 'user@example.com',
    roleLabel: 'Role',
    selectRole: 'Select role',
    cancel: 'Cancel',
    sending: 'Sending...',
    sendInvitation: 'Send Invitation',
    errorNoEmail: 'Please enter an email address',
    errorNoRole: 'Please select a role',
    errorDefault: 'Could not send invitation',
    successMessage: 'Invitation sent! The user will receive an email with instructions.',
    roles: {
        ORG_ADMIN: { label: 'Org Admin', description: 'Full access to the organization' },
        ORG_FINANCE: { label: 'Finance', description: 'Access to finance and payments' },
        ORG_CHECKIN: { label: 'Check-in', description: 'Can check in participants' },
        INSTRUCTOR: { label: 'Instructor', description: 'Can view their courses and participants' },
        STAFF: { label: 'Staff', description: 'General staff access' },
        PARTICIPANT: { label: 'Participant', description: 'Basic participant access' },
    } as Record<string, { label: string; description: string }>,
}

const STAFF_ROLES = [
    { value: 'ORG_ADMIN', label: t.roles.ORG_ADMIN.label, description: t.roles.ORG_ADMIN.description },
    { value: 'ORG_FINANCE', label: t.roles.ORG_FINANCE.label, description: t.roles.ORG_FINANCE.description },
    { value: 'ORG_CHECKIN', label: t.roles.ORG_CHECKIN.label, description: t.roles.ORG_CHECKIN.description },
    { value: 'INSTRUCTOR', label: t.roles.INSTRUCTOR.label, description: t.roles.INSTRUCTOR.description },
    { value: 'STAFF', label: t.roles.STAFF.label, description: t.roles.STAFF.description },
    { value: 'PARTICIPANT', label: t.roles.PARTICIPANT.label, description: t.roles.PARTICIPANT.description },
] as const

export function StaffInviteUserDialog({ 
    organizer
}: { 
    organizer: Organizer
}) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [email, setEmail] = useState('')
    const [selectedRole, setSelectedRole] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const handleInvite = async () => {
        if (!email.trim()) {
            setError(t.errorNoEmail)
            return
        }
        if (!selectedRole) {
            setError(t.errorNoRole)
            return
        }

        setLoading(true)
        setError('')
        setSuccess(false)

        try {
            const result = await inviteUserToOrganization(
                email.trim(),
                selectedRole,
                organizer.id
            )

            if (result.error) {
                const errorMessage = result.error._form?.[0] || result.error.email?.[0] || t.errorDefault
                setError(errorMessage)
            } else {
                setSuccess(true)
                setTimeout(() => {
                    setOpen(false)
                    setEmail('')
                    setSelectedRole('')
                    setSuccess(false)
                    router.refresh()
                }, 2000)
            }
        } catch (e: any) {
            setError(e.message || t.errorDefault)
        } finally {
            setLoading(false)
        }
    }

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen)
        if (!newOpen) {
            setEmail('')
            setSelectedRole('')
            setError('')
            setSuccess(false)
        }
    }

    const selectedRoleInfo = STAFF_ROLES.find(r => r.value === selectedRole)

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Mail className="h-4 w-4 mr-2" />
                    {t.inviteUser}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>{t.inviteUserTo(organizer.name)}</DialogTitle>
                    <DialogDescription>
                        {t.dialogDescription}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">{t.emailLabel}</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder={t.emailPlaceholder}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !loading && handleInvite()}
                            disabled={loading || success}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="role">{t.roleLabel}</Label>
                        <Select 
                            value={selectedRole} 
                            onValueChange={setSelectedRole}
                            disabled={loading || success}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={t.selectRole} />
                            </SelectTrigger>
                            <SelectContent>
                                {STAFF_ROLES.map((role) => (
                                    <SelectItem key={role.value} value={role.value}>
                                        {role.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {selectedRoleInfo && (
                            <p className="text-sm text-muted-foreground">
                                {selectedRoleInfo.description}
                            </p>
                        )}
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {success && (
                        <Alert>
                            <AlertDescription className="text-green-600">
                                ✓ {t.successMessage}
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                <DialogFooter>
                    <Button 
                        variant="outline" 
                        onClick={() => setOpen(false)}
                        disabled={loading}
                    >
                        {t.cancel}
                    </Button>
                    <Button 
                        onClick={handleInvite} 
                        disabled={loading || !email || !selectedRole || success}
                    >
                        {loading ? (
                            t.sending
                        ) : (
                            <>
                                <Send className="h-4 w-4 mr-2" />
                                {t.sendInvitation}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
