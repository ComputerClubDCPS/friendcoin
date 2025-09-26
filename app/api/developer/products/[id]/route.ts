import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseServiceClient } from "@/lib/supabase-server"
import { stackServerApp } from "@/stack"
import * as Sentry from "@sentry/nextjs"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "PUT /api/developer/products/[id]",
    },
    async (span) => {
      try {
        const user = await stackServerApp.getUser()
        if (!user) {
          span.setStatus({ code: 2, message: "Unauthorized" })
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        span.setAttribute("user.id", user.id)
        span.setAttribute("product.id", params.id)

        const body = await request.json()
        const { name, description, price_friendcoins, price_friendship_fractions, is_active, webhook_url } = body

        const supabase = await createSupabaseServiceClient()

        const { data: product, error } = await supabase
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
          span.setStatus({ code: 2, message: error.message })
          Sentry.captureException(error, {
            tags: { operation: "update_developer_product" },
            user: { id: user.id },
            extra: { product_id: params.id },
          })
          console.error("[v0] Product update error:", error)
          return NextResponse.json({ error: "Failed to update product" }, { status: 500 })
        }

        span.setStatus({ code: 1, message: "Success" })
        return NextResponse.json({ success: true, product })
      } catch (error) {
        span.setStatus({ code: 2, message: "Internal server error" })
        Sentry.captureException(error)
        console.error("[v0] Product update error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
      }
    },
  )
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "DELETE /api/developer/products/[id]",
    },
    async (span) => {
      try {
        const user = await stackServerApp.getUser()
        if (!user) {
          span.setStatus({ code: 2, message: "Unauthorized" })
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        span.setAttribute("user.id", user.id)
        span.setAttribute("product.id", params.id)

        const supabase = await createSupabaseServiceClient()

        const { error } = await supabase
          .from("developer_products")
          .delete()
          .eq("id", params.id)
          .eq("developer_id", user.id)

        if (error) {
          span.setStatus({ code: 2, message: error.message })
          Sentry.captureException(error, {
            tags: { operation: "delete_developer_product" },
            user: { id: user.id },
            extra: { product_id: params.id },
          })
          console.error("[v0] Product deletion error:", error)
          return NextResponse.json({ error: "Failed to delete product" }, { status: 500 })
        }

        span.setStatus({ code: 1, message: "Success" })
        return NextResponse.json({ success: true, message: "Product deleted successfully" })
      } catch (error) {
        span.setStatus({ code: 2, message: "Internal server error" })
        Sentry.captureException(error)
        console.error("[v0] Product deletion error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
      }
    },
  )
}
