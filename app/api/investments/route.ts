export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { stackServerApp } from "@/stack"
import * as Sentry from "@sentry/nextjs"

export async function GET(request: NextRequest) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "GET /api/investments",
    },
    async (span) => {
      try {
        const user = await stackServerApp.getUser()
        if (!user) {
          Sentry.captureMessage("Unauthorized investments fetch attempt", "warning")
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        span.setAttribute("user_id", user.id)

        // In a real system, we would have a user_investments table tracking what users own
        return NextResponse.json({ investments: [] })
      } catch (error) {
        Sentry.captureException(error, {
          tags: { operation: "investments_get_error" },
        })
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
      }
    },
  )
}

export async function POST(request: NextRequest) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "POST /api/investments",
    },
    async (span) => {
      try {
        const user = await stackServerApp.getUser()
        if (!user) {
          Sentry.captureMessage("Unauthorized investment creation attempt", "warning")
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        span.setAttribute("user_id", user.id)

        const { symbol, shares, pricePerShare } = await request.json()

        if (!symbol || !shares || !pricePerShare) {
          return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        span.setAttribute("symbol", symbol)
        span.setAttribute("shares", shares)

        // Calculate total cost in FriendCoins
        const totalCostUsd = shares * pricePerShare
        const totalCostFriendCoins = Math.floor(totalCostUsd * 1.2 * 100)

        // Get user's current balance
        const { data: userData, error: userError } = await supabaseAdmin
          .from("users")
          .select("balance_friendcoins, balance_friendship_fractions, stack_user_id")
          .eq("stack_user_id", user.id)
          .single()

        if (userError || !userData) {
          Sentry.captureException(userError, {
            tags: { operation: "investment_fetch_user_balance" },
            extra: { user_id: user.id },
          })
          return NextResponse.json({ error: "Error fetching user data" }, { status: 400 })
        }

        const currentBalanceFractions = userData.balance_friendcoins * 100 + userData.balance_friendship_fractions

        if (currentBalanceFractions < totalCostFriendCoins) {
          Sentry.captureMessage("Insufficient funds for investment", "info", {
            extra: {
              user_id: user.id,
              current_balance: currentBalanceFractions,
              required_amount: totalCostFriendCoins,
            },
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
          })
          return NextResponse.json({ error: "Error updating balance" }, { status: 500 })
        }

        span.setAttribute("investment_success", true)

        return NextResponse.json({ success: true, message: "Investment recorded" })
      } catch (error) {
        Sentry.captureException(error, {
          tags: { operation: "investment_creation_error" },
        })
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
      }
    },
  )
}
