
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

export default function SuccessPage({ searchParams }: { searchParams: { orderId: string } }) {
    return (
        <div className="container max-w-md mx-auto py-20 text-center space-y-6">
            <div className="flex justify-center text-green-600">
                <CheckCircle2 className="h-16 w-16" />
            </div>
            <h1 className="text-3xl font-bold">Payment Successful!</h1>
            <p className="text-muted-foreground">
                Thank you for your registration. You can now view your active courses and tickets in your profile.
            </p>
            <Button asChild size="lg">
                <Link href="/profile">Go to My Profile</Link>
            </Button>
        </div>
    )
}
