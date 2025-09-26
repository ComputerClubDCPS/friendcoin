import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import * as Sentry from "@sentry/nextjs"

export async function POST(request: NextRequest) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "POST /api/user/initialize",
    },
    async (span) => {
      try {
        const body = await request.json()
        const { stack_user_id, display_name, email } = body

        span.setAttribute("stack_user_id", stack_user_id)
        span.setAttribute("has_display_name", !!display_name)
        span.setAttribute("has_email", !!email)

        console.log("[v0] Initializing user:", { stack_user_id, display_name, email })

        if (!stack_user_id) {
          return NextResponse.json({ error: "Stack user ID required" }, { status: 400 })
        }

        const { data: userData, error: initError } = await supabaseAdmin.rpc("initialize_user", {
          p_stack_user_id: stack_user_id,
        })

        console.log("[v0] User initialization result:", { userData, initError })

        if (initError) {
          console.error("[v0] Error initializing user:", initError)
          Sentry.captureException(initError, {
            tags: { operation: "user_initialization" },
            extra: { stack_user_id },
          })
          return NextResponse.json({ error: "Database error during user initialization" }, { status: 500 })
        }

        // The RPC function returns an array, get the first (and only) result
        const user = userData?.[0]

        if (!user) {
          console.error("[v0] No user data returned from initialization")
          return NextResponse.json({ error: "Failed to initialize user" }, { status: 500 })
        }

        console.log("[v0] Successfully initialized user:", user.id)
        span.setAttribute("user_id", user.id)
        span.setAttribute("user_created", !userData || userData.length === 0)

        return NextResponse.json({ user })
      } catch (error) {
        console.error("[v0] User initialization error:", error)
        Sentry.captureException(error, {
          tags: { operation: "user_initialization" },
          level: "error",
        })
        return NextResponse.json(
          {
            error: "Internal server error",
            details: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 500 },
        )
      }
    },
  )
}
