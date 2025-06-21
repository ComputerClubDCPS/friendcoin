import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { stackServerApp } from "@/stack"

export async function GET(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: investments, error } = await supabaseAdmin
      .from("investments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching investments:", error)
      return NextResponse.json({ error: "Failed to fetch investments" }, { status: 500 })
    }

    return NextResponse.json({ investments: investments || [] })
  } catch (error) {
    console.error("Investments API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { symbol, shares, pricePerShare } = await request.json()

    if (!symbol || !shares || !pricePerShare) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Calculate total cost in FriendCoins
    const totalCostUsd = shares * pricePerShare
    const totalCostFriendCoins = Math.floor(totalCostUsd * 1.2 * 100) // Convert to friendship fractions

    // Get user's current balance
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("balance_friendcoins, balance_friendship_fractions")
      .eq("stack_user_id", user.id)
      .single()

    if (userError) {
      return NextResponse.json({ error: "Error fetching user data" }, { status: 400 })
    }

    const currentBalanceFractions = userData.balance_friendcoins * 100 + userData.balance_friendship_fractions

    if (currentBalanceFractions < totalCostFriendCoins) {
      return NextResponse.json({ error: "Insufficient funds" }, { status: 400 })
    }

    // Deduct from balance
    const newBalanceFractions = currentBalanceFractions - totalCostFriendCoins
    const newFriendCoins = Math.floor(newBalanceFractions / 100)
    const newFriendshipFractions = newBalanceFractions % 100

    // Update user balance
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        balance_friendcoins: newFriendCoins,
        balance_friendship_fractions: newFriendshipFractions,
        updated_at: new Date().toISOString(),
      })
      .eq("stack_user_id", user.id)

    if (updateError) {
      return NextResponse.json({ error: "Error updating balance" }, { status: 500 })
    }

    // Record the investment
    const { data: investment, error: investmentError } = await supabaseAdmin
      .from("investments")
      .insert({
        user_id: user.id,
        symbol,
        shares: Number.parseFloat(shares),
        purchase_price: Number.parseFloat(pricePerShare),
        total_cost_friendcoins: Math.floor(totalCostFriendCoins / 100),
        total_cost_friendship_fractions: totalCostFriendCoins % 100,
      })
      .select()
      .single()

    if (investmentError) {
      console.error("Error recording investment:", investmentError)
      return NextResponse.json({ error: "Error recording investment" }, { status: 500 })
    }

    return NextResponse.json({ investment, success: true })
  } catch (error) {
    console.error("Investment creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
