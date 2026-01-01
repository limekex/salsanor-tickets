'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export function AuthCodeHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const code = searchParams.get('code')

  useEffect(() => {
    if (code) {
      // Redirect to /auth/confirm with the code
      router.replace(`/auth/confirm?code=${code}`)
    }
  }, [code, router])

  return null
}
