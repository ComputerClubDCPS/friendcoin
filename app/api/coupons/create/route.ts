import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { formatCurrency, parseCurrency, subtractCurrency, type CurrencyAmount } from "@/lib/currency"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, amount } = body

    if (!user_id || !amount) {
      return NextResponse.json({ error: "User ID and amount required" }, { status: 400 })
    }

    // Parse the amount
    let couponAmount: CurrencyAmount
    try {
      couponAmount = parseCurrency(amount)
    } catch {
      return NextResponse.json({ error: "Invalid amount format" }, { status: 400 })
    }

    // Get user's current balance
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("stack_user_id", user_id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userBalance: CurrencyAmount = {
      friendcoins: userData.balance_friendcoins,
      friendshipFractions: userData.balance_friendship_fractions,
    }

    // Check if user has sufficient funds
    try {
      subtractCurrency(userBalance, couponAmount)
    } catch {
      return NextResponse.json({ error: "Insufficient funds to create this coupon" }, { status: 400 })
    }

    // Generate coupon code
    const couponCode = Math.random().toString(36).substring(2, 9).toUpperCase()

    // Deduct amount from user's balance
    const newBalance = subtractCurrency(userBalance, couponAmount)

    // Update user balance
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        balance_friendcoins: newBalance.friendcoins,
        balance_friendship_fractions: newBalance.friendshipFractions,
        updated_at: new Date().toISOString(),
      })
      .eq("stack_user_id", user_id)

    if (updateError) {
      return NextResponse.json({ error: "Error updating your balance" }, { status: 500 })
    }

    // Create coupon record
    const { data: coupon, error: couponError } = await supabaseAdmin
      .from("coupons")
      .insert({
        code: couponCode,
        amount_friendcoins: couponAmount.friendcoins,
        amount_friendship_fractions: couponAmount.friendshipFractions,
        created_by: user_id,
        is_redeemed: false,
      })
      .select()
      .single()

    if (couponError) {
      return NextResponse.json({ error: "Error creating coupon" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      coupon: {
        code: couponCode,
        formatted_amount: formatCurrency(couponAmount),
        amount_friendcoins: couponAmount.friendcoins,
        amount_friendship_fractions: couponAmount.friendshipFractions,
      },
    })
  } catch (error) {
    console.error("Coupon creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
