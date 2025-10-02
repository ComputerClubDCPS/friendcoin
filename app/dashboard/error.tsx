"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FriendCoinLogo } from "@/components/friendcoin-logo"
import { AlertCircle } from "lucide-react"
import * as Sentry from "@sentry/nextjs"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to Sentry
    Sentry.captureException(error, {
      tags: { 
        location: "dashboard_error_boundary",
        error_type: "corrupted_auth_cookie"
      },
      extra: { 
        digest: error.digest,
        message: error.message
      },
    })
  }, [error])

  const handleClearAndSignIn = () => {
    // Clear all cookies by setting them to expire
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`)
    })
    
    // Redirect to sign in page
    window.location.href = "/auth/signin"
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <FriendCoinLogo size={48} />
          </div>
          <CardTitle className="flex items-center justify-center gap-2 text-xl">
            <AlertCircle className="h-6 w-6 text-amber-600" />
            Authentication Error
          </CardTitle>
          <CardDescription>
            We encountered an issue loading your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Your authentication session appears to be corrupted or invalid. This can happen due to browser 
              data issues or network problems.
            </p>
          </div>
          
          <div className="space-y-2">
            <Button 
              onClick={handleClearAndSignIn} 
              className="w-full"
              size="lg"
            >
              Clear Session & Sign In Again
            </Button>
            
            <Button 
              onClick={reset} 
              variant="outline" 
              className="w-full"
            >
              Try Again
            </Button>
          </div>

          {error.digest && (
            <p className="text-xs text-gray-500 text-center font-mono">
              Error ID: {error.digest}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
