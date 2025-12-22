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
import { searchUserByEmailStaff, addUserRoleStaff } from '@/app/actions/staffadmin'
import { UserPlus, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type Organizer = {
    id: string
    name: string
    slug: string
}

const STAFF_ROLES = [
    { value: 'ORG_ADMIN', label: 'Org Admin' },
    { value: 'ORG_FINANCE', label: 'Finance' },
    { value: 'ORG_CHECKIN', label: 'Check-in' },
    { value: 'INSTRUCTOR', label: 'Instructor' },
    { value: 'STAFF', label: 'Staff' },
    { value: 'PARTICIPANT', label: 'Participant' },
] as const

export function StaffAddUserRoleDialog({ 
    organizer,
    preselectedUser
}: { 
    organizer: Organizer
    preselectedUser?: {
        id: string
        email: string
        personProfile: { firstName: string; lastName: string } | null
        roles: Array<{ id: string; role: string; organizer?: { name: string } | null }>
    } | null
}) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [email, setEmail] = useState(preselectedUser?.email || '')
    const [selectedRole, setSelectedRole] = useState('')
    const [searchedUser, setSearchedUser] = useState<{
        id: string
        email: string
        personProfile: { firstName: string; lastName: string } | null
        roles: Array<{ id: string; role: string; organizer?: { name: string } | null }>
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
            const user = await searchUserByEmailStaff(email.trim(), organizer.id)
            if (user) {
                setSearchedUser(user)
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

        setLoading(true)
        setError('')

        try {
            await addUserRoleStaff(
                searchedUser.id,
                selectedRole,
                organizer.id
            )
            
            setOpen(false)
            setEmail('')
            setSelectedRole('')
            setSearchedUser(null)
            router.refresh()
        } catch (e: any) {
            setError(e.message || 'Failed to add role')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add User Role
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>Add User Role - {organizer.name}</DialogTitle>
                    <DialogDescription>
                        Search for a user by email and assign them a role in your organization
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
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
                                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                    disabled={loading}
                                />
                                <Button onClick={handleSearch} disabled={loading} variant="outline">
                                    <Search className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {searchedUser && (
                        <div className="space-y-4 p-4 border rounded-lg">
                            <div>
                                <p className="font-medium">
                                    {searchedUser.personProfile
                                        ? `${searchedUser.personProfile.firstName} ${searchedUser.personProfile.lastName}`
                                        : 'No profile'}
                                </p>
                                <p className="text-sm text-muted-foreground">{searchedUser.email}</p>
                            </div>

                            {searchedUser.roles.length > 0 && (
                                <div>
                                    <Label className="text-sm font-medium">Current Roles in {organizer.name}:</Label>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {searchedUser.roles.map((role) => (
                                            <Badge key={role.id} variant="secondary">
                                                {role.role}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="role">Assign Role</Label>
                                <Select value={selectedRole} onValueChange={setSelectedRole}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STAFF_ROLES.map((role) => (
                                            <SelectItem key={role.value} value={role.value}>
                                                {role.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}
                </div>

                <DialogFooter>
                    {searchedUser && (
                        <Button onClick={handleAddRole} disabled={loading || !selectedRole}>
                            {loading ? 'Adding...' : 'Add Role'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
