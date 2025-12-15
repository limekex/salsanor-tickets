'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(prevState: any, formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/', 'layout')
    redirect('/')
}

export async function signup(prevState: any, formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { data: authData, error } = await supabase.auth.signUp(data)

    if (error) {
        return { error: error.message }
    }

    // If user was created and session exists, ensure UserAccount exists
    if (authData.user && authData.session) {
        const { prisma } = await import('@/lib/db')
        
        // Wait a moment for trigger to fire
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Check if UserAccount was created, if not create it manually
        let userAccount = await prisma.userAccount.findUnique({
            where: { supabaseUid: authData.user.id }
        })

        if (!userAccount) {
            // Trigger didn't fire, create manually
            userAccount = await prisma.userAccount.create({
                data: {
                    supabaseUid: authData.user.id,
                    email: authData.user.email!
                }
            })
        }

        revalidatePath('/', 'layout')
        redirect('/onboarding')
    } else {
        // Email confirmation required
        return { message: 'Check your email to confirm your account.' }
    }
}

export async function signout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/auth/login')
}
