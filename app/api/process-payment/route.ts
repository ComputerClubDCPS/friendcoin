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
    const { amount_friendcoins, amount_friendship_fractions, payment_method } = body

    if (amount_friendcoins === undefined || amount_friendship_fractions === undefined || !payment_method) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Generate validation token
    const validationToken = `pv_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Create payment validation record
    const { data: paymentData, error: paymentError } = await supabase
      .from("payment_validations")
      .insert({
        user_id: keyData.user_id,
        validation_token: validationToken,
        amount_friendcoins: Number.parseInt(amount_friendcoins),
        amount_friendship_fractions: Number.parseInt(amount_friendship_fractions),
        payment_method,
        status: "completed",
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (paymentError) {
      return NextResponse.json({ error: "Failed to process payment" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      payment_successful: true,
      validation_token: validationToken,
      expires_at: expiresAt.toISOString(),
      amount: {
        friendcoins: amount_friendcoins,
        friendship_fractions: amount_friendship_fractions,
      },
    })
  } catch (error) {
    console.error("Payment processing API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
