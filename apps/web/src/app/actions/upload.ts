'use server'

import { createClient } from '@/utils/supabase/server'
import { randomUUID } from 'crypto'

const TRACK_IMAGES_BUCKET = 'track-images'

export async function uploadTrackImage(formData: FormData): Promise<{ url?: string; error?: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Unauthorized' }
    }

    const file = formData.get('file') as File
    
    if (!file) {
        return { error: 'No file provided' }
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
        return { error: 'Invalid file type. Allowed: JPEG, PNG, WebP' }
    }

    // Validate file size (2MB)
    const maxSize = 2 * 1024 * 1024
    if (file.size > maxSize) {
        return { error: 'File too large. Maximum: 2MB' }
    }

    // Generate unique filename
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const filename = `${randomUUID()}.${ext}`
    const path = `tracks/${filename}`

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { data, error } = await supabase.storage
        .from(TRACK_IMAGES_BUCKET)
        .upload(path, buffer, {
            contentType: file.type,
            cacheControl: '3600',
            upsert: false
        })

    if (error) {
        console.error('Supabase storage error:', error)
        return { error: error.message }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
        .from(TRACK_IMAGES_BUCKET)
        .getPublicUrl(data.path)

    return { url: urlData.publicUrl }
}

export async function deleteTrackImage(url: string): Promise<{ success?: boolean; error?: string }> {
    if (!url) return { success: true }
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Unauthorized' }
    }

    // Extract path from URL
    const urlObj = new URL(url)
    const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/track-images\/(.+)/)
    
    if (!pathMatch) {
        return { error: 'Invalid image URL' }
    }

    const path = pathMatch[1]

    const { error } = await supabase.storage
        .from(TRACK_IMAGES_BUCKET)
        .remove([path])

    if (error) {
        console.error('Supabase storage delete error:', error)
        return { error: error.message }
    }

    return { success: true }
}
