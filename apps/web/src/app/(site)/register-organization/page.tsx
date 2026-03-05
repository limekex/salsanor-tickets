import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, Building2, CheckCircle2, Mail } from 'lucide-react'

export const metadata = {
    title: 'Register as Organization | RegiNor',
    description: 'Register your organization to use RegiNor for course and event management.',
}

export default function RegisterOrganizationPage() {
    return (
        <main className="container mx-auto py-rn-7 px-rn-4">
            <div className="max-w-2xl mx-auto space-y-rn-6">
                {/* Header */}
                <div className="flex items-center gap-rn-4 mb-rn-6">
                    <Button asChild variant="ghost" size="sm">
                        <Link href="/">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Home
                        </Link>
                    </Button>
                </div>

                <div className="text-center mb-rn-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                        <Building2 className="h-8 w-8 text-primary" />
                    </div>
                    <h1 className="rn-h1">Register as Organization</h1>
                    <p className="rn-meta text-rn-text-muted mt-2">
                        Start managing your courses, events, and memberships with RegiNor
                    </p>
                </div>

                {/* Features */}
                <Card>
                    <CardHeader>
                        <CardTitle>What you get with RegiNor</CardTitle>
                        <CardDescription>Everything you need to run your organization</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                                <span>Course period management with tracks and registrations</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                                <span>Event ticketing with QR codes and mobile wallet support</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                                <span>Membership management with automatic renewals</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                                <span>Check-in system with attendance tracking and certificates</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                                <span>Finance reports and Stripe payment integration</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                                <span>Role-based staff access (admins, finance, instructors, check-in)</span>
                            </li>
                        </ul>
                    </CardContent>
                </Card>

                {/* Coming Soon Notice */}
                <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="p-3 rounded-full bg-primary/10">
                                <Mail className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold mb-2">Coming Soon</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Self-service organization registration is currently under development.
                                    Contact us to get started today.
                                </p>
                                <Button asChild>
                                    <a href="mailto:kontakt@salsanor.no?subject=Organization%20Registration%20Interest">
                                        Contact Us
                                    </a>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </main>
    )
}
