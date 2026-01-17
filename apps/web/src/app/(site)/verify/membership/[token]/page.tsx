import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, XCircle, Calendar, User, Building2 } from 'lucide-react'
import { format } from 'date-fns'

interface Props {
    params: Promise<{ token: string }>
}

export default async function VerifyMembershipPage({ params }: Props) {
    const resolvedParams = await params
    const token = resolvedParams.token

    if (!token) {
        notFound()
    }

    // Find membership by verification token
    const membership = await prisma.membership.findUnique({
        where: { verificationToken: token },
        include: {
            PersonProfile: true,
            MembershipTier: true,
            Organizer: true
        }
    })

    if (!membership) {
        return (
            <main className="container mx-auto py-rn-7 px-rn-4">
                <div className="max-w-2xl mx-auto">
                    <Card className="border-red-200 dark:border-red-800">
                        <CardHeader className="text-center">
                            <div className="flex justify-center mb-4">
                                <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-3">
                                    <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                                </div>
                            </div>
                            <CardTitle className="text-2xl text-red-600 dark:text-red-400">
                                Invalid Verification Code
                            </CardTitle>
                            <CardDescription>
                                This membership verification code is not valid
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </div>
            </main>
        )
    }

    // Check if membership is active
    const isActive = membership.status === 'ACTIVE' && new Date(membership.validTo) >= new Date()
    const isExpired = new Date(membership.validTo) < new Date()

    return (
        <main className="container mx-auto py-rn-7 px-rn-4">
            <div className="max-w-2xl mx-auto space-y-6">
                <Card className={isActive ? 'border-green-200 dark:border-green-800' : 'border-yellow-200 dark:border-yellow-800'}>
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            <div className={`rounded-full p-3 ${
                                isActive 
                                    ? 'bg-green-100 dark:bg-green-900/20' 
                                    : 'bg-yellow-100 dark:bg-yellow-900/20'
                            }`}>
                                {isActive ? (
                                    <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                                ) : (
                                    <XCircle className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                                )}
                            </div>
                        </div>
                        <CardTitle className="text-2xl">
                            {isActive ? 'Valid Membership' : isExpired ? 'Expired Membership' : 'Inactive Membership'}
                        </CardTitle>
                        <CardDescription>
                            Membership verification for {membership.Organizer.name}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {isActive && (
                            <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-green-800 dark:text-green-400">
                                    This membership is currently active and valid
                                </AlertDescription>
                            </Alert>
                        )}

                        {!isActive && isExpired && (
                            <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                                <XCircle className="h-4 w-4 text-yellow-600" />
                                <AlertDescription className="text-yellow-800 dark:text-yellow-400">
                                    This membership has expired
                                </AlertDescription>
                            </Alert>
                        )}

                        {!isActive && !isExpired && (
                            <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                                <XCircle className="h-4 w-4 text-yellow-600" />
                                <AlertDescription className="text-yellow-800 dark:text-yellow-400">
                                    This membership is not currently active (Status: {membership.status})
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Member Photo */}
                        {membership.PersonProfile.photoUrl && (
                            <div className="flex justify-center">
                                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary">
                                    <img 
                                        src={membership.PersonProfile.photoUrl} 
                                        alt={`${membership.PersonProfile.firstName} ${membership.PersonProfile.lastName}`}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Membership Details */}
                        <div className="space-y-4">
                            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                                <User className="h-5 w-5 mt-0.5 text-muted-foreground" />
                                <div>
                                    <div className="text-sm text-muted-foreground">Member Name</div>
                                    <div className="font-semibold text-lg">
                                        {membership.PersonProfile.firstName} {membership.PersonProfile.lastName}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                                <Building2 className="h-5 w-5 mt-0.5 text-muted-foreground" />
                                <div>
                                    <div className="text-sm text-muted-foreground">Organization</div>
                                    <div className="font-semibold">{membership.Organizer.name}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-muted rounded-lg">
                                    <div className="text-sm text-muted-foreground">Membership Tier</div>
                                    <Badge className="mt-1">{membership.MembershipTier.name}</Badge>
                                </div>
                                <div className="p-3 bg-muted rounded-lg">
                                    <div className="text-sm text-muted-foreground">Member Number</div>
                                    <div className="font-mono font-semibold mt-1">
                                        {membership.memberNumber || 'Not assigned'}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                                <Calendar className="h-5 w-5 mt-0.5 text-muted-foreground" />
                                <div className="flex-1">
                                    <div className="text-sm text-muted-foreground">Validity Period</div>
                                    <div className="font-semibold">
                                        {format(membership.validFrom, 'MMM dd, yyyy')} - {format(membership.validTo, 'MMM dd, yyyy')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </main>
    )
}
