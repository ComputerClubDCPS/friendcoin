import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const search = searchParams.get("search")

    let query = supabaseAdmin
      .from("developer_products")
      .select(`
        *,
        users!developer_products_developer_id_fkey(stack_user_id)
      `)
      .eq("is_active", true)

    if (category) {
      query = query.eq("product_type", category)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const { data: products, error } = await query.order("created_at", { ascending: false }).limit(50)

    if (error) {
      console.error("Error fetching marketplace products:", error)
      return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
    }

    return NextResponse.json({ products: products || [] })
  } catch (error) {
    console.error("Marketplace API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
