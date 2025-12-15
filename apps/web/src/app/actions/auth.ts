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

    const { error } = await supabase.auth.signUp(data)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/', 'layout')

    // If email confirmation is enabled, it might not log them in immediately, 
    // but for this dev setup it likely sends a magic link or just works if confirm is off.
    // Standard Supabase allows login after signup if confirm is off.
    // We'll redirect to a check-email page or root if implicitly logged in.

    // Let's assume for now we redirect to a success message or root.
    // Ideally, if 'session' exists, we are good.

    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
        redirect('/')
    } else {
        // Check email flow
        return { message: 'Check your email to confirm your account.' }
    }
}

export async function signout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/auth/login')
}
