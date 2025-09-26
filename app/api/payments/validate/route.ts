import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseServiceClient } from "@/lib/supabase-server"
import * as Sentry from "@sentry/nextjs"

export async function POST(request: NextRequest) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "POST /api/payments/validate",
    },
    async (span) => {
      try {
        const apiKey = request.headers.get("authorization")?.replace("Bearer ", "")

        if (!apiKey) {
          span.setStatus({ code: 2, message: "API key required" })
          return NextResponse.json({ error: "API key required" }, { status: 401 })
        }

        span.setAttribute("api_key.provided", true)

        const supabase = await createSupabaseServiceClient()

        // Verify API key
        const { data: project, error: projectError } = await supabase
          .from("merchant_projects")
          .select("id")
          .eq("api_key", apiKey)
          .eq("is_active", true)
          .single()

        if (projectError || !project) {
          span.setStatus({ code: 2, message: "Invalid API key" })
          Sentry.captureMessage("Invalid API key used", "warning", {
            extra: { api_key_hash: apiKey.substring(0, 8) + "..." },
          })
          return NextResponse.json({ error: "Invalid API key" }, { status: 401 })
        }

        span.setAttribute("project.id", project.id)

        const body = await request.json()
        const { validation_code } = body

        if (!validation_code) {
          span.setStatus({ code: 2, message: "Validation code required" })
          return NextResponse.json({ error: "Validation code required" }, { status: 400 })
        }

        span.setAttribute("validation_code.provided", true)

        // Find payment session by validation code
        const { data: session, error: sessionError } = await supabase
          .from("merchant_payment_sessions")
          .select(`
            *,
            merchant_payment_plans(*)
          `)
          .eq("validation_code", validation_code)
          .eq("project_id", project.id)
          .eq("status", "completed")
          .single()

        if (sessionError || !session) {
          span.setAttribute("validation.result", "invalid")
          span.setStatus({ code: 1, message: "Validation completed - invalid code" })

          return NextResponse.json({
            success: true,
            valid: false,
            message: "Invalid or not found validation code",
          })
        }

        span.setAttribute("validation.result", "valid")
        span.setAttribute("session.token", session.session_token)
        span.setStatus({ code: 1, message: "Validation completed - valid" })

        return NextResponse.json({
          success: true,
          valid: true,
          payment: {
            session_token: session.session_token,
            amount_friendcoins: session.amount_friendcoins,
            amount_friendship_fractions: session.amount_friendship_fractions,
            customer_email: session.customer_email,
            customer_name: session.customer_name,
            metadata: session.metadata,
            completed_at: session.completed_at,
            payment_plan: {
              external_id: session.merchant_payment_plans.external_id,
              name: session.merchant_payment_plans.name,
            },
          },
        })
      } catch (error) {
        span.setStatus({ code: 2, message: "Internal server error" })
        Sentry.captureException(error)
        console.error("[v0] Payment validation error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
      }
    },
  )
}
