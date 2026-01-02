
'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { login, signup } from '@/app/actions/auth'
import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)
    const router = useRouter()

    async function handleLogin(formData: FormData) {
        setError(null)
        setMessage(null)
        startTransition(async () => {
            const result = await login(null, formData)
            if (result?.error) {
                setError(result.error)
            }
        })
    }

    async function handleSignup(formData: FormData) {
        setError(null)
        setMessage(null)
        startTransition(async () => {
            const result = await signup(null, formData)
            if (result?.error) {
                setError(result.error)
            } else if (result?.message) {
                setMessage(result.message)
            }
        })
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-rn-surface-2 px-rn-4">
            <Tabs defaultValue="login" className="w-full max-w-[400px]">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Login</TabsTrigger>
                    <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                    <Card>
                        <CardHeader>
                            <CardTitle>Login</CardTitle>
                            <CardDescription>
                                Enter your email below to login to your account.
                            </CardDescription>
                        </CardHeader>
                        <form action={handleLogin}>
                            <CardContent className="space-y-rn-2">
                                <div className="space-y-rn-1">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" name="email" type="email" placeholder="m@example.com" required />
                                </div>
                                <div className="space-y-rn-1">
                                    <Label htmlFor="password">Password</Label>
                                    <Input id="password" name="password" type="password" required />
                                </div>
                                {error && <p className="rn-caption text-rn-danger">{error}</p>}
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full" disabled={isPending}>
                                    {isPending ? 'Logging in...' : 'Login'}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                </TabsContent>

                <TabsContent value="signup">
                    <Card>
                        <CardHeader>
                            <CardTitle>Sign Up</CardTitle>
                            <CardDescription>
                                Create a new account to register for courses.
                            </CardDescription>
                        </CardHeader>
                        <form action={handleSignup}>
                            <CardContent className="space-y-rn-2">
                                <div className="space-y-rn-1">
                                    <Label htmlFor="signup-email">Email</Label>
                                    <Input id="signup-email" name="email" type="email" required />
                                </div>
                                <div className="space-y-rn-1">
                                    <Label htmlFor="signup-password">Password</Label>
                                    <Input id="signup-password" name="password" type="password" required />
                                </div>
                                {error && <p className="rn-caption text-rn-danger">{error}</p>}
                                {message && <p className="rn-caption text-rn-success">{message}</p>}
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full" disabled={isPending}>
                                    {isPending ? 'Creating Account...' : 'Sign Up'}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
