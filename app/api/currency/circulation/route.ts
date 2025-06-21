import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET() {
  try {
    const { data: circulation, error } = await supabaseAdmin.from("currency_circulation").select("*").single()

    if (error) {
      console.error("Error fetching circulation:", error)
      return NextResponse.json({ error: "Failed to fetch circulation data" }, { status: 500 })
    }

    // Get total registered users
    const { count: userCount, error: userError } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true })

    if (userError) {
      console.error("Error counting users:", userError)
      return NextResponse.json({ error: "Failed to count users" }, { status: 500 })
    }

    const maxAllowedCoins = circulation.total_base_coins + (userCount || 0) * 10

    return NextResponse.json({
      circulation: {
        ...circulation,
        total_users: userCount || 0,
        max_allowed_coins: maxAllowedCoins,
        remaining_capacity: maxAllowedCoins - circulation.total_coins_in_circulation,
      },
    })
  } catch (error) {
    console.error("Circulation API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount_change, reason } = body

    if (!amount_change || !reason) {
      return NextResponse.json({ error: "Amount change and reason required" }, { status: 400 })
    }

    // Get current circulation
    const { data: circulation, error: fetchError } = await supabaseAdmin
      .from("currency_circulation")
      .select("*")
      .single()

    if (fetchError) {
      return NextResponse.json({ error: "Failed to fetch circulation data" }, { status: 500 })
    }

    // Get user count for limit calculation
    const { count: userCount, error: userError } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true })

    if (userError) {
      return NextResponse.json({ error: "Failed to count users" }, { status: 500 })
    }

    const maxAllowedCoins = circulation.total_base_coins + (userCount || 0) * 10
    const newCirculation = circulation.total_coins_in_circulation + amount_change

    // Check hard limit
    if (newCirculation > maxAllowedCoins) {
      return NextResponse.json(
        {
          error: "Currency limit exceeded",
          current: circulation.total_coins_in_circulation,
          requested: newCirculation,
          limit: maxAllowedCoins,
        },
        { status: 400 },
      )
    }

    if (newCirculation < 0) {
      return NextResponse.json({ error: "Cannot have negative currency in circulation" }, { status: 400 })
    }

    // Update circulation
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("currency_circulation")
      .update({
        total_coins_in_circulation: newCirculation,
        last_updated: new Date().toISOString(),
      })
      .eq("id", circulation.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: "Failed to update circulation" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      circulation: {
        ...updated,
        total_users: userCount || 0,
        max_allowed_coins: maxAllowedCoins,
        remaining_capacity: maxAllowedCoins - newCirculation,
      },
      reason,
    })
  } catch (error) {
    console.error("Circulation update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
