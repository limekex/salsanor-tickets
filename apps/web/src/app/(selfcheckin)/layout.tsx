import '@/app/globals.css'
import { Inter } from "next/font/google"
import Image from 'next/image'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: "RegiNor Self Check-in",
    description: "Self check-in for course participants",
    icons: {
        icon: '/favicon.svg',
    },
}

const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
});

export default function SelfCheckInLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${inter.variable} font-sans antialiased bg-rn-bg text-rn-text`} suppressHydrationWarning>
                <div className="min-h-screen flex flex-col">
                    <header className="p-rn-4 bg-rn-surface border-b border-rn-border flex justify-center">
                        <Image
                            src="/logo-dark.svg"
                            alt="RegiNor Self Check-in"
                            width={160}
                            height={36}
                            priority
                        />
                    </header>
                    <main className="flex-1 flex flex-col bg-rn-bg">
                        {children}
                    </main>
                </div>
            </body>
        </html>
    )
}
