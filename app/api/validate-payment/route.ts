import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("authorization")?.replace("Bearer ", "")

    if (!apiKey) {
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
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 })
    }

    const body = await request.json()
    const { validation_token } = body

    if (!validation_token) {
      return NextResponse.json({ error: "Validation token required" }, { status: 400 })
    }

    // Find and validate the payment token
    const { data: paymentData, error: paymentError } = await supabase
      .from("payment_validations")
      .select("*")
      .eq("validation_token", validation_token)
      .single()

    if (paymentError || !paymentData) {
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
