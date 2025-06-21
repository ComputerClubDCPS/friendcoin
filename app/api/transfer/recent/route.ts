import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { stackServerApp } from "@/stack"

export async function GET(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: recentTransfers, error } = await supabaseAdmin
      .from("recent_transfers")
      .select("*")
      .eq("from_user_id", user.id)
      .order("last_transfer_at", { ascending: false })
      .limit(10)

    if (error) {
      console.error("Error fetching recent transfers:", error)
      return NextResponse.json({ error: "Failed to fetch recent transfers" }, { status: 500 })
    }

    return NextResponse.json({ recentTransfers })
  } catch (error) {
    console.error("Recent transfers error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
