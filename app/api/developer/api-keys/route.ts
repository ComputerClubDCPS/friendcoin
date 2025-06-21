import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("X-User-ID")

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 401 })
    }

    const { data: apiKeys, error } = await supabaseAdmin
      .from("api_keys")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching API keys:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    return NextResponse.json({ apiKeys })
  } catch (error) {
    console.error("API keys fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("X-User-ID")

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 401 })
    }

    const body = await request.json()
    const { name, webhook_url } = body

    if (!name) {
      return NextResponse.json({ error: "API key name required" }, { status: 400 })
    }

    // Generate API key
    const apiKey = `fc_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`

    const { data: newApiKey, error } = await supabaseAdmin
      .from("api_keys")
      .insert({
        user_id: userId,
        name: name.trim(),
        api_key: apiKey,
        webhook_url: webhook_url || null,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating API key:", error)
      return NextResponse.json({ error: "Failed to create API key" }, { status: 500 })
    }

    return NextResponse.json({ apiKey: newApiKey })
  } catch (error) {
    console.error("API key creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
