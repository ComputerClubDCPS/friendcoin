"use client"

import * as Sentry from "@sentry/nextjs"
import NextError from "next/error"
import { useEffect } from "react"

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string }
}) {
  useEffect(() => {
    // Filter out Vercel Live Feedback storage errors to avoid noise
    const isVercelFeedbackError = 
      error.message?.includes("Cannot read properties of null (reading 'getItem')") &&
      error.stack?.includes("_next-live/feedback/instrument")
    
    if (!isVercelFeedbackError) {
      Sentry.captureException(error)
    } else {
      // Log locally for debugging but don't send to Sentry
      console.warn("Filtered Vercel Live Feedback storage error:", error.message)
    }
  }, [error])

  return (
    <html>
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  )
}
