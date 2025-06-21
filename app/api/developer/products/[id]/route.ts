import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { stackServerApp } from "@/stack"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await stackServerApp.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, price_friendcoins, price_friendship_fractions, is_active, webhook_url } = body

    const { data: product, error } = await supabaseAdmin
      .from("developer_products")
      .update({
        name,
        description,
        price_friendcoins,
        price_friendship_fractions,
        is_active,
        webhook_url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .eq("developer_id", user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: "Failed to update product" }, { status: 500 })
    }

    return NextResponse.json({ success: true, product })
  } catch (error) {
    console.error("Product update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await stackServerApp.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { error } = await supabaseAdmin
      .from("developer_products")
      .delete()
      .eq("id", params.id)
      .eq("developer_id", user.id)

    if (error) {
      return NextResponse.json({ error: "Failed to delete product" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Product deleted successfully" })
  } catch (error) {
    console.error("Product deletion error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
