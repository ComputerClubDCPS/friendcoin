import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id")

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    const { data: restrictions, error } = await supabaseAdmin
      .from("account_restrictions")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching restrictions:", error)
      return NextResponse.json({ error: "Failed to fetch restrictions" }, { status: 500 })
    }

    return NextResponse.json({ restrictions: restrictions || [] })
  } catch (error) {
    console.error("Restrictions API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
