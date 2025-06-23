// In the Next.js API Route (/api/investments/withdraw):
import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { stackServerApp } from "@/stack"

export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { investment_id, shares_to_sell } = body

    if (!investment_id || !shares_to_sell || isNaN(shares_to_sell) || shares_to_sell <= 0) { // Check if shares_to_sell is a number
      return NextResponse.json({ error: "Investment ID and valid shares amount required" }, { status: 400 })
    }

    // Get investment details
    const { data: investment, error: investmentError } = await supabaseAdmin
      .from("investments")
      .select("*")
      .eq("id", investment_id)
      .eq("user_id", user.id)
      .single()

    if (investmentError || !investment) {
      return NextResponse.json({ error: "Investment not found" }, { status: 404 })
    }

    if (investment.shares_owned < shares_to_sell) {
      return NextResponse.json({ error: "Insufficient shares to sell" }, { status: 400 })
    }

    // Get current stock price (simulate with some variation)
    const currentPrice = investment.current_value_usd / investment.shares_owned
    const saleValueUsd = shares_to_sell * currentPrice

    // Convert USD to FriendCoins (1 USD = 1.2 FriendCoins)
    const saleValueFriendCoins = saleValueUsd * 1.2
    const friendcoins = Math.floor(saleValueFriendCoins)
    const friendshipFractions = Math.round((saleValueFriendCoins % 1) * 100)

    // Update investment
    const remainingShares = investment.shares_owned - shares_to_sell
    const remainingValue = remainingShares * currentPrice

    if (remainingShares > 0) {
      // Update investment with remaining shares
      const { error: updateError } = await supabaseAdmin
        .from("investments")
        .update({
          shares_owned: remainingShares,
          current_value_usd: remainingValue,
          last_updated: new Date().toISOString(),
        })
        .eq("id", investment_id)

      if (updateError) {
        return NextResponse.json({ error: "Failed to update investment" }, { status: 500 })
      }
    } else {
      // Delete investment if all shares sold
      const { error: deleteError } = await supabaseAdmin.from("investments").delete().eq("id", investment_id)

      if (deleteError) {
        return NextResponse.json({ error: "Failed to delete investment" }, { status: 500 })
      }
    }

    // Add proceeds to user balance
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("stack_user_id", user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const newFractions = userData.balance_friendship_fractions + friendshipFractions
    const newFriendcoins = userData.balance_friendcoins + friendcoins + Math.floor(newFractions / 100)
    const finalFractions = newFractions % 100

    const { error: balanceError } = await supabaseAdmin
      .from("users")
      .update({
        balance_friendcoins: newFriendcoins,
        balance_friendship_fractions: finalFractions,
        updated_at: new Date().toISOString(),
      })
      .eq("stack_user_id", user.id)

    if (balanceError) {
      return NextResponse.json({ error: "Failed to update balance" }, { status: 500 })
    }

    // Record transaction
    const { error: transactionError } = await supabaseAdmin.from("transactions").insert({
      from_user_id: "market",
      to_user_id: user.id,
      amount_friendcoins: friendcoins,
      amount_friendship_fractions: friendshipFractions,
      tax_amount: 0,
      transaction_type: "stock_sale",
      status: "completed",
      external_reference: investment_id,
    })

    if (transactionError) {
      console.error("Error recording transaction:", transactionError)
    }

    return NextResponse.json({
      success: true,
      shares_sold: shares_to_sell,
      sale_value: `${friendcoins}.${friendshipFractions.padStart(2, "0")}f€`,
      remaining_shares: remainingShares,
      message: `Successfully sold ${shares_to_sell} shares of ${investment.stock_symbol}`,
    })
  } catch (error) {
    console.error("Investment withdrawal error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
