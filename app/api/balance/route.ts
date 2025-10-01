import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { formatCurrency } from "@/lib/currency"
import * as Sentry from "@sentry/nextjs"

export async function GET(request: NextRequest) {
  return Sentry.withServerActionInstrumentation(
    "balance-get",
    async () => {
      try {
        const apiKey = request.headers.get("authorization")?.replace("Bearer ", "")

        if (!apiKey) {
          Sentry.captureMessage("Missing API key in balance request", "warning")
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
          Sentry.captureMessage("Invalid or inactive API key used", "warning", {
            extra: { api_key_prefix: apiKey.substring(0, 8) + "..." }
          })
          return NextResponse.json({ error: "Invalid API key" }, { status: 401 })
        }

        // Get user balance
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("balance_friendcoins, balance_friendship_fractions")
          .eq("stack_user_id", keyData.user_id)
          .single()

        if (userError || !userData) {
          Sentry.captureException(userError || new Error("User not found"), {
            tags: { operation: "get_balance", user_id: keyData.user_id }
          })
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
        Sentry.captureException(error, {
          tags: { operation: "get_balance" },
          extra: { request_url: request.url }
        })
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
      }
    }
  )
}
