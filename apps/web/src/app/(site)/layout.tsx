import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/db";
import { OnboardingCheck } from "@/components/onboarding-check";
import { Toaster } from "sonner";
import { PublicNav } from "@/components/public-nav";
import { CartProvider } from "@/contexts/cart-context";

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
  
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    
    if (authUser) {
      const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: authUser.id },
        include: {
          PersonProfile: true,
        }
      })

      // User needs onboarding if they don't have a profile OR if they're missing consent
      needsOnboarding = !!userAccount && (
        !userAccount.PersonProfile || 
        !userAccount.PersonProfile.gdprConsentAt || 
        !userAccount.PersonProfile.touConsentAt
      )
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
        <CartProvider>
          <OnboardingCheck needsOnboarding={needsOnboarding} />
          <PublicNav />
          {children}
          <Toaster position="top-right" richColors />
        </CartProvider>
      </body>
    </html>
  );
}
