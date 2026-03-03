import '@/app/globals.css'
import { Geist, Geist_Mono } from "next/font/google"
import Image from 'next/image'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: "RegiNor Self Check-in",
    description: "Self check-in for course participants",
    icons: {
        icon: '/favicon.svg',
    },
}

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export default function SelfCheckInLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" className="dark" suppressHydrationWarning>
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-slate-50`} suppressHydrationWarning>
                <div className="min-h-screen flex flex-col">
                    <header className="p-4 bg-slate-900 border-b border-slate-800 flex justify-center">
                        <Image
                            src="/logo-light.svg"
                            alt="RegiNor Self Check-in"
                            width={160}
                            height={36}
                            priority
                        />
                    </header>
                    <main className="flex-1 flex flex-col">
                        {children}
                    </main>
                </div>
            </body>
        </html>
    )
}
