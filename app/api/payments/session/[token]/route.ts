import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  try {
    const { token } = params

    if (!token) {
      return NextResponse.json({ error: "Session token required" }, { status: 400 })
    }

    // Get payment session with related data
    const { data: session, error } = await supabaseAdmin
      .from("merchant_payment_sessions")
      .select(`
        *,
        merchant_payment_plans(
          name,
          description
        ),
        merchant_projects(
          name,
          description
        )
      `)
      .eq("session_token", token)
      .single()

    if (error || !session) {
      return NextResponse.json({ error: "Payment session not found" }, { status: 404 })
    }

    // Check if session has expired
    const now = new Date()
    const expiresAt = new Date(session.expires_at)

    if (now > expiresAt && session.status === "pending") {
      // Mark as expired
      await supabaseAdmin.from("merchant_payment_sessions").update({ status: "expired" }).eq("id", session.id)

      session.status = "expired"
    }

    return NextResponse.json({ session })
  } catch (error) {
    console.error("Payment session fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
