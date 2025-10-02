import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import * as Sentry from "@sentry/nextjs"

export async function POST(request: NextRequest) {
  return Sentry.withServerActionInstrumentation(
    "validate-payment-post",
    async () => {
      try {
        const apiKey = request.headers.get("authorization")?.replace("Bearer ", "")

        if (!apiKey) {
          Sentry.captureMessage("Missing API key in payment validation", "warning")
          return NextResponse.json({ error: "API key required" }, { status: 401 })
        }

        // Verify API key
        const { data: keyData, error: keyError } = await supabase
          .from("api_keys")
          .select("user_id")
          .eq("api_key", apiKey)
          .eq("is_active", true)
          .single()

        if (keyError || !keyData) {
          Sentry.captureMessage("Invalid API key used in payment validation", "warning", {
            extra: { api_key_prefix: apiKey.substring(0, 8) + "..." }
          })
          return NextResponse.json({ error: "Invalid API key" }, { status: 401 })
        }

        const body = await request.json()
        const { validation_token } = body

        if (!validation_token) {
          Sentry.captureMessage("Payment validation request missing token", "warning", {
            extra: { user_id: keyData.user_id }
          })
          return NextResponse.json({ error: "Validation token required" }, { status: 400 })
        }

        // Find and validate the payment token
        const { data: paymentData, error: paymentError } = await supabase
          .from("payment_validations")
          .select("*")
          .eq("validation_token", validation_token)
          .single()

        if (paymentError || !paymentData) {
          if (paymentError) {
            Sentry.captureException(paymentError, {
              tags: { operation: "payment_validation_fetch" },
              extra: { user_id: keyData.user_id, validation_token }
            })
          }
          return NextResponse.json({
            success: true,
            valid: false,
            message: "Invalid or expired token",
          })
        }

        // Check if token has expired
        const now = new Date()
        const expiresAt = new Date(paymentData.expires_at)

        if (now > expiresAt) {
          return NextResponse.json({
            success: true,
            valid: false,
            message: "Token has expired",
          })
        }

        // Check if payment is completed
        if (paymentData.status !== "completed") {
          return NextResponse.json({
            success: true,
            valid: false,
            message: "Payment not completed",
          })
        }

        return NextResponse.json({
          success: true,
          valid: true,
          payment: {
            amount_friendcoins: paymentData.amount_friendcoins,
            amount_friendship_fractions: paymentData.amount_friendship_fractions,
            payment_method: paymentData.payment_method,
            status: paymentData.status,
            created_at: paymentData.created_at,
          },
        })
      } catch (error) {
        console.error("Payment validation API error:", error)
        Sentry.captureException(error, {
          tags: { operation: "validate_payment_error" },
          extra: { request_url: request.url }
        })
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
      }
    }
  )
}
