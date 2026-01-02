
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

export default function SuccessPage({ searchParams }: { searchParams: { orderId: string } }) {
    return (
        <main className="container max-w-md mx-auto py-rn-20 px-rn-4 text-center space-y-rn-6">
            <div className="flex justify-center text-rn-success">
                <CheckCircle2 className="h-16 w-16" />
            </div>
            <h1 className="rn-h1">Payment Successful!</h1>
            <p className="rn-meta text-rn-text-muted">
                Thank you for your registration. You can now view your active courses and tickets in your profile.
            </p>
            <Button asChild size="lg">
                <Link href="/profile">Go to My Profile</Link>
            </Button>
        </main>
    )
}
