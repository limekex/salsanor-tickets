import { redirect } from 'next/navigation'

/**
 * Legacy /profile/settings route - redirects to new /my/settings location
 * 
 * Settings have been moved to the participant portal structure
 */
export default async function ProfileSettingsPage() {
    redirect('/my/settings')
}
