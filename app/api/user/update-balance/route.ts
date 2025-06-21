import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, balance_friendcoins, balance_friendship_fractions } = body

    if (!user_id || balance_friendcoins === undefined || balance_friendship_fractions === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const { data: updatedUser, error } = await supabaseAdmin
      .from("users")
      .update({
        balance_friendcoins,
        balance_friendship_fractions,
        updated_at: new Date().toISOString(),
      })
      .eq("stack_user_id", user_id)
      .select()
      .single()

    if (error) {
      console.error("Error updating user balance:", error)
      return NextResponse.json({ error: "Failed to update balance" }, { status: 500 })
    }

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error("Balance update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
