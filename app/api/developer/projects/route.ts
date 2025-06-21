import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id")

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    const { data: projects, error } = await supabaseAdmin
      .from("merchant_projects")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching projects:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    return NextResponse.json({ projects })
  } catch (error) {
    console.error("Projects fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, name, description, webhook_url, database_url, account_number } = body

    if (!user_id || !name || !account_number) {
      return NextResponse.json({ error: "User ID, project name, and account number are required" }, { status: 400 })
    }

    // Generate API key
    const apiKey = `fc_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`

    const { data: newProject, error } = await supabaseAdmin
      .from("merchant_projects")
      .insert({
        user_id,
        name: name.trim(),
        description: description?.trim() || "",
        api_key: apiKey,
        webhook_url: webhook_url?.trim() || null,
        database_url: database_url?.trim() || "",
        account_number: account_number.trim(),
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating project:", error)
      return NextResponse.json({ error: "Failed to create project" }, { status: 500 })
    }

    return NextResponse.json({ project: newProject })
  } catch (error) {
    console.error("Project creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
