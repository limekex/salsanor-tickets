import { redirect } from 'next/navigation'

/**
 * Legacy /profile route - redirects to new /my portal
 * 
 * The participant portal has been reorganized:
 * - /profile -> /my (main dashboard)
 * - Individual sections now available at /my/tickets, /my/courses, /my/memberships
 */
export default async function ProfilePage() {
    // Redirect to new portal location
    redirect('/my')
}
