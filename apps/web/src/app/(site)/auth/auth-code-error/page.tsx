'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { XCircle, Mail, Loader2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

function AuthCodeErrorContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [errorCode, setErrorCode] = useState<string>('')
  const [errorDescription, setErrorDescription] = useState<string>('')
  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  useEffect(() => {
    // Try to get error from query params first
    let error = searchParams.get('error')
    let description = searchParams.get('error_description')
    
    // If not in query params, check hash fragment
    if (!error && typeof window !== 'undefined') {
      const hash = window.location.hash.substring(1)
      const params = new URLSearchParams(hash)
      error = params.get('error')
      description = params.get('error_description')
      
      // If we found errors in hash, update URL to use query params instead
      if (error) {
        const url = new URL(window.location.href)
        url.hash = ''
        url.searchParams.set('error', error)
        if (description) {
          url.searchParams.set('error_description', description)
        }
        window.history.replaceState({}, '', url.toString())
      }
    }
    
    setErrorCode(error || 'unknown')
    setErrorDescription(description || 'An unknown error occurred')
  }, [searchParams])

  const handleResendLink = async () => {
    // For password reset errors, redirect to forgot password page
    if (errorCode === 'otp_expired' || errorDescription?.toLowerCase().includes('email link')) {
      router.push('/auth/forgot-password')
    }
  }

  const isPasswordResetError = errorCode === 'otp_expired' || 
    errorCode === 'pkce_error' ||
    errorDescription?.toLowerCase().includes('email link') ||
    errorDescription?.toLowerCase().includes('expired') ||
    errorDescription?.toLowerCase().includes('pkce') ||
    errorDescription?.toLowerCase().includes('code verifier')

  const isPKCEError = errorCode === 'pkce_error' || 
    errorDescription?.toLowerCase().includes('pkce') ||
    errorDescription?.toLowerCase().includes('code verifier')

  return (
    <div className="min-h-screen flex items-center justify-center bg-rn-surface px-rn-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-3">
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <CardTitle>
            {isPKCEError ? 'Browser Mismatch' : isPasswordResetError ? 'Link Expired' : 'Verification Failed'}
          </CardTitle>
          <CardDescription>
            {errorDescription || 'The email verification link is invalid or has expired'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {resendSuccess ? (
            <div className="text-sm text-center text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-3 rounded">
              Check your email for a new link
            </div>
          ) : (
            <>
              <p className="text-sm text-center text-muted-foreground">
                {isPKCEError
                  ? 'For security reasons, password reset links must be opened in the same browser where you requested them. Please go back to that browser and request a new link, or copy the full URL from your email and paste it into the correct browser.'
                  : isPasswordResetError 
                    ? 'Password reset links expire after a short time for security. Request a new one to continue.'
                    : 'This can happen if the link has already been used or if it has expired.'}
              </p>
              <div className="flex flex-col gap-2">
                {isPasswordResetError && (
                  <Button 
                    onClick={handleResendLink} 
                    disabled={isResending}
                    className="w-full"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    {isResending ? 'Sending...' : 'Request New Password Reset Link'}
                  </Button>
                )}
                <Button asChild variant={isPasswordResetError ? 'outline' : 'default'} className="w-full">
                  <Link href="/auth/login">Back to Login</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/">Go to Home</Link>
                </Button>
              </div>
            </>
          )}
          {errorCode && (
            <p className="text-xs text-center text-muted-foreground">
              Error code: {errorCode}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function AuthCodeErrorLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-rn-surface px-rn-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AuthCodeErrorPage() {
  return (
    <Suspense fallback={<AuthCodeErrorLoading />}>
      <AuthCodeErrorContent />
    </Suspense>
  )
}