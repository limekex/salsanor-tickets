'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, XCircle, Mail } from 'lucide-react'
import { acceptInvitation } from '@/app/actions/staffadmin-invites'

type InvitationState = 'loading' | 'valid' | 'expired' | 'cancelled' | 'already_accepted' | 'not_found' | 'accepting' | 'success' | 'error'

interface InvitationData {
  email: string
  role: string
  organizationName: string
  expiresAt: string
}

// i18n-ready: These strings can be moved to a translation file
const t = {
  noTokenFound: 'No invitation token found in the URL.',
  invitationExpired: 'This invitation has expired. Contact the organization administrator for a new invitation.',
  invitationCancelled: 'This invitation has been cancelled.',
  invitationAlreadyAccepted: 'This invitation has already been accepted.',
  invitationNotFound: 'Could not find the invitation.',
  verificationError: 'An error occurred while verifying the invitation.',
  acceptError: 'Could not accept the invitation.',
  acceptingError: 'An error occurred while accepting the invitation.',
  verifyingInvitation: 'Verifying invitation...',
  invitationAccepted: 'Invitation accepted!',
  youNowHaveAccess: (org: string, role: string) => `You now have access to ${org} as ${role}.`,
  redirectingToDashboard: 'Redirecting to dashboard...',
  expiredTitle: 'Invitation Expired',
  cancelledTitle: 'Invitation Cancelled',
  alreadyAcceptedTitle: 'Invitation Already Used',
  notFoundTitle: 'Invitation Not Found',
  errorTitle: 'Error',
  goToHome: 'Go to Home',
  youAreInvited: "You're Invited!",
  invitedToJoin: (org: string) => `You have been invited to join ${org}`,
  email: 'Email',
  role: 'Role',
  expires: 'Expires',
  accepting: 'Accepting...',
  acceptInvitation: 'Accept Invitation',
  loggedInAsDifferent: (current: string, invited: string) => 
    `You are logged in as ${current}, but the invitation was sent to ${invited}.`,
  acceptWithThisAccount: 'Accept anyway with this account',
  toAcceptSignIn: 'To accept the invitation, please sign in or create an account.',
  signIn: 'Sign In',
  createAccount: 'Create Account',
  loading: 'Loading...',
  roles: {
    ADMIN: 'Administrator',
    ORG_ADMIN: 'Organization Admin',
    ORG_FINANCE: 'Finance Manager',
    ORG_CHECKIN: 'Check-in Staff',
    STAFF: 'Staff',
    INSTRUCTOR: 'Instructor',
    CHECKIN: 'Check-in',
    PARTICIPANT: 'Participant',
  } as Record<string, string>,
}

function AcceptInviteContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  
  const [state, setState] = useState<InvitationState>('loading')
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [loggedInEmail, setLoggedInEmail] = useState<string | null>(null)

  // Check invitation validity and auth status
  useEffect(() => {
    async function checkInvitation() {
      if (!token) {
        setState('not_found')
        setErrorMessage(t.noTokenFound)
        return
      }

      const supabase = createClient()
      
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)
      setLoggedInEmail(user?.email || null)

      // Verify the invitation token
      try {
        const response = await fetch(`/api/invitations/verify?token=${token}`)
        const data = await response.json()

        if (!response.ok) {
          if (data.status === 'EXPIRED') {
            setState('expired')
            setErrorMessage(t.invitationExpired)
          } else if (data.status === 'CANCELLED') {
            setState('cancelled')
            setErrorMessage(t.invitationCancelled)
          } else if (data.status === 'ACCEPTED') {
            setState('already_accepted')
            setErrorMessage(t.invitationAlreadyAccepted)
          } else {
            setState('not_found')
            setErrorMessage(data.error || t.invitationNotFound)
          }
          return
        }

        setInvitationData(data)
        setState('valid')
      } catch (error) {
        console.error('Error verifying invitation:', error)
        setState('error')
        setErrorMessage(t.verificationError)
      }
    }

    checkInvitation()
  }, [token])

  const handleAcceptInvitation = async () => {
    if (!token) return

    setState('accepting')

    try {
      const result = await acceptInvitation(token)

      if (result.success) {
        setState('success')
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      } else {
        setState('error')
        const errorMsg = result.error?._form?.[0] || t.acceptError
        setErrorMessage(errorMsg)
      }
    } catch (error) {
      console.error('Error accepting invitation:', error)
      setState('error')
      setErrorMessage(t.acceptingError)
    }
  }

  const handleSignIn = () => {
    // Redirect to sign in with return URL
    router.push(`/login?redirect=${encodeURIComponent(`/auth/accept-invite?token=${token}`)}`)
  }

  const handleSignUp = () => {
    // Redirect to sign up with email pre-filled
    const signUpUrl = invitationData?.email 
      ? `/signup?email=${encodeURIComponent(invitationData.email)}&redirect=${encodeURIComponent(`/auth/accept-invite?token=${token}`)}`
      : `/signup?redirect=${encodeURIComponent(`/auth/accept-invite?token=${token}`)}`
    router.push(signUpUrl)
  }

  // Translate role to human-readable label
  const translateRole = (role: string): string => {
    return t.roles[role] || role
  }

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">{t.verifyingInvitation}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (state === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <h2 className="text-xl font-semibold">{t.invitationAccepted}</h2>
              <p className="text-muted-foreground text-center">
                {invitationData && t.youNowHaveAccess(invitationData.organizationName, translateRole(invitationData.role))}
              </p>
              <p className="text-sm text-muted-foreground">
                {t.redirectingToDashboard}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (['expired', 'cancelled', 'already_accepted', 'not_found', 'error'].includes(state)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <XCircle className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle>
              {state === 'expired' && t.expiredTitle}
              {state === 'cancelled' && t.cancelledTitle}
              {state === 'already_accepted' && t.alreadyAcceptedTitle}
              {state === 'not_found' && t.notFoundTitle}
              {state === 'error' && t.errorTitle}
            </CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => router.push('/')}
            >
              {t.goToHome}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Valid invitation - show accept UI
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Mail className="h-12 w-12 text-primary" />
          </div>
          <CardTitle>{t.youAreInvited}</CardTitle>
          <CardDescription>
            {invitationData && t.invitedToJoin(invitationData.organizationName)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.email}:</span>
              <span className="font-medium">{invitationData?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.role}:</span>
              <span className="font-medium">{invitationData && translateRole(invitationData.role)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.expires}:</span>
              <span className="font-medium">
                {invitationData?.expiresAt && new Date(invitationData.expiresAt).toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
            </div>
          </div>

          {isLoggedIn === null ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : isLoggedIn ? (
            // User is logged in - check if email matches
            <>
              {loggedInEmail === invitationData?.email ? (
                <Button 
                  className="w-full" 
                  onClick={handleAcceptInvitation}
                  disabled={state === 'accepting'}
                >
                  {state === 'accepting' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t.accepting}
                    </>
                  ) : (
                    t.acceptInvitation
                  )}
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      {loggedInEmail && invitationData?.email && t.loggedInAsDifferent(loggedInEmail, invitationData.email)}
                    </p>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={handleAcceptInvitation}
                    disabled={state === 'accepting'}
                  >
                    {state === 'accepting' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t.accepting}
                      </>
                    ) : (
                      t.acceptWithThisAccount
                    )}
                  </Button>
                </div>
              )}
            </>
          ) : (
            // User is not logged in
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                {t.toAcceptSignIn}
              </p>
              <div className="grid gap-2">
                <Button className="w-full" onClick={handleSignIn}>
                  {t.signIn}
                </Button>
                <Button variant="outline" className="w-full" onClick={handleSignUp}>
                  {t.createAccount}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function AcceptInviteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">{t.loading}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<AcceptInviteLoading />}>
      <AcceptInviteContent />
    </Suspense>
  )
}