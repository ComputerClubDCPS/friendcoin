import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import * as Sentry from "@sentry/nextjs"

export async function GET(request: NextRequest) {
  return Sentry.withServerActionInstrumentation(
    "products-get",
    async () => {
      try {
        const { searchParams } = new URL(request.url)
        const category = searchParams.get("category")

        let query = supabaseAdmin
          .from("products")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false })

        if (category && category !== "all") {
          query = query.eq("category", category)
        }

        const { data: products, error } = await query

        if (error) {
          console.error("Error fetching products:", error)
          Sentry.captureException(error, {
            tags: { operation: "fetch_products" },
            extra: { category }
          })
          return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
        }

        return NextResponse.json({ products: products || [] })
      } catch (error) {
        console.error("Products API error:", error)
        Sentry.captureException(error, {
          tags: { operation: "products_get_error" },
          extra: { request_url: request.url }
        })
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
      }
    }
  )
}
