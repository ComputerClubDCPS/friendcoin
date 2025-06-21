import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { stackServerApp } from "@/stack"

export async function GET(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: products, error } = await supabaseAdmin
      .from("developer_products")
      .select("*")
      .eq("developer_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching developer products:", error)
      return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
    }

    return NextResponse.json({ products: products || [] })
  } catch (error) {
    console.error("Developer products API error:", error)
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
    const { name, description, price_friendcoins, price_friendship_fractions, product_type, webhook_url } = body

    if (!name || !description || price_friendcoins === undefined || price_friendship_fractions === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create product
    const { data: product, error: productError } = await supabaseAdmin
      .from("developer_products")
      .insert({
        developer_id: user.id,
        name,
        description,
        price_friendcoins,
        price_friendship_fractions,
        product_type: product_type || "one_time",
        webhook_url,
        is_active: true,
      })
      .select()
      .single()

    if (productError) {
      console.error("Error creating product:", productError)
      return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      product,
      message: "Product created successfully",
    })
  } catch (error) {
    console.error("Product creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
