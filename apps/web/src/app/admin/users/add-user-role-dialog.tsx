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
import { searchUserByEmail, addUserRole } from '@/app/actions/users'
import { UserPlus, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type Organizer = {
    id: string
    name: string
}

const ALL_ROLES = [
    { value: 'ADMIN', label: 'Global Admin', requiresOrg: false },
    { value: 'ORG_ADMIN', label: 'Org Admin', requiresOrg: true },
    { value: 'ORG_FINANCE', label: 'Finance', requiresOrg: true },
    { value: 'ORG_CHECKIN', label: 'Check-in', requiresOrg: true },
    { value: 'INSTRUCTOR', label: 'Instructor', requiresOrg: true },
    { value: 'CHECKIN', label: 'Global Check-in', requiresOrg: false },
    { value: 'STAFF', label: 'Staff', requiresOrg: true },
    { value: 'PARTICIPANT', label: 'Participant', requiresOrg: false },
] as const

export function AddUserRoleDialog({ 
    organizers, 
    selectedOrgId,
    preselectedUser
}: { 
    organizers: Organizer[]
    selectedOrgId: string | null
    preselectedUser?: {
        id: string
        email: string
        personProfile: { firstName: string; lastName: string } | null
        roles: Array<{ id: string; role: string; Organizer?: { name: string } | null }>
    } | null
}) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [email, setEmail] = useState(preselectedUser?.email || '')
    const [selectedRole, setSelectedRole] = useState('')
    const [selectedOrganizerId, setSelectedOrganizerId] = useState(selectedOrgId || '')
    const [searchedUser, setSearchedUser] = useState<{
        id: string
        email: string
        personProfile: { firstName: string; lastName: string } | null
        roles: Array<{ id: string; role: string; Organizer?: { name: string } | null }>
    } | null>(preselectedUser || null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSearch = async () => {
        if (!email.trim()) {
            setError('Please enter an email address')
            return
        }

        setLoading(true)
        setError('')
        setSearchedUser(null)

        try {
            const user = await searchUserByEmail(email.trim())
            if (user) {
                setSearchedUser({
                    id: user.id,
                    email: user.email,
                    personProfile: user.PersonProfile ? {
                        firstName: user.PersonProfile.firstName,
                        lastName: user.PersonProfile.lastName
                    } : null,
                    roles: user.UserAccountRole.map(r => ({
                        id: r.id,
                        role: r.role,
                        Organizer: r.Organizer
                    }))
                })
            } else {
                setError('User not found')
            }
        } catch {
            setError('Failed to search for user')
        } finally {
            setLoading(false)
        }
    }

    const handleAddRole = async () => {
        if (!searchedUser || !selectedRole) {
            setError('Please select a role')
            return
        }

        const role = ALL_ROLES.find(r => r.value === selectedRole)
        if (role?.requiresOrg && !selectedOrganizerId) {
            setError('Please select an organization for this role')
            return
        }

        setLoading(true)
        setError('')

        try {
            await addUserRole(
                searchedUser.id,
                selectedRole,
                role?.requiresOrg ? selectedOrganizerId : undefined
            )
            
            setOpen(false)
            resetForm()
            router.refresh()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add role')
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setEmail(preselectedUser?.email || '')
        setSelectedRole('')
        setSelectedOrganizerId(selectedOrgId || '')
        setSearchedUser(preselectedUser || null)
        setError('')
    }

    const selectedRoleInfo = ALL_ROLES.find(r => r.value === selectedRole)

    return (
        <Dialog open={open} onOpenChange={(isOpen: boolean) => {
            setOpen(isOpen)
            if (!isOpen) resetForm()
        }}>
            <DialogTrigger asChild>
                <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add User Role
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Add User Role</DialogTitle>
                    <DialogDescription>
                        Search for a user by email and assign them a role.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Email Search - Only show if user is not preselected */}
                    {!preselectedUser && (
                        <div className="space-y-2">
                            <Label htmlFor="email">User Email</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="user@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={loading || !!searchedUser}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleSearch()
                                        }
                                    }}
                                />
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={handleSearch}
                                    disabled={loading || !!searchedUser}
                                >
                                    <Search className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Found User Display */}
                    {searchedUser && (
                        <div className="rounded-lg border p-4 bg-muted/50">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="font-medium">
                                        {searchedUser.personProfile
                                            ? `${searchedUser.personProfile.firstName} ${searchedUser.personProfile.lastName}`
                                            : 'No profile'}
                                    </p>
                                    <p className="text-sm text-muted-foreground">{searchedUser.email}</p>
                                    {searchedUser.roles.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {searchedUser.roles.map((role) => (
                                                <Badge key={role.id} variant="secondary" className="text-xs">
                                                    {role.role}
                                                    {role.Organizer && ` @ ${role.Organizer.name}`}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setSearchedUser(null)
                                        setEmail('')
                                    }}
                                >
                                    Change
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Role Selection */}
                    {searchedUser && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="role">Role</Label>
                                <Select value={selectedRole} onValueChange={setSelectedRole}>
                                    <SelectTrigger id="role">
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ALL_ROLES.map((role) => (
                                            <SelectItem key={role.value} value={role.value}>
                                                {role.label}
                                                {role.requiresOrg ? ' (org-specific)' : ' (global)'}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Organization Selection (if required) */}
                            {selectedRoleInfo?.requiresOrg && (
                                <div className="space-y-2">
                                    <Label htmlFor="organizer">Organization</Label>
                                    <Select value={selectedOrganizerId} onValueChange={setSelectedOrganizerId}>
                                        <SelectTrigger id="organizer">
                                            <SelectValue placeholder="Select an organization" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {organizers.map((org) => (
                                                <SelectItem key={org.id} value={org.id}>
                                                    {org.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </>
                    )}

                    {/* Error Display */}
                    {error && (
                        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                            <p className="text-sm text-destructive">{error}</p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setOpen(false)}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleAddRole}
                        disabled={loading || !searchedUser || !selectedRole}
                    >
                        {loading ? 'Adding...' : 'Add Role'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
