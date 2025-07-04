import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { formatCurrency, addCurrency, type CurrencyAmount } from "@/lib/currency"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, code } = body

    if (!user_id || !code) {
      return NextResponse.json({ error: "User ID and coupon code required" }, { status: 400 })
    }

    // Find the coupon
    const { data: couponData, error: couponError } = await supabaseAdmin
      .from("coupons")
      .select("*")
      .eq("code", code.toUpperCase())
      .eq("is_redeemed", false)
      .single()

    if (couponError || !couponData) {
      return NextResponse.json({ error: "Coupon not found or already redeemed" }, { status: 404 })
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

    const couponAmount: CurrencyAmount = {
      friendcoins: couponData.amount_friendcoins,
      friendshipFractions: couponData.amount_friendship_fractions,
    }

    const userBalance: CurrencyAmount = {
      friendcoins: userData.balance_friendcoins,
      friendshipFractions: userData.balance_friendship_fractions,
    }

    // Add amount to user's balance
    const newBalance = addCurrency(userBalance, couponAmount)

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

    // Mark coupon as redeemed
    const { error: redeemError } = await supabaseAdmin
      .from("coupons")
      .update({
        is_redeemed: true,
        redeemed_by: user_id,
        redeemed_at: new Date().toISOString(),
      })
      .eq("code", code.toUpperCase())

    if (redeemError) {
      return NextResponse.json({ error: "Error marking coupon as redeemed" }, { status: 500 })
    }

    // Record transaction
    const { error: transactionError } = await supabaseAdmin.from("transactions").insert({
      from_user_id: couponData.created_by,
      to_user_id: user_id,
      amount_friendcoins: couponAmount.friendcoins,
      amount_friendship_fractions: couponAmount.friendshipFractions,
      tax_amount: 0,
      transaction_type: "coupon_redeem",
      status: "completed",
    })

    if (transactionError) {
      console.error("Error recording transaction:", transactionError)
    }

    return NextResponse.json({
      success: true,
      amount: formatCurrency(couponAmount),
      coupon_amount: couponAmount,
    })
  } catch (error) {
    console.error("Coupon redemption error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
