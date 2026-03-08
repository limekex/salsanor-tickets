import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { 
    ArrowLeft, 
    HelpCircle, 
    CreditCard, 
    GraduationCap, 
    Ticket, 
    User, 
    Shield,
    MessageCircle,
    ExternalLink
} from 'lucide-react'
import { UI_TEXT } from '@/lib/i18n'
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"

export default async function HelpPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    return (
        <main className="container mx-auto py-rn-7 px-rn-4">
            <div className="max-w-3xl mx-auto space-y-rn-6">
                {/* Header */}
                <div className="flex items-center gap-rn-4 mb-rn-6">
                    <Button asChild variant="ghost" size="sm">
                        <Link href="/my">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            {UI_TEXT.common.backToPortal}
                        </Link>
                    </Button>
                </div>

                <div className="mb-rn-6">
                    <h1 className="rn-h1 flex items-center gap-2">
                        <HelpCircle className="h-8 w-8" />
                        Help & FAQ
                    </h1>
                    <p className="rn-meta text-rn-text-muted">
                        Find answers to common questions about courses, tickets, and more
                    </p>
                </div>

                {/* Quick Help Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <a href="#courses">
                        <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                            <CardContent className="pt-6 text-center">
                                <GraduationCap className="h-8 w-8 mx-auto mb-2 text-primary" />
                                <p className="text-sm font-medium">Courses</p>
                            </CardContent>
                        </Card>
                    </a>
                    <a href="#tickets">
                        <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                            <CardContent className="pt-6 text-center">
                                <Ticket className="h-8 w-8 mx-auto mb-2 text-primary" />
                                <p className="text-sm font-medium">Tickets</p>
                            </CardContent>
                        </Card>
                    </a>
                    <a href="#payments">
                        <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                            <CardContent className="pt-6 text-center">
                                <CreditCard className="h-8 w-8 mx-auto mb-2 text-primary" />
                                <p className="text-sm font-medium">Payments</p>
                            </CardContent>
                        </Card>
                    </a>
                    <a href="#account">
                        <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                            <CardContent className="pt-6 text-center">
                                <User className="h-8 w-8 mx-auto mb-2 text-primary" />
                                <p className="text-sm font-medium">Account</p>
                            </CardContent>
                        </Card>
                    </a>
                </div>

                {/* FAQ Sections */}
                <div className="space-y-6">
                    {/* Account & Profile */}
                    <Card id="account">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Account & Profile
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="update-profile">
                                    <AccordionTrigger>How do I update my profile information?</AccordionTrigger>
                                    <AccordionContent>
                                        <p>Go to <Link href="/my/settings" className="text-primary hover:underline">Settings</Link> from your dashboard. 
                                        You can update your name, phone number, emergency contact, and other personal details.</p>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="change-email">
                                    <AccordionTrigger>Can I change my email address?</AccordionTrigger>
                                    <AccordionContent>
                                        <p>Email changes require verification. Go to Settings and update your email. 
                                        You&apos;ll receive a verification link to confirm the new address.</p>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="delete-account">
                                    <AccordionTrigger>How do I delete my account?</AccordionTrigger>
                                    <AccordionContent>
                                        <p>Account deletion must be requested through the organization admin or by contacting support. 
                                        Note that this will cancel any active registrations.</p>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </CardContent>
                    </Card>

                    {/* Course Registration */}
                    <Card id="courses">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <GraduationCap className="h-5 w-5" />
                                Course Registration
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="register-course">
                                    <AccordionTrigger>How do I register for a course?</AccordionTrigger>
                                    <AccordionContent>
                                        <p>Browse available courses from the <Link href="/courses" className="text-primary hover:underline">Courses</Link> page. 
                                        Select a course, choose your role (leader/follower if applicable), add to cart, and complete checkout.</p>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="waitlist">
                                    <AccordionTrigger>How does the waitlist work?</AccordionTrigger>
                                    <AccordionContent>
                                        <p>If a course is full, you can join the waitlist. When a spot opens, you&apos;ll receive an email with a link to claim it. 
                                        You typically have 48 hours to complete payment before the spot goes to the next person.</p>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="cancel-registration">
                                    <AccordionTrigger>Can I cancel my registration?</AccordionTrigger>
                                    <AccordionContent>
                                        <p>Contact the organization admin to request cancellation. Refund eligibility depends on the organization&apos;s policy and timing.</p>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="attendance">
                                    <AccordionTrigger>How do I track my attendance?</AccordionTrigger>
                                    <AccordionContent>
                                        <p>Visit the <Link href="/my/attendance" className="text-primary hover:underline">Attendance</Link> page to see your check-in history, 
                                        attendance rate, and upcoming sessions. You can also register planned absences from your course page.</p>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="planned-absence">
                                    <AccordionTrigger>How do I report a planned absence?</AccordionTrigger>
                                    <AccordionContent>
                                        <p>Go to <Link href="/my/courses" className="text-primary hover:underline">My Courses</Link>, find your course, 
                                        and click &quot;Register Absence&quot;. Select the date and reason for your absence.</p>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </CardContent>
                    </Card>

                    {/* Tickets & Check-in */}
                    <Card id="tickets">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Ticket className="h-5 w-5" />
                                Tickets & Check-in
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="find-ticket">
                                    <AccordionTrigger>Where do I find my ticket?</AccordionTrigger>
                                    <AccordionContent>
                                        <p>Your tickets are available in <Link href="/my/tickets" className="text-primary hover:underline">My Tickets</Link> for events 
                                        and <Link href="/my/courses" className="text-primary hover:underline">My Courses</Link> for course registrations. 
                                        Each shows a QR code for check-in.</p>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="checkin">
                                    <AccordionTrigger>How does check-in work?</AccordionTrigger>
                                    <AccordionContent>
                                        <p>Show the QR code from your ticket to the check-in staff, or scan the venue&apos;s QR code if self-check-in is enabled. 
                                        You can also check in using your phone number at some venues.</p>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="wallet">
                                    <AccordionTrigger>Can I add my ticket to Apple/Google Wallet?</AccordionTrigger>
                                    <AccordionContent>
                                        <p>Yes! On your ticket page, look for the &quot;Add to Wallet&quot; buttons. 
                                        This lets you access your ticket quickly without logging in.</p>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </CardContent>
                    </Card>

                    {/* Payments */}
                    <Card id="payments">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5" />
                                Payments & Refunds
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="payment-methods">
                                    <AccordionTrigger>What payment methods are accepted?</AccordionTrigger>
                                    <AccordionContent>
                                        <p>We accept credit/debit cards, Apple Pay, and Google Pay through our secure Stripe payment processor.</p>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="payment-secure">
                                    <AccordionTrigger>Is my payment information secure?</AccordionTrigger>
                                    <AccordionContent>
                                        <p>Yes. We never store your card details. All payment processing is handled securely by Stripe, 
                                        a PCI-compliant payment processor.</p>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="refund">
                                    <AccordionTrigger>How do I request a refund?</AccordionTrigger>
                                    <AccordionContent>
                                        <p>Contact the organization admin to request a refund. Refund policies vary by organization. 
                                        Approved refunds typically appear in your account within 5-10 business days.</p>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="order-history">
                                    <AccordionTrigger>Where can I see my order history?</AccordionTrigger>
                                    <AccordionContent>
                                        <p>Visit <Link href="/my/orders" className="text-primary hover:underline">My Orders</Link> to see all your past purchases, 
                                        including order details, status, and totals.</p>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </CardContent>
                    </Card>

                    {/* Privacy & Security */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                Privacy & Security
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="data-stored">
                                    <AccordionTrigger>What data do you store about me?</AccordionTrigger>
                                    <AccordionContent>
                                        <p>We store your profile information (name, email, phone), registration history, and attendance records. 
                                        This data is used to provide our services and can be exported or deleted upon request.</p>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="gdpr">
                                    <AccordionTrigger>How do I exercise my GDPR rights?</AccordionTrigger>
                                    <AccordionContent>
                                        <p>Contact the organization admin or support to request data export or deletion. 
                                        We comply with GDPR and Norwegian data protection regulations.</p>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </CardContent>
                    </Card>
                </div>

                {/* Contact Support */}
                <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="pt-6">
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <div className="p-3 rounded-full bg-primary/10">
                                <MessageCircle className="h-6 w-6 text-primary" />
                            </div>
                            <div className="flex-1 text-center sm:text-left">
                                <h3 className="font-semibold">Still need help?</h3>
                                <p className="text-sm text-muted-foreground">
                                    Contact your organization&apos;s admin or reach out to our support team.
                                </p>
                            </div>
                            <Button variant="outline" asChild>
                                <a href="mailto:support@reginor.events">
                                    Contact Support
                                    <ExternalLink className="h-4 w-4 ml-2" />
                                </a>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </main>
    )
}
