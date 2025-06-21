import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { formatCurrency } from "@/lib/currency"

export async function GET(request: NextRequest) {
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

    // Get user balance
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("balance_friendcoins, balance_friendship_fractions")
      .eq("stack_user_id", keyData.user_id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const balance = {
      friendcoins: userData.balance_friendcoins,
      friendshipFractions: userData.balance_friendship_fractions,
    }

    return NextResponse.json({
      success: true,
      data: {
        friendcoins: balance.friendcoins,
        friendship_fractions: balance.friendshipFractions,
        formatted: formatCurrency(balance),
      },
    })
  } catch (error) {
    console.error("Balance API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
