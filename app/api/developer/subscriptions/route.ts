import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { stackServerApp } from "@/stack"

export async function GET(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: subscriptions, error } = await supabaseAdmin
      .from("developer_subscriptions")
      .select(`
        *,
        developer_products(name, description)
      `)
      .eq("developer_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching subscriptions:", error)
      return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 })
    }

    return NextResponse.json({ subscriptions: subscriptions || [] })
  } catch (error) {
    console.error("Subscriptions API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { product_id, billing_interval, trial_days } = body

    if (!product_id || !billing_interval) {
      return NextResponse.json({ error: "Product ID and billing interval required" }, { status: 400 })
    }

    // Verify product belongs to developer
    const { data: product, error: productError } = await supabaseAdmin
      .from("developer_products")
      .select("*")
      .eq("id", product_id)
      .eq("developer_id", user.id)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Create subscription plan
    const { data: subscription, error: subscriptionError } = await supabaseAdmin
      .from("developer_subscriptions")
      .insert({
        developer_id: user.id,
        product_id,
        billing_interval,
        trial_days: trial_days || 0,
        is_active: true,
      })
      .select()
      .single()

    if (subscriptionError) {
      console.error("Error creating subscription:", subscriptionError)
      return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      subscription,
      message: "Subscription plan created successfully",
    })
  } catch (error) {
    console.error("Subscription creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
