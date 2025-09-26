import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseServiceClient } from "@/lib/supabase-server"
import { stackServerApp } from "@/stack"
import * as Sentry from "@sentry/nextjs"

export async function GET(request: NextRequest) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "GET /api/developer/products",
    },
    async (span) => {
      try {
        const user = await stackServerApp.getUser()
        if (!user) {
          span.setStatus({ code: 2, message: "Unauthorized" })
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        span.setAttribute("user.id", user.id)

        const supabase = await createSupabaseServiceClient()

        const { data: products, error } = await supabase
          .from("developer_products")
          .select("*")
          .eq("developer_id", user.id)
          .order("created_at", { ascending: false })

        if (error) {
          span.setStatus({ code: 2, message: error.message })
          Sentry.captureException(error, {
            tags: { operation: "fetch_developer_products" },
            user: { id: user.id },
          })
          console.error("[v0] Error fetching developer products:", error)
          return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
        }

        span.setAttribute("products.count", products?.length || 0)
        span.setStatus({ code: 1, message: "Success" })

        return NextResponse.json({ products: products || [] })
      } catch (error) {
        span.setStatus({ code: 2, message: "Internal server error" })
        Sentry.captureException(error)
        console.error("[v0] Developer products API error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
      }
    },
  )
}

export async function POST(request: NextRequest) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "POST /api/developer/products",
    },
    async (span) => {
      try {
        const user = await stackServerApp.getUser()
        if (!user) {
          span.setStatus({ code: 2, message: "Unauthorized" })
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        span.setAttribute("user.id", user.id)

        const body = await request.json()
        const { name, description, price_friendcoins, price_friendship_fractions, product_type, webhook_url } = body

        if (!name || !description || price_friendcoins === undefined || price_friendship_fractions === undefined) {
          span.setStatus({ code: 2, message: "Missing required fields" })
          return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        span.setAttribute("product.name", name)
        span.setAttribute("product.type", product_type || "one_time")
        span.setAttribute("product.price_fc", price_friendcoins)

        const supabase = await createSupabaseServiceClient()

        const { data: product, error: productError } = await supabase
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
          span.setStatus({ code: 2, message: productError.message })
          Sentry.captureException(productError, {
            tags: { operation: "create_developer_product" },
            user: { id: user.id },
            extra: { product_data: { name, product_type } },
          })
          console.error("[v0] Error creating product:", productError)
          return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
        }

        span.setAttribute("product.id", product.id)
        span.setStatus({ code: 1, message: "Success" })

        return NextResponse.json({
          success: true,
          product,
          message: "Product created successfully",
        })
      } catch (error) {
        span.setStatus({ code: 2, message: "Internal server error" })
        Sentry.captureException(error)
        console.error("[v0] Product creation error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
      }
    },
  )
}
