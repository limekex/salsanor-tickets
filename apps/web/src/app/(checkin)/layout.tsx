
import '@/app/globals.css'
import { Geist, Geist_Mono } from "next/font/google"

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

import { requireAdmin } from '@/utils/auth-admin'

export default async function CheckinLayout({
    children,
}: {
    children: React.ReactNode
}) {
    await requireAdmin()

    return (
        <html lang="en" className="dark">
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-slate-50`}>
                <div className="min-h-screen flex flex-col">
                    <header className="p-4 bg-slate-900 border-b border-slate-800 text-center font-bold">
                        SalsaNor Check-in
                    </header>
                    <main className="flex-1 flex flex-col">
                        {children}
                    </main>
                </div>
            </body>
        </html>
    )
}
