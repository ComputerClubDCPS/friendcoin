import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("authorization")?.replace("Bearer ", "")

    if (!apiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 401 })
    }

    // Verify API key
    const { data: project, error: projectError } = await supabaseAdmin
      .from("merchant_projects")
      .select("id")
      .eq("api_key", apiKey)
      .eq("is_active", true)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 })
    }

    const body = await request.json()
    const { validation_code } = body

    if (!validation_code) {
      return NextResponse.json({ error: "Validation code required" }, { status: 400 })
    }

    // Find payment session by validation code
    const { data: session, error: sessionError } = await supabaseAdmin
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
      return NextResponse.json({
        success: true,
        valid: false,
        message: "Invalid or not found validation code",
      })
    }

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
    console.error("Payment validation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
