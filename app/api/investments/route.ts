import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { stackServerApp } from "@/stack"
import * as Sentry from "@sentry/nextjs"

export async function GET(request: NextRequest) {
  return Sentry.withServerActionInstrumentation(
    "investments-get",
    async () => {
      try {
        const user = await stackServerApp.getUser()
        if (!user) {
          Sentry.captureMessage("Unauthorized investments fetch attempt", "warning")
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { data: investments, error } = await supabaseAdmin
          .from("investments")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        if (error) {
          console.error("Error fetching investments:", error)
          Sentry.captureException(error, {
            tags: { operation: "fetch_investments" },
            extra: { user_id: user.id }
          })
          return NextResponse.json({ error: "Failed to fetch investments" }, { status: 500 })
        }

        return NextResponse.json({ investments: investments || [] })
      } catch (error) {
        console.error("Investments API error:", error)
        Sentry.captureException(error, {
          tags: { operation: "investments_get_error" },
          extra: { request_url: request.url }
        })
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
      }
    }
  )
}

export async function POST(request: NextRequest) {
  return Sentry.withServerActionInstrumentation(
    "investments-post",
    async () => {
      try {
        const user = await stackServerApp.getUser()
        if (!user) {
          Sentry.captureMessage("Unauthorized investment creation attempt", "warning")
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { symbol, shares, pricePerShare } = await request.json()

        if (!symbol || !shares || !pricePerShare) {
          Sentry.captureMessage("Investment request missing required fields", "warning", {
            extra: { 
              user_id: user.id,
              has_symbol: !!symbol,
              has_shares: !!shares,
              has_pricePerShare: !!pricePerShare
            }
          })
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
          Sentry.captureException(userError, {
            tags: { operation: "investment_fetch_user_balance" },
            extra: { user_id: user.id }
          })
          return NextResponse.json({ error: "Error fetching user data" }, { status: 400 })
        }

        const currentBalanceFractions = userData.balance_friendcoins * 100 + userData.balance_friendship_fractions

        if (currentBalanceFractions < totalCostFriendCoins) {
          Sentry.captureMessage("Insufficient funds for investment", "info", {
            extra: { 
              user_id: user.id,
              current_balance: currentBalanceFractions,
              required_amount: totalCostFriendCoins
            }
          })
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
          Sentry.captureException(updateError, {
            tags: { operation: "investment_update_balance" },
            extra: { user_id: user.id, new_balance: { friendcoins: newFriendCoins, fractions: newFriendshipFractions } }
          })
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
          Sentry.captureException(investmentError, {
            tags: { operation: "investment_record" },
            extra: { user_id: user.id, symbol }
          })
          return NextResponse.json({ error: "Error recording investment" }, { status: 500 })
        }

        return NextResponse.json({ investment, success: true })
      } catch (error) {
        console.error("Investment creation error:", error)
        Sentry.captureException(error, {
          tags: { operation: "investment_creation_error" },
          extra: { request_url: request.url }
        })
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
      }
    }
  )
}
