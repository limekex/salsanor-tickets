import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/db";
import { OnboardingCheck } from "@/components/onboarding-check";
import { Toaster } from "sonner";
import { PublicNav } from "@/components/public-nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RegiNor.events - from signup to showtime",
  description: "Event, course and membership management platform",
  icons: {
    icon: '/favicon.svg',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Check if user needs onboarding and get user data
  let needsOnboarding = false
  let user = null
  let hasStaffRoles = false
  let isAdmin = false
  
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    user = authUser
    
    if (user) {
      const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: {
          personProfile: {
            select: { id: true }
          },
          roles: true
        }
      })

      needsOnboarding = !!userAccount && !userAccount.personProfile
      
      if (userAccount?.roles) {
        isAdmin = userAccount.roles.some(r => r.role === 'ADMIN' || r.role === 'ORGANIZER')
        hasStaffRoles = userAccount.roles.length > 0
      }
    }
  } catch (error) {
    console.error('Error checking onboarding status:', error)
  }

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <OnboardingCheck needsOnboarding={needsOnboarding} />
        <PublicNav user={user} hasStaffRoles={hasStaffRoles} isAdmin={isAdmin} />
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
