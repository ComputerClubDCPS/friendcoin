import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id")
    const projectId = searchParams.get("project_id")

    if (!userId || !projectId) {
      return NextResponse.json({ error: "User ID and project ID required" }, { status: 400 })
    }

    // Verify project belongs to user
    const { data: project, error: projectError } = await supabaseAdmin
      .from("merchant_projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", userId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const { data: paymentPlans, error } = await supabaseAdmin
      .from("merchant_payment_plans")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching payment plans:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    return NextResponse.json({ paymentPlans })
  } catch (error) {
    console.error("Payment plans fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, project_id, external_id, name, description, amount_friendcoins, amount_friendship_fractions } =
      body

    if (
      !user_id ||
      !project_id ||
      !external_id ||
      !name ||
      amount_friendcoins === undefined ||
      amount_friendship_fractions === undefined
    ) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify project belongs to user
    const { data: project, error: projectError } = await supabaseAdmin
      .from("merchant_projects")
      .select("id, database_url")
      .eq("id", project_id)
      .eq("user_id", user_id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const { data: newPaymentPlan, error } = await supabaseAdmin
      .from("merchant_payment_plans")
      .insert({
        project_id,
        external_id,
        name,
        description: description || "",
        amount_friendcoins: Number.parseInt(amount_friendcoins),
        amount_friendship_fractions: Number.parseInt(amount_friendship_fractions),
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Payment plan with this external ID already exists" }, { status: 409 })
      }
      console.error("Error creating payment plan:", error)
      return NextResponse.json({ error: "Failed to create payment plan" }, { status: 500 })
    }

    // TODO: Sync to merchant's database if database_url is provided
    // This would involve connecting to their database and creating/updating the payment plan

    return NextResponse.json({ paymentPlan: newPaymentPlan })
  } catch (error) {
    console.error("Payment plan creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
